import React from "react";

import { EcgProViewerEngine } from "./EcgProViewerEngine";
import { useAuthenticatedEcgAsset } from "./useAuthenticatedEcgAsset";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  accessToken?: string | null;
  controls: EcgViewerControls;
  imageUrl?: string;
  pdfUrl?: string;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgImageCanvas({ accessToken, controls, imageUrl, pdfUrl, testID = "sprint13-ecg-image-canvas", workspace }: Props) {
  const asset = useAuthenticatedEcgAsset(imageUrl, accessToken);

  return (
    <EcgProViewerEngine
      accessToken={accessToken}
      assetHeight={asset.height}
      assetLoading={asset.loading}
      assetWidth={asset.width}
      controls={controls}
      imageUrl={asset.url}
      pdfUrl={pdfUrl}
      testID={testID}
      workspace={workspace}
    />
  );
}
