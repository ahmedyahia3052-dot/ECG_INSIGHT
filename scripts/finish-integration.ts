import { terminateClinicalOcrWorker } from "../server/src/modules/ocr/clinical-ocr.service";

export async function finishIntegration(code = 0): Promise<never> {
  await terminateClinicalOcrWorker().catch(() => undefined);
  try {
    const { prisma } = await import("../server/src/config/prisma");
    await prisma.$disconnect();
  } catch {
    // Scripts may use a dedicated PrismaClient instance instead of the shared export.
  }
  process.exit(code);
}

export function runIntegrationMain(main: () => Promise<void>, label: string) {
  void main()
    .then(async () => {
      await finishIntegration(0);
    })
    .catch(async (error) => {
      console.error(error);
      await finishIntegration(1);
    });
}
