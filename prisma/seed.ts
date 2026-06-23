import { PrismaClient, type Role, type SubscriptionTier } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString:
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@localhost:5432/ecg_insight",
});
const prisma = new PrismaClient({ adapter });

const users: Array<{
  email: string;
  name: string;
  role: Role;
  tier: SubscriptionTier;
  avatarInitials: string;
  specialization?: string;
  institution?: string;
}> = [
  {
    avatarInitials: "SA",
    email: "super@ecginsight.com",
    institution: "ECG Insight Dev",
    name: "Dev Super Admin",
    role: "SUPER_ADMIN",
    tier: "ENTERPRISE",
  },
  {
    avatarInitials: "AU",
    email: "admin@ecginsight.com",
    institution: "ECG Insight HQ",
    name: "Admin User",
    role: "ADMIN",
    tier: "ENTERPRISE",
  },
  {
    avatarInitials: "SC",
    email: "doctor@ecginsight.com",
    institution: "Metro General Hospital",
    name: "Dr. Sarah Chen",
    role: "DOCTOR",
    specialization: "Cardiology",
    tier: "PROFESSIONAL",
  },
  {
    avatarInitials: "JO",
    email: "student@ecginsight.com",
    institution: "State Medical University",
    name: "James Okafor",
    role: "STUDENT",
    specialization: "Medical Student (Year 3)",
    tier: "FREE",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("password", 12);

  for (const user of users) {
    await prisma.user.upsert({
      create: {
        avatarInitials: user.avatarInitials,
        email: user.email,
        emailVerified: true,
        institution: user.institution,
        isActive: true,
        name: user.name,
        passwordHash,
        role: user.role,
        specialization: user.specialization,
        subscription: {
          create: {
            status: "ACTIVE",
            tier: user.tier,
          },
        },
      },
      update: {
        avatarInitials: user.avatarInitials,
        emailVerified: true,
        institution: user.institution,
        isActive: true,
        name: user.name,
        role: user.role,
        specialization: user.specialization,
        subscription: {
          upsert: {
            create: {
              status: "ACTIVE",
              tier: user.tier,
            },
            update: {
              status: "ACTIVE",
              tier: user.tier,
            },
          },
        },
      },
      where: { email: user.email },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
