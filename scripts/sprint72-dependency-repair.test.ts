import fs from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync("server/src/errors/app-error.ts"), "AppError must live in a dedicated module.");
assert(fs.existsSync("server/src/ai/ai-provider.types.ts"), "AIProvider interface must be extracted from providers.");

const errorMiddleware = fs.readFileSync("server/src/middleware/error.ts", "utf8");
assert(errorMiddleware.includes('from "../errors/app-error"'), "error middleware must import AppError from errors/app-error.");
assert(!errorMiddleware.includes("export class AppError"), "AppError class must not remain in error middleware.");

const apiErrors = fs.readFileSync("server/src/api/standards/errors.ts", "utf8");
assert(apiErrors.includes('from "../../errors/app-error"'), "api standards errors must import AppError from errors/app-error.");
assert(!apiErrors.includes('from "../../middleware/error"'), "api standards errors must not import middleware/error.");

const onnx = fs.readFileSync("server/src/ai/onnx-runtime.service.ts", "utf8");
assert(onnx.includes('from "./ai-provider.types"'), "onnx runtime must import AIProvider from ai-provider.types.");

console.log("Sprint 72 dependency repair unit tests: PASS");
