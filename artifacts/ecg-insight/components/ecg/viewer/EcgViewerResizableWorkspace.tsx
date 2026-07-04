import React, { type ReactNode, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

const LAYOUT_KEY = "ecg-insight:ecg-monitor-panel-layout";

type SavedLayout = {
  bottomSize?: number;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightSize?: number;
};

function loadLayout(): SavedLayout {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? "{}") as SavedLayout;
  } catch {
    return {};
  }
}

function saveLayout(layout: SavedLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage failures.
  }
}

type Props = {
  bottom: ReactNode;
  center: ReactNode;
  left: ReactNode;
  right: ReactNode;
};

export function EcgViewerResizableWorkspace({ bottom, center, left, right }: Props) {
  const [layout, setLayout] = useState<SavedLayout>(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  if (Platform.OS === "web") {
    return <WebWorkspace bottom={bottom} center={center} layout={layout} left={left} onLayoutChange={setLayout} right={right} />;
  }

  return (
    <View style={styles.nativeColumn}>
      <View style={styles.nativeMainRow}>
        <View style={[styles.nativeSide, { width: layout.leftSize ?? 280 }]}>{left}</View>
        <View style={styles.nativeCenter}>{center}</View>
        {!layout.rightCollapsed ? <View style={[styles.nativeSide, { width: layout.rightSize ?? 260 }]}>{right}</View> : null}
      </View>
      <View style={styles.nativeBottom}>{bottom}</View>
    </View>
  );
}

function WebWorkspace({
  bottom,
  center,
  layout,
  left,
  onLayoutChange,
  right,
}: Props & { layout: SavedLayout; onLayoutChange: (layout: SavedLayout) => void }) {
  const [panels, setPanels] = useState<null | typeof import("react-resizable-panels")>(null);

  useEffect(() => {
    void import("react-resizable-panels").then(setPanels);
  }, []);

  if (!panels) {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeMainRow}>
          <View style={styles.nativeSide}>{left}</View>
          <View style={styles.nativeCenter}>{center}</View>
          <View style={styles.nativeSide}>{right}</View>
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  const { Group, Panel, Separator } = panels;

  return (
    <Group id="ecg-monitor-workspace" orientation="vertical" style={styles.webRoot}>
      <Panel defaultSize={82} id="ecg-monitor-main" minSize={55}>
        <Group orientation="horizontal" style={styles.webRoot}>
          <Panel defaultSize={layout.leftSize ?? 20} id="ecg-monitor-left" maxSize={35} minSize={14}>
            <View style={styles.panelFill}>{left}</View>
          </Panel>
          <Separator style={styles.separator} />
          <Panel defaultSize={layout.rightCollapsed ? 80 : 56} id="ecg-monitor-center" minSize={35}>
            <View style={styles.panelFill}>{center}</View>
          </Panel>
          {!layout.rightCollapsed ? (
            <>
              <Separator style={styles.separator} />
              <Panel defaultSize={layout.rightSize ?? 24} id="ecg-monitor-right" maxSize={35} minSize={14}>
                <View style={styles.panelFill}>{right}</View>
              </Panel>
            </>
          ) : null}
        </Group>
      </Panel>
      <Separator style={styles.separatorHorizontal} />
      <Panel defaultSize={layout.bottomSize ?? 18} id="ecg-monitor-bottom" maxSize={35} minSize={12}>
        <View style={styles.panelFill}>{bottom}</View>
      </Panel>
    </Group>
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0, marginTop: 10 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: 10, minHeight: 0 },
  nativeMainRow: { flex: 1, flexDirection: "row", gap: 10, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
  panelFill: { flex: 1, height: "100%", minHeight: 0, overflow: "hidden" },
  separator: { backgroundColor: "rgba(148,163,184,0.18)", width: 6 },
  separatorHorizontal: { backgroundColor: "rgba(148,163,184,0.18)", height: 6 },
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, width: "100%" },
});
