import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/error";
import type { StorageHeadResult, StorageObjectRef, StorageProvider, StoragePutInput } from "../types";
import { LocalStorageProvider, getLocalStorageRoot } from "./local.provider";

function hmac(key: string | Buffer, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data: string | Buffer) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signKey(secret: string, date: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secret}`, date.slice(0, 8));
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function buildAuthorizationHeader(input: {
  method: string;
  url: URL;
  payloadHash: string;
  accessKey: string;
  secretKey: string;
  region: string;
}) {
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = urlPathEncoded(input.url.pathname);
  const canonicalQuery = input.url.search ? input.url.search.slice(1) : "";
  const canonicalHeaders = `host:${input.url.host}\nx-amz-content-sha256:${input.payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signKey(input.secretKey, dateStamp, input.region, "s3"))
    .update(stringToSign)
    .digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function urlPathEncoded(pathname: string) {
  return pathname.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * S3-compatible provider (MinIO, AWS S3, etc.) using SigV4 over fetch.
 * Falls back to local mirror under uploads/s3-compat when S3 is not configured.
 */
export class S3CompatibleStorageProvider implements StorageProvider {
  readonly kind = "s3" as const;
  private readonly mirror: LocalStorageProvider;
  private readonly configured: boolean;

  constructor(
    private readonly endpoint = env.S3_ENDPOINT,
    private readonly bucket = env.S3_BUCKET,
    private readonly accessKey = env.S3_ACCESS_KEY,
    private readonly secretKey = env.S3_SECRET_KEY,
    private readonly region = env.S3_REGION,
  ) {
    this.configured = Boolean(endpoint && bucket && accessKey && secretKey);
    this.mirror = new LocalStorageProvider();
  }

  isConfigured() {
    return this.configured;
  }

  private objectUrl(key: string) {
    if (!this.endpoint || !this.bucket) {
      throw new AppError(503, "S3 storage is not configured.", "S3_NOT_CONFIGURED");
    }
    const base = new URL(this.endpoint);
    return new URL(`${urlPathEncoded(`/${this.bucket}/${key}`)}`, base);
  }

  private mirrorKey(key: string) {
    return path.posix.join("s3-compat", key);
  }

  async put(input: StoragePutInput): Promise<StorageObjectRef> {
    if (!this.configured) {
      const mirrored = await this.mirror.put({ ...input, key: this.mirrorKey(input.key) });
      return { ...mirrored, key: input.key, provider: "s3" };
    }

    const body = await fs.readFile(input.sourcePath);
    const payloadHash = sha256(body);
    const url = this.objectUrl(input.key);
    const authorization = buildAuthorizationHeader({
      accessKey: this.accessKey!,
      method: "PUT",
      payloadHash,
      region: this.region,
      secretKey: this.secretKey!,
      url,
    });

    const response = await fetch(url, {
      body,
      headers: {
        Authorization: authorization,
        "Content-Length": String(body.length),
        "Content-Type": input.mimeType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": toAmzDate(),
      },
      method: "PUT",
    });

    if (!response.ok) {
      throw new AppError(502, `S3 upload failed (${response.status}).`, "S3_UPLOAD_FAILED");
    }

    return { key: input.key, provider: "s3" };
  }

  async getPath(key: string): Promise<string> {
    if (!this.configured) {
      return this.mirror.getPath(this.mirrorKey(key));
    }

    const url = this.objectUrl(key);
    const payloadHash = sha256("");
    const authorization = buildAuthorizationHeader({
      accessKey: this.accessKey!,
      method: "GET",
      payloadHash,
      region: this.region,
      secretKey: this.secretKey!,
      url,
    });

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": toAmzDate(),
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new AppError(404, "Storage object not found.", "STORAGE_OBJECT_NOT_FOUND");
    }

    const cacheDir = path.join(getLocalStorageRoot(), ".s3-cache");
    const cachePath = path.join(cacheDir, key);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(cachePath, buffer);
    return cachePath;
  }

  async delete(key: string): Promise<void> {
    if (!this.configured) {
      await this.mirror.delete(this.mirrorKey(key));
      return;
    }

    const url = this.objectUrl(key);
    const payloadHash = sha256("");
    const authorization = buildAuthorizationHeader({
      accessKey: this.accessKey!,
      method: "DELETE",
      payloadHash,
      region: this.region,
      secretKey: this.secretKey!,
      url,
    });

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": toAmzDate(),
      },
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new AppError(502, `S3 delete failed (${response.status}).`, "S3_DELETE_FAILED");
    }
  }

  async head(key: string): Promise<StorageHeadResult> {
    if (!this.configured) {
      return this.mirror.head(this.mirrorKey(key));
    }

    const url = this.objectUrl(key);
    const payloadHash = sha256("");
    const authorization = buildAuthorizationHeader({
      accessKey: this.accessKey!,
      method: "HEAD",
      payloadHash,
      region: this.region,
      secretKey: this.secretKey!,
      url,
    });

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": toAmzDate(),
      },
      method: "HEAD",
    });

    if (response.status === 404) return { exists: false, key };
    if (!response.ok) {
      throw new AppError(502, `S3 head failed (${response.status}).`, "S3_HEAD_FAILED");
    }

    return {
      exists: true,
      key,
      mimeType: response.headers.get("content-type") ?? undefined,
      sizeBytes: Number(response.headers.get("content-length") ?? 0) || undefined,
    };
  }
}
