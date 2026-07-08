import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exposeAuthTokensInResponse, redactAuthSecrets } from "../server/src/utils/auth-response-safety";
import { normalizeUploadPath } from "../server/src/utils/upload-access";
import { assertUploadContentMatchesMime } from "../server/src/utils/upload-security";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(exposeAuthTokensInResponse(), "Development mode should expose auth tokens for integration tests.");

const redacted = redactAuthSecrets({
  emailVerificationToken: "secret-token",
  message: "ok",
  otp: "123456",
  resetToken: "reset-token",
});
if (exposeAuthTokensInResponse()) {
  assert("resetToken" in redacted, "Development responses may include reset tokens for test flows.");
} else {
  assert(!("resetToken" in redacted), "Production responses must not include reset tokens.");
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sprint71-upload-"));
const pdfPath = path.join(tempDir, "sample.pdf");
fs.writeFileSync(pdfPath, "%PDF-1.4 sample");
assertUploadContentMatchesMime(pdfPath, "application/pdf");

const spoofPath = path.join(tempDir, "spoof.pdf");
fs.writeFileSync(spoofPath, "<html>not-a-pdf</html>");
let rejected = false;
try {
  assertUploadContentMatchesMime(spoofPath, "application/pdf");
} catch {
  rejected = true;
}
assert(rejected, "Magic-byte validation should reject mismatched content.");

let pathTraversalBlocked = false;
try {
  normalizeUploadPath("../../etc/passwd");
} catch {
  pathTraversalBlocked = true;
}
assert(pathTraversalBlocked, "Path traversal should be blocked.");

console.log("Sprint 71 enterprise security hardening unit tests: PASS");
