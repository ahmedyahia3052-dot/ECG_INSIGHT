import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createPortal } from "react-dom";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";

const TOOLTIP_DELAY_MS = 200;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_MIN_WIDTH = 160;
const TOOLTIP_Z_INDEX = 999999;

type Anchor = { height: number; left: number; top: number; width: number };

/** Sprint 33.5 — portal tooltips that escape clipped containers. */
export const EcgWorkstationTooltip = memo(function EcgWorkstationTooltip({
  children,
  description,
  label,
  shortcut,
}: {
  children: React.ReactNode;
  description?: string;
  label: string;
  shortcut?: string;
}) {
  const hostId = useId().replace(/:/g, "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const readAnchor = useCallback(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return null;
    const node = document.getElementById(`ecg-tip-${hostId}`);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
  }, [hostId]);

  const show = useCallback(() => {
    if (Platform.OS !== "web") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAnchor(readAnchor());
      setVisible(true);
    }, TOOLTIP_DELAY_MS);
  }, [readAnchor]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return undefined;
    const reposition = () => setAnchor(readAnchor());
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [readAnchor, visible]);

  const portal =
    visible && anchor && Platform.OS === "web" && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            style={{
              backgroundColor: "rgba(6,10,15,0.98)",
              border: `1px solid ${ECG_COCKPIT_COLORS.accentMuted}`,
              borderRadius: 4,
              boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
              left: Math.min(Math.max(anchor.left + anchor.width / 2, TOOLTIP_MAX_WIDTH / 2 + 8), window.innerWidth - TOOLTIP_MAX_WIDTH / 2 - 8),
              maxWidth: TOOLTIP_MAX_WIDTH,
              minWidth: TOOLTIP_MIN_WIDTH,
              padding: "8px 10px",
              pointerEvents: "none",
              position: "fixed",
              top: Math.max(anchor.top - 8, 8),
              transform: "translate(-50%, -100%)",
              zIndex: TOOLTIP_Z_INDEX,
            }}
          >
            <div style={{ color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: 800, lineHeight: "14px", whiteSpace: "normal", wordBreak: "break-word" }}>
              {label}
            </div>
            {description ? (
              <div style={{ color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: 600, lineHeight: "14px", marginTop: 4, whiteSpace: "normal", wordBreak: "break-word" }}>
                {description}
              </div>
            ) : null}
            {shortcut ? (
              <div style={{ color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: 800, marginTop: 4 }}>
                Shortcut: {shortcut}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <>
      <View
        accessibilityLabel={shortcut ? `${label}. ${description ?? ""} Shortcut ${shortcut}` : label}
        nativeID={`ecg-tip-${hostId}`}
        style={styles.host}
        // @ts-expect-error web hover
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </View>
      {portal}
    </>
  );
});

const styles = StyleSheet.create({
  host: { alignSelf: "flex-start" },
});
