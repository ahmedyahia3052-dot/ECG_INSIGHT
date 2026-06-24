import bcrypt from "bcryptjs";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  activateUserPlan,
  assertCanRunAnalysis,
  ensureDefaultPlans,
  grantLifetimeLicense,
  initiatePayment,
  quotaSnapshot,
  recordAnalysisUsage,
} from "../server/src/subscriptions/monetization.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function createUser(email: string, role: Role = "DOCTOR") {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: "MT",
      email,
      emailVerified: true,
      isActive: true,
      name: "Monetization Test",
      passwordHash,
      role,
      subscription: { create: { status: "ACTIVE", tier: "FREE" } },
    },
    update: { isActive: true, role },
    where: { email },
  });
}

async function cleanup(userId: string) {
  await prisma.billingEvent.deleteMany({ where: { userId } });
  await prisma.usageRecord.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
  await prisma.license.deleteMany({ where: { userId } });
  await prisma.userSubscription.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
}

async function main() {
  await ensureDefaultPlans();
  const plans = await prisma.subscriptionPlan.findMany();
  assert(plans.length >= 6, "Default subscription plans were not created.");

  const freeUser = await createUser(`quota-${Date.now()}@ecginsight.test`);
  await cleanup(freeUser.id);
  await prisma.subscription.upsert({
    create: { status: "ACTIVE", tier: "FREE", userId: freeUser.id },
    update: { status: "ACTIVE", tier: "FREE" },
    where: { userId: freeUser.id },
  });

  for (let index = 0; index < 5; index += 1) {
    await assertCanRunAnalysis(freeUser.id);
    await recordAnalysisUsage(freeUser.id, { test: true });
  }
  const exhausted = await quotaSnapshot(freeUser.id);
  assert(exhausted.remaining === 0, "Free quota should be exhausted after 5 analyses.");
  await assertCanRunAnalysis(freeUser.id)
    .then(() => {
      throw new Error("Quota exhaustion did not block analysis.");
    })
    .catch((error) => {
      assert(error instanceof Error && error.message.includes("quota exhausted"), "Quota exhaustion error missing.");
    });

  await activateUserPlan(freeUser.id, "BASIC");
  const basic = await quotaSnapshot(freeUser.id);
  assert(basic.quota === 100, "Basic plan should expose 100 monthly analyses.");

  const owner = await createUser(`owner-${Date.now()}@ecginsight.test`, "OWNER");
  await grantLifetimeLicense(freeUser.id, owner.id, "Integration test lifetime grant");
  const lifetime = await quotaSnapshot(freeUser.id);
  assert(lifetime.isUnlimited, "Lifetime license should make usage unlimited.");

  const paymentResult = await initiatePayment(freeUser.id, "PROFESSIONAL", "INSTAPAY");
  assert(paymentResult.payment.status === "PENDING", "Manual payment should start pending.");
  assert(paymentResult.initiation.providerPayload["instructions"], "Manual payment instructions missing.");

  await cleanup(freeUser.id);
  await cleanup(owner.id);
  await prisma.user.deleteMany({ where: { email: { in: [freeUser.email, owner.email] } } });
  console.log("Monetization integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
