import * as ImagePicker from "expo-image-picker";
import React, { memo, useCallback } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { assessEcgImageQuality } from "@/services/ecgImageProcessor";

export const EcgAcquisitionCapturePanel = memo(function EcgAcquisitionCapturePanel({
  onAssetSelected,
}: {
  onAssetSelected: (asset: { mimeType: string; name: string; uri: string }) => void;
}) {
  const pickLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `ecg-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? "image/jpeg";
    const quality = assessEcgImageQuality({ mimeType, name, size: asset.fileSize ?? 0, uri: asset.uri });
    onAssetSelected({ mimeType, name, uri: asset.uri });
    return quality;
  }, [onAssetSelected]);

  const pickCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onAssetSelected({
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? `camera-ecg-${Date.now()}.jpg`,
      uri: asset.uri,
    });
  }, [onAssetSelected]);

  return (
    <View style={styles.root} testID="sprint47-acquisition-capture">
      <Text style={styles.title}>ECG Acquisition</Text>
      <Text style={styles.body}>Capture or import paper ECG images (PNG, JPG, JPEG, TIFF, PDF). Smart detection runs automatically during digitization.</Text>
      <View style={styles.row}>
        <PrimaryButton label="Camera" onPress={pickCamera} variant="primary" />
        <PrimaryButton label="Gallery / Scan" onPress={pickLibrary} variant="outline" />
      </View>
      {Platform.OS === "web" ? <Text style={styles.hint}>Web: use Gallery / Scan or drag-and-drop on Upload ECG.</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  body: { color: medicalTheme.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  hint: { color: medicalTheme.muted, fontSize: 11, fontWeight: "600" },
  root: { gap: 8, paddingVertical: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
});
