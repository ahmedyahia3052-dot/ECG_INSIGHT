import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type DigitizedWaveformLead = {
  lead: string;
  path: string;
};

export const EcgDigitizedWaveformLayer = memo(function EcgDigitizedWaveformLayer({
  height,
  leads = [],
  width,
}: {
  height: number;
  leads?: DigitizedWaveformLead[];
  width: number;
}) {
  if (!leads.length || width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="sprint13-ecg-layer-digitized">
      <Svg height={height} width={width}>
        {leads.map((lead) => (
          <Path d={lead.path} fill="none" key={lead.lead} stroke="#DC2626" strokeWidth={1.6} />
        ))}
      </Svg>
    </View>
  );
});
