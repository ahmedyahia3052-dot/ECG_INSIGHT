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

const demoOrganizations = ["Khalda Petroleum", "Petrojet", "ENPPI"] as const;

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
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
