import type { CopilotAttachment, CopilotClinicalLinkage } from "./copilot";
import { getCopilotAttachmentProcessing, uploadCopilotAttachment } from "./copilot";
import type { UploadPipelineJob, UploadPipelineStage } from "@/components/copilot/types";
import { UPLOAD_STAGE_LABELS } from "@/components/copilot/types";

const POLL_INTERVAL_MS = 800;
const MAX_POLL_ATTEMPTS = 120;

function mapServerStage(stage?: string, processingStatus?: string): UploadPipelineStage {
  if (processingStatus === "failed") return "failed";
  if (processingStatus === "cancelled") return "cancelled";
  if (processingStatus === "completed") return "completed";
  if (stage === "validation") return "detect";
  if (stage === "ocr") return "ocr";
  if (stage === "metadata") return "metadata";
  if (stage === "context") return "context";
  if (stage === "validation-check") return "validation";
  return "upload";
}

function stageProgress(stage: UploadPipelineStage, serverProgress = 0): number {
  const base: Record<UploadPipelineStage, number> = {
    cancelled: 0,
    completed: 100,
    context: 85,
    detect: 25,
    failed: 100,
    metadata: 65,
    ocr: 45,
    upload: 10,
    validation: 95,
  };
  if (stage === "completed" || stage === "failed") return 100;
  return Math.max(base[stage], serverProgress);
}

export type UploadPipelineResult = {
  attachment: CopilotAttachment;
  clinicalLinkage?: CopilotClinicalLinkage;
};

export async function runUploadPipeline(
  accessToken: string,
  formData: FormData,
  fileName: string,
  onUpdate: (job: UploadPipelineJob) => void,
  signal?: AbortSignal,
): Promise<UploadPipelineResult> {
  let cancelled = false;
  let ocrFinished = false;
  const cancel = () => {
    cancelled = true;
  };
  const { emitRuntimeEvent } = await import("./runtimeEvents");
  emitRuntimeEvent("UploadStarted", { fileName });

  onUpdate({
    cancel,
    fileName,
    progress: 5,
    stage: "upload",
    stageLabel: UPLOAD_STAGE_LABELS.upload,
  });

  const response = await uploadCopilotAttachment(accessToken, formData, signal);
  if (cancelled || signal?.aborted) {
    onUpdate({ cancel, fileName, progress: 0, stage: "cancelled", stageLabel: UPLOAD_STAGE_LABELS.cancelled });
    emitRuntimeEvent("UploadFinished", { fileName, status: "cancelled" });
    throw new Error("Upload cancelled.");
  }

  if (response.processingStatus === "processing" && response.attachment.id) {
    const attachmentId = response.attachment.id;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      if (cancelled || signal?.aborted) {
        onUpdate({ attachmentId, cancel, fileName, progress: 0, stage: "cancelled", stageLabel: UPLOAD_STAGE_LABELS.cancelled });
        emitRuntimeEvent("UploadFinished", { attachmentId, fileName, status: "cancelled" });
        throw new Error("Upload cancelled.");
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await getCopilotAttachmentProcessing(accessToken, attachmentId);
      const stage = mapServerStage(status.job?.stage, status.processingStatus);
      onUpdate({
        attachmentId,
        cancel,
        error: status.job?.error?.message,
        fileName,
        progress: stageProgress(stage, status.job?.progress ?? 0),
        stage,
        stageLabel: UPLOAD_STAGE_LABELS[stage],
      });
      if (stage === "ocr" && status.processingStatus !== "failed" && !ocrFinished) {
        ocrFinished = true;
        emitRuntimeEvent("OCRFinished", { attachmentId, fileName });
      }
      if (status.processingStatus === "completed" && status.attachment) {
        emitRuntimeEvent("UploadFinished", { attachmentId, fileName, status: "completed" });
        return { attachment: status.attachment, clinicalLinkage: status.clinicalLinkage };
      }
      if (status.processingStatus === "failed") {
        emitRuntimeEvent("UploadFinished", { attachmentId, fileName, status: "failed" });
        throw new Error(status.job?.error?.message ?? "Attachment processing failed.");
      }
    }
    emitRuntimeEvent("UploadFinished", { fileName, status: "timeout" });
    throw new Error("Attachment processing timed out.");
  }

  onUpdate({
    attachmentId: response.attachment.id,
    fileName,
    progress: 100,
    stage: "completed",
    stageLabel: UPLOAD_STAGE_LABELS.completed,
  });
  emitRuntimeEvent("UploadFinished", { attachmentId: response.attachment.id, fileName, status: "completed" });
  return { attachment: response.attachment, clinicalLinkage: response.clinicalLinkage };
}
