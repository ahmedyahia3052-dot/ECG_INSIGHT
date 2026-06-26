import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const workspaceRoot = process.cwd();
function loadEnvDefaults(filePath: string) {
  const absolutePath = path.join(workspaceRoot, filePath);
  if (!fs.existsSync(absolutePath)) return;
  const parsed = dotenv.parse(fs.readFileSync(absolutePath));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] ??= value;
  }
}

loadEnvDefaults(process.env["PRODUCTION_ENV_FILE"] ?? ".env.production");
loadEnvDefaults(".env");

const requiredVariables = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
  "PORT",
  "CLIENT_ORIGIN",
  "EXPO_PUBLIC_API_URL",
  "STORAGE_PATH",
  "BACKUP_DIR",
  "BACKUP_RETENTION_DAYS",
] as const;

const requiredFiles = [
  "Dockerfile.backend.production",
  "Dockerfile.production",
  "Dockerfile.frontend.production",
  "ai-engine/Dockerfile.production",
  "docker-compose.production.yml",
  "nginx.conf",
  ".env.development",
  ".env.staging",
  ".env.production",
  ".env.production.example",
  "scripts/backup-now.ts",
  "scripts/backup-service.ts",
  "scripts/restore-backup.ts",
  "RELEASE_CHECKLIST.md",
  "PRODUCTION_DEPLOYMENT_GUIDE.md",
  "SYSTEM_ARCHITECTURE.md",
  "docs/BACKUP_STRATEGY.md",
  "docs/DISASTER_RECOVERY.md",
];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function requireUrl(name: string, value: string) {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

function hasPlaceholder(value: string) {
  return /replace|change-me|example|USER:PASSWORD|<HOST>|\bHOST\b/i.test(value);
}

function validateProductionEnvironment() {
  const missing = requiredVariables.filter((name) => !process.env[name]?.trim());
  assert(missing.length === 0, `Missing required production variables: ${missing.join(", ")}`);

  assert(process.env["NODE_ENV"] === "production", "NODE_ENV must be production for production validation.");
  assert(!hasPlaceholder(process.env["DATABASE_URL"]!), "DATABASE_URL contains a placeholder value.");
  assert(!hasPlaceholder(process.env["JWT_SECRET"]!), "JWT_SECRET contains a placeholder value.");
  assert(!hasPlaceholder(process.env["JWT_REFRESH_SECRET"]!), "JWT_REFRESH_SECRET contains a placeholder value.");
  assert(process.env["JWT_SECRET"]!.length >= 32, "JWT_SECRET must be at least 32 characters.");
  assert(process.env["JWT_REFRESH_SECRET"]!.length >= 32, "JWT_REFRESH_SECRET must be at least 32 characters.");
  assert(Number(process.env["BACKUP_RETENTION_DAYS"]) > 0, "BACKUP_RETENTION_DAYS must be positive.");

  requireUrl("DATABASE_URL", process.env["DATABASE_URL"]!);
  requireUrl("EXPO_PUBLIC_API_URL", process.env["EXPO_PUBLIC_API_URL"]!);
  assert(process.env["EXPO_PUBLIC_API_URL"]!.startsWith("https://"), "EXPO_PUBLIC_API_URL must use HTTPS in production.");

  for (const origin of process.env["CLIENT_ORIGIN"]!.split(",").map((item) => item.trim()).filter(Boolean)) {
    requireUrl("CLIENT_ORIGIN", origin);
    assert(origin.startsWith("https://"), "CLIENT_ORIGIN entries must use HTTPS in production.");
  }
}

function validateReleaseArtifacts() {
  const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(path.join(workspaceRoot, filePath)));
  assert(missingFiles.length === 0, `Missing production release artifacts: ${missingFiles.join(", ")}`);
}

function main() {
  validateProductionEnvironment();
  validateReleaseArtifacts();
  console.log("Production validation passed.");
}

main();
