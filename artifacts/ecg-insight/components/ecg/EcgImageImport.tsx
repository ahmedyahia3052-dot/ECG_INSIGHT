import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import {
  processEcgImage,
  validateEcgImageAsset,
  type EcgAcquisitionAsset,
  type ProcessedEcgImage,
} from "@/services/ecgImageProcessor";

export type EcgImportSource = "camera" | "clipboard" | "drag_drop" | "upload";

export type EcgImageImportResult = {
  asset: EcgAcquisitionAsset;
  processed: ProcessedEcgImage;
  source: EcgImportSource;
};

const ACCEPTED_LABEL = "JPG, JPEG, PNG, BMP, TIFF, PDF — max 50 MB";

type Props = {
  disabled?: boolean;
  onError?: (message: string) => void;
  onImported: (result: EcgImageImportResult) => void;
};

function fileFromWebFile(file: File): EcgAcquisitionAsset {
  return {
    file,
    mimeType: file.type || "application/octet-stream",
    name: file.name,
    size: file.size,
    uri: URL.createObjectURL(file),
  };
}

export function EcgImageImport({ disabled, onError, onImported }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const runImport = useCallback(async (asset: EcgAcquisitionAsset, source: EcgImportSource) => {
    const errors = validateEcgImageAsset(asset);
    if (errors.length) {
      onError?.(errors.join(" "));
      return;
    }
    setProcessing(true);
    setStep("Preprocessing image...");
    try {
      const processed = await processEcgImage(asset, { scannerMode: true });
      if (processed.errors.length) {
        onError?.(processed.errors.join(" "));
        return;
      }
      onImported({ asset: processed.enhanced, processed, source });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "ECG import failed.");
    } finally {
      setProcessing(false);
      setStep("");
    }
  }, [onError, onImported]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const file = list[0];
    if (!file) return;
    await runImport(fileFromWebFile(file), Platform.OS === "web" ? "drag_drop" : "upload");
  }, [runImport]);

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) void runImport(fileFromWebFile(file), "clipboard");
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [runImport]);

  async function pickUpload() {
    if (Platform.OS === "web") {
      inputRef.current?.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await runImport({
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? "ecg-upload.jpg",
      size: asset.fileSize,
      uri: asset.uri,
    }, "upload");
  }

  async function pickCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onError?.("Camera permission is required to capture an ECG photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await runImport({
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? "ecg-camera.jpg",
      size: asset.fileSize,
      uri: asset.uri,
    }, "camera");
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Import ECG Image</Text>
      <Text style={styles.subtitle}>{ACCEPTED_LABEL}</Text>

      {Platform.OS === "web" ? (
        <>
          <div
            role="presentation"
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
            }}
            style={{
              alignItems: "center",
              background: dragActive ? "rgba(56,189,248,0.12)" : "rgba(15,23,42,0.72)",
              border: `2px dashed ${dragActive ? medicalTheme.primary : "rgba(148,163,184,0.35)"}`,
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
              minHeight: 160,
              padding: 24,
            }}
          >
            <Feather color={medicalTheme.primary} name="upload-cloud" size={28} />
            <Text style={styles.dropText}>Drag & drop ECG image here</Text>
            <Text style={styles.hintText}>Or paste from clipboard (Ctrl+V)</Text>
          </div>
          <input
            accept=".jpg,.jpeg,.png,.bmp,.tif,.tiff,.pdf,image/*,application/pdf"
            hidden
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files);
              event.target.value = "";
            }}
            ref={inputRef}
            type="file"
          />
        </>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton disabled={disabled || processing} icon="upload" label="Upload Image" onPress={() => void pickUpload()} variant="outline" />
        <PrimaryButton disabled={disabled || processing} icon="camera" label="Camera" onPress={() => void pickCamera()} variant="outline" />
        {Platform.OS === "web" ? (
          <PrimaryButton disabled={disabled || processing} icon="clipboard" label="Paste" onPress={() => onError?.("Press Ctrl+V anywhere on this page to paste an ECG image.")} variant="outline" />
        ) : null}
      </View>

      {processing ? (
        <View style={styles.progress}>
          <ActivityIndicator color={medicalTheme.primary} />
          <Text style={styles.progressText}>{step || "Processing..."}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  dropText: { color: medicalTheme.text, fontSize: 15, fontWeight: "800" },
  hintText: { color: medicalTheme.muted, fontSize: 12 },
  progress: { alignItems: "center", flexDirection: "row", gap: 10 },
  progressText: { color: medicalTheme.text, fontSize: 13, fontWeight: "700" },
  subtitle: { color: medicalTheme.muted, fontSize: 12 },
  title: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
});
