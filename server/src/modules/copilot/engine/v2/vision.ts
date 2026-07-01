import type { AttachmentForAnalysis } from "../../copilot-types";
import { attachmentInsights } from "../attachment-analysis";
import type { AttachmentInsight } from "../../copilot-types";

const VISION_KINDS = new Set(["camera", "ecg", "echo", "file", "image", "labs"]);

export type VisionResult = {
  autoInvoked: boolean;
  insights: AttachmentInsight[];
};

export const VisionAnalysis = {
  analyze(attachments: AttachmentForAnalysis[]): VisionResult {
    const medical = attachments.filter((attachment) => VISION_KINDS.has(attachment.kind));
    if (!medical.length) {
      return { autoInvoked: false, insights: [] };
    }
    return {
      autoInvoked: true,
      insights: attachmentInsights(medical),
    };
  },

  mergeMemoryInsights(
    current: AttachmentInsight[],
    memoryAttachments: Array<{ documentType?: string; kind: string; name: string }>,
    rememberedInsights: AttachmentInsight[],
  ): AttachmentInsight[] {
    const names = new Set(current.map((item) => item.name));
    const fromMemory = rememberedInsights.filter((item) => !names.has(item.name));
    if (!fromMemory.length) return current;
    return current.concat(fromMemory);
  },
};
