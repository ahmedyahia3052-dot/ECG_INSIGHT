import React, { type ReactNode, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

const LAYOUT_KEY = "ecg-insight:copilot-panel-layout";

type CopilotResizableWorkspaceProps = {
  chat: ReactNode;
  clinicalPanel: ReactNode;
  sidebar: ReactNode;
};

type SavedLayout = {
  clinicalCollapsed?: boolean;
  clinicalSize?: number;
  sidebarSize?: number;
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

export function CopilotResizableWorkspace({ chat, clinicalPanel, sidebar }: CopilotResizableWorkspaceProps) {
  const [layout, setLayout] = useState<SavedLayout>(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  if (Platform.OS === "web") {
    return (
      <WebResizableWorkspace
        chat={chat}
        clinicalPanel={clinicalPanel}
        layout={layout}
        onLayoutChange={setLayout}
        sidebar={sidebar}
      />
    );
  }

  return (
    <View style={styles.nativeRow}>
      <View style={[styles.nativeSidebar, { width: layout.sidebarSize ?? 300 }]}>{sidebar}</View>
      <View style={styles.nativeChat}>{chat}</View>
      {!layout.clinicalCollapsed ? <View style={[styles.nativeClinical, { width: layout.clinicalSize ?? 300 }]}>{clinicalPanel}</View> : null}
    </View>
  );
}

function WebResizableWorkspace({
  chat,
  clinicalPanel,
  layout,
  onLayoutChange,
  sidebar,
}: CopilotResizableWorkspaceProps & {
  layout: SavedLayout;
  onLayoutChange: (layout: SavedLayout) => void;
}) {
  const [panels, setPanels] = useState<null | typeof import("react-resizable-panels")>(null);

  useEffect(() => {
    void import("react-resizable-panels").then(setPanels);
  }, []);

  if (!panels) {
    return (
      <View style={styles.nativeRow}>
        <View style={styles.nativeSidebar}>{sidebar}</View>
        <View style={styles.nativeChat}>{chat}</View>
        <View style={styles.nativeClinical}>{clinicalPanel}</View>
      </View>
    );
  }

  const { Group, Panel, Separator } = panels;

  return (
    <Group id="ecg-copilot-workspace" orientation="horizontal" style={{ display: "flex", flex: 1, height: "100%", minHeight: 0, width: "100%" }}>
      <Panel defaultSize={22} id="copilot-sidebar" maxSize={35} minSize={16}>
        <View style={styles.panelFill}>{sidebar}</View>
      </Panel>
      <Separator style={{ width: 6, backgroundColor: "rgba(148,163,184,0.18)" }} />
      <Panel defaultSize={layout.clinicalCollapsed ? 78 : 56} id="copilot-chat" minSize={35}>
        <View style={styles.panelFill}>{chat}</View>
      </Panel>
      {!layout.clinicalCollapsed ? (
        <>
          <Separator style={{ width: 6, backgroundColor: "rgba(148,163,184,0.18)" }} />
          <Panel defaultSize={22} id="copilot-clinical" maxSize={35} minSize={16}>
            <View style={styles.panelFill}>{clinicalPanel}</View>
          </Panel>
        </>
      ) : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  handle: {
    backgroundColor: "rgba(148,163,184,0.18)",
    width: 6,
  },
  nativeChat: { flex: 1, minWidth: 0 },
  nativeClinical: { flexShrink: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: 12, minHeight: 0, overflow: "hidden" },
  nativeSidebar: { flexShrink: 0 },
  panelFill: { flex: 1, height: "100%", minHeight: 0, overflow: "hidden" },
  webGroup: { flex: 1, minHeight: 0, width: "100%" },
});

export function useClinicalPanelCollapse() {
  const [layout, setLayout] = useState<SavedLayout>(() => loadLayout());
  const toggleClinicalCollapse = () => setLayout((current) => ({ ...current, clinicalCollapsed: !current.clinicalCollapsed }));
  return { clinicalCollapsed: !!layout.clinicalCollapsed, toggleClinicalCollapse };
}
