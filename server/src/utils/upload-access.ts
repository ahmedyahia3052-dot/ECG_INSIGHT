import type { Role } from "@prisma/client";
import path from "node:path";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "./resource-access";

type AuthContext = { id: string; role: Role };

function uploadRoot() {
  return path.resolve(process.cwd(), env.STORAGE_PATH);
}

export function normalizeUploadPath(requestedPath: string) {
  if (requestedPath.includes("..")) {
    throw new AppError(403, "Invalid file path.", "INVALID_FILE_PATH");
  }

  const root = uploadRoot();
  const absolute = path.resolve(root, path.normalize(requestedPath).replace(/^[/\\]+/, ""));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new AppError(403, "Invalid file path.", "INVALID_FILE_PATH");
  }

  return absolute;
}

async function assertFileAccess(
  file: { caseId: string | null; patientId: string | null; uploadedById: string | null },
  auth: AuthContext,
) {
  if (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN") return;

  let allowed = false;
  if (file.caseId) {
    allowed = await canAccessCase(file.caseId, auth);
  } else if (file.patientId) {
    allowed = await canAccessPatient(file.patientId, auth);
  } else if (file.uploadedById) {
    allowed = file.uploadedById === auth.id;
  }

  assertResourceAccess(allowed, "You do not have access to this file.");
}

export async function assertEcgFileDownloadAccess(storedName: string, auth: AuthContext) {
  const file = await prisma.eCGFile.findFirst({
    where: { storedName: path.basename(storedName) },
  });
  if (!file) {
    throw new AppError(404, "ECG file not found.", "FILE_NOT_FOUND");
  }

  await assertFileAccess(file, auth);
  return file;
}

export async function resolveAuthorizedSignedDownloadPath(
  input: { fileId?: string; path?: string; storedName?: string },
  auth: AuthContext,
) {
  const file = input.fileId
    ? await prisma.eCGFile.findUnique({ where: { id: input.fileId } })
    : input.storedName
      ? await prisma.eCGFile.findFirst({ where: { storedName: path.basename(input.storedName) } })
      : input.path
        ? await prisma.eCGFile.findFirst({
            where: {
              OR: [
                { storagePath: normalizeUploadPath(input.path) },
                { storedName: path.basename(input.path) },
              ],
            },
          })
        : null;

  if (!file) {
    throw new AppError(404, "File not found.", "FILE_NOT_FOUND");
  }

  await assertFileAccess(file, auth);
  return file.storagePath;
}
