import type { AiVersionTag } from "./types";

export const AI_FOUNDATION_VERSION = "81.0.0";

export function buildVersionTag(input: Partial<AiVersionTag> = {}): AiVersionTag {
  return {
    foundationVersion: AI_FOUNDATION_VERSION,
    ...input,
  };
}

export function formatVersionTag(tag: AiVersionTag): string {
  const parts = [tag.foundationVersion];
  if (tag.providerName) parts.push(tag.providerName);
  if (tag.modelVersion) parts.push(tag.modelVersion);
  if (tag.engineVersion) parts.push(tag.engineVersion);
  if (tag.promptVersion) parts.push(`prompt:${tag.promptVersion}`);
  return parts.join(":");
}
