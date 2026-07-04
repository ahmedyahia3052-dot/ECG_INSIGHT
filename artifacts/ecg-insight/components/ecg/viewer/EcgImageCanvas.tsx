import React from "react";

import { EcgProViewerEngine } from "./EcgProViewerEngine";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  imageUrl?: string;
  pdfUrl?: string;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgImageCanvas({ controls, imageUrl, pdfUrl, testID = "sprint13-ecg-image-canvas", workspace }: Props) {
  return (
    <EcgProViewerEngine
      controls={controls}
      imageUrl={imageUrl}
      pdfUrl={pdfUrl}
      testID={testID}
      workspace={workspace}
    />
  );
}