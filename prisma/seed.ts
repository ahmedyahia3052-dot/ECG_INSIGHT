import { PrismaClient, type KnowledgeCategoryName, type Role, type SubscriptionTier } from "@prisma/client";
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
    avatarInitials: "OW",
    email: "owner@ecginsight.com",
    institution: "ECG Insight Owner",
    name: "ECG Insight Owner",
    role: "OWNER",
    tier: "ENTERPRISE",
  },
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

const demoOrganizations = ["Khalda Petroleum", "Petrojet", "ENPPI"] as const;
const knowledgeCategories: Array<{ name: KnowledgeCategoryName; title: string }> = [
  { name: "HYPERTENSION", title: "Hypertension" },
  { name: "ISCHEMIC_HEART_DISEASE", title: "Ischemic Heart Disease" },
  { name: "HEART_FAILURE", title: "Heart Failure" },
  { name: "ARRHYTHMIAS", title: "Arrhythmias" },
  { name: "VALVULAR_DISEASE", title: "Valvular Disease" },
  { name: "CONGENITAL_DISEASE", title: "Congenital Disease" },
  { name: "CABG", title: "CABG" },
  { name: "PCI", title: "PCI" },
  { name: "PACEMAKERS", title: "Pacemakers" },
  { name: "ICD", title: "ICD" },
  { name: "ANTICOAGULATION", title: "Anticoagulation" },
  { name: "OCCUPATIONAL_FITNESS", title: "Occupational Fitness" },
];

async function main() {
  const passwordHash = await bcrypt.hash("password", 12);

  await Promise.all([
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: 5, billingCycle: "DAILY", code: "FREE", description: "5 ECG analyses every 24 hours.", name: "Free", priceCents: 0, quotaWindowHours: 24 },
      update: {},
      where: { code: "FREE" },
    }),
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: 100, code: "BASIC", description: "100 ECG analyses per month.", name: "Basic", priceCents: 1900, quotaWindowHours: 720 },
      update: {},
      where: { code: "BASIC" },
    }),
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: 500, code: "PROFESSIONAL", description: "500 ECG analyses per month.", name: "Professional", priceCents: 4900, quotaWindowHours: 720 },
      update: {},
      where: { code: "PROFESSIONAL" },
    }),
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: null, code: "UNLIMITED", description: "Unlimited ECG analyses.", name: "Unlimited", priceCents: 9900, quotaWindowHours: 720 },
      update: {},
      where: { code: "UNLIMITED" },
    }),
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: null, billingCycle: "LIFETIME", code: "LIFETIME", description: "Owner-granted permanent unlimited access.", name: "Lifetime", priceCents: 0, quotaWindowHours: null },
      update: {},
      where: { code: "LIFETIME" },
    }),
    prisma.subscriptionPlan.upsert({
      create: { analysisQuota: null, code: "ENTERPRISE", description: "Unlimited analyses with team management.", multiUser: true, name: "Enterprise", priceCents: 19900, quotaWindowHours: 720, teamManagement: true },
      update: {},
      where: { code: "ENTERPRISE" },
    }),
  ]);

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

  for (const name of demoOrganizations) {
    const existing = await prisma.organization.findFirst({ where: { name } });
    if (existing) {
      await prisma.organization.update({
        data: { status: "ACTIVE", type: "COMPANY" },
        where: { id: existing.id },
      });
      continue;
    }

    await prisma.organization.create({
      data: {
        name,
        status: "ACTIVE",
        type: "COMPANY",
      },
    });
  }

  const khalda = await prisma.organization.findFirst({ where: { name: "Khalda Petroleum" } });
  const doctor = await prisma.user.findUnique({ where: { email: "doctor@ecginsight.com" } });
  if (khalda && doctor) {
    const department = await prisma.department.upsert({
      create: { name: "Operations", organizationId: khalda.id },
      update: {},
      where: { organizationId_name: { name: "Operations", organizationId: khalda.id } },
    });
    const contractorCompany = await prisma.contractorCompany.upsert({
      create: { name: "Petrojet Field Services", organizationId: khalda.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
      where: { organizationId_name: { name: "Petrojet Field Services", organizationId: khalda.id } },
    });
    const employee = await prisma.employee.upsert({
      create: {
        confinedSpace: true,
        contractorCompanyId: contractorCompany.id,
        criticalJob: true,
        dateOfBirth: new Date("1980-04-12"),
        departmentId: department.id,
        drivingDuty: true,
        employeeId: "KLD-1001",
        fullName: "Mahmoud Hassan",
        gender: "MALE",
        heavyEquipmentOperator: true,
        hiringDate: new Date("2010-05-01"),
        jobTitle: "Rig Supervisor",
        medicalFitnessStatus: "FIT_WITH_RESTRICTIONS",
        nationalId: "EGY-OCC-1001",
        offshoreWorker: true,
        organizationId: khalda.id,
        phone: "+201000000001",
        shiftWorker: true,
        workAtHeight: true,
        workCategory: "SAFETY_CRITICAL",
      },
      update: {
        contractorCompanyId: contractorCompany.id,
        criticalJob: true,
        departmentId: department.id,
        medicalFitnessStatus: "FIT_WITH_RESTRICTIONS",
        organizationId: khalda.id,
      },
      where: { nationalId: "EGY-OCC-1001" },
    });
    const patient = await prisma.patient.upsert({
      create: {
        contractorCompanyId: contractorCompany.id,
        dateOfBirth: employee.dateOfBirth,
        departmentId: department.id,
        employeeId: employee.employeeId,
        employeeProfileId: employee.id,
        firstName: "Mahmoud",
        gender: "MALE",
        lastName: "Hassan",
        medicalRecordNumber: "EMP-KLD-1001",
        nationalId: employee.nationalId,
        organizationId: khalda.id,
        phone: employee.phone,
      },
      update: {
        contractorCompanyId: contractorCompany.id,
        departmentId: department.id,
        employeeProfileId: employee.id,
        organizationId: khalda.id,
      },
      where: { nationalId: employee.nationalId },
    });
    await prisma.occupationalRiskProfile.upsert({
      create: {
        diabetes: true,
        employeeId: employee.id,
        highRisk: true,
        hypertension: true,
        occupationalExposure: {
          confinedSpace: true,
          drivingDuty: true,
          offshoreWorker: true,
          workAtHeight: true,
        },
        previousMI: true,
        riskScore: 6,
        smoking: true,
      },
      update: {
        diabetes: true,
        highRisk: true,
        hypertension: true,
        previousMI: true,
        riskScore: 6,
        smoking: true,
      },
      where: { employeeId: employee.id },
    });
    const existingAssessment = await prisma.fitnessAssessment.findFirst({ where: { employeeId: employee.id } });
    if (!existingAssessment) {
      const assessment = await prisma.fitnessAssessment.create({
        data: {
          assessedById: doctor.id,
          employeeId: employee.id,
          finalDecision: "FIT_WITH_RESTRICTIONS",
          inputSummary: { seed: true, riskScore: 6 },
          occupationalReportSection: {
            finalFitnessDecision: "Fit with restrictions",
            physicianJustification: "Seed occupational cardiology example for safety-critical offshore work.",
            restrictions: ["No work at height", "No driving", "No offshore duty"],
            reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          patientId: patient.id,
          physicianJustification: "Seed occupational cardiology example for safety-critical offshore work.",
          recommendation: "FIT_WITH_RESTRICTIONS",
          restrictions: {
            create: [
              {
                description: "No work at height.",
                employeeId: employee.id,
                patientId: patient.id,
                type: "NO_WORK_AT_HEIGHT",
              },
              {
                description: "No commercial or safety-sensitive driving.",
                employeeId: employee.id,
                patientId: patient.id,
                type: "NO_DRIVING",
              },
              {
                description: "No offshore duty until medically cleared.",
                employeeId: employee.id,
                patientId: patient.id,
                type: "NO_OFFSHORE_DUTY",
              },
            ],
          },
        },
      });
      await prisma.timelineEvent.create({
        data: {
          metadata: { assessmentId: assessment.id, seed: true },
          patientId: patient.id,
          title: "Seed occupational fitness assessment completed",
          type: "FITNESS_ASSESSMENT_COMPLETED",
        },
      });
    }
  }

  const author = doctor ?? (await prisma.user.findUnique({ where: { email: "admin@ecginsight.com" } }));
  if (author) {
    for (const category of knowledgeCategories) {
      await prisma.knowledgeCategory.upsert({
        create: category,
        update: { title: category.title },
        where: { name: category.name },
      });
    }
    const occupationalCategory = await prisma.knowledgeCategory.findUnique({ where: { name: "OCCUPATIONAL_FITNESS" } });
    if (occupationalCategory) {
      const existing = await prisma.knowledgeArticle.findFirst({
        where: { categoryId: occupationalCategory.id, title: "Safety-sensitive cardiac fitness standard" },
      });
      if (!existing) {
        await prisma.knowledgeArticle.create({
          data: {
            authorId: author.id,
            body: "Workers with active ischemia, EF below 40%, unstable arrhythmia, or recent revascularization require occupational cardiology review before safety-sensitive deployment.",
            categoryId: occupationalCategory.id,
            references: ["Internal occupational cardiology protocol"],
            tags: ["fitness", "ischemia", "ef", "restrictions"],
            title: "Safety-sensitive cardiac fitness standard",
          },
        });
      }
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
