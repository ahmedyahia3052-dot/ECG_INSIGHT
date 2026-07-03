import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import type { CopilotAttachment } from "./copilot";

export type CopilotUploadKind = "ecg" | "file" | "image";

export type UploadableAsset = {
  mimeType: string;
  name: string;
  size?: number;
  uri: string;
};

const RULES: Record<CopilotUploadKind, { extensions: string[]; maxBytes: number; multiple: boolean }> = {
  ecg: { extensions: [".jpg", ".jpeg", ".pdf", ".png", ".zip", ".dcm", ".dicom"], maxBytes: 25 * 1024 * 1024, multiple: true },
  file: { extensions: [".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt", ".zip"], maxBytes: 25 * 1024 * 1024, multiple: true },
  image: { extensions: [".jpg", ".jpeg", ".png", ".webp"], maxBytes: 25 * 1024 * 1024, multiple: true },
};

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export async function pickCopilotUploadAssets(kind: CopilotUploadKind): Promise<UploadableAsset[]> {
  if (Platform.OS === "web") return [];

  if (kind === "image") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Photo library permission is required.");
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: RULES[kind].multiple,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return [];
    return result.assets.map((asset) => ({
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      size: asset.fileSize,
      uri: asset.uri,
    }));
  }

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: RULES[kind].multiple,
    type: kind === "ecg" ? ["application/pdf", "image/*", "application/zip", "application/dicom"] : "*/*",
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    mimeType: asset.mimeType ?? "application/octet-stream",
    name: asset.name,
    size: asset.size,
    uri: asset.uri,
  }));
}

export async function captureCopilotCameraAsset(): Promise<UploadableAsset | null> {
  if (Platform.OS === "web") return null;
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Camera permission is required.");
  const result = await ImagePicker.launchCameraAsync({ quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    mimeType: asset.mimeType ?? "image/jpeg",
    name: asset.fileName ?? `camera-${Date.now()}.jpg`,
    size: asset.fileSize,
    uri: asset.uri,
  };
}

export function validateUploadAsset(kind: CopilotUploadKind, asset: UploadableAsset) {
  const rule = RULES[kind];
  const extension = extensionOf(asset.name);
  if (!rule.extensions.includes(extension)) {
    throw new Error("Unsupported format.");
  }
  if (typeof asset.size === "number" && asset.size > rule.maxBytes) {
    throw new Error("File too large.");
  }
}

export function buildCopilotUploadFormData(
  asset: UploadableAsset | File,
  kind: CopilotUploadKind,
  context: { caseId?: string; conversationId?: string; patientId?: string },
) {
  const formData = new FormData();
  if ("uri" in asset) {
    formData.append("file", {
      name: asset.name,
      type: asset.mimeType,
      uri: asset.uri,
    } as unknown as Blob);
  } else {
    formData.append("file", asset);
  }
  formData.append("kind", kind);
  formData.append("contextType", context.caseId ? "case" : context.patientId ? "patient" : "global");
  if (context.patientId) formData.append("patientId", context.patientId);
  if (context.caseId) formData.append("caseId", context.caseId);
  if (context.conversationId) formData.append("conversationId", context.conversationId);
  return formData;
}

export function formatUploadNotice(payload: { attachment: CopilotAttachment; clinicalLinkage?: { caseId: string; patientId: string; visitId: string } }) {
  const stageSummary = payload.attachment.pipelineStages
    ?.filter((item) => item.status === "completed" || item.status === "warning")
    .map((item) => item.stage.replace(/_/g, " "))
    .slice(-3)
    .join(" → ");
  const linkage = payload.clinicalLinkage ? " Patient, visit, and ECG case linked automatically." : "";
  return payload.attachment.analysisSummary
    ? `${payload.attachment.originalName}: ${payload.attachment.analysisSummary}${stageSummary ? ` (${stageSummary})` : ""}${linkage}`
    : `${payload.attachment.originalName} attached.${linkage}`;
}
