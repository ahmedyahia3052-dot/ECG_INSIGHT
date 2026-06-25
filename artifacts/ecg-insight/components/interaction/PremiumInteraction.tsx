import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import Svg, { Polyline } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useVisualExperience } from "@/context/VisualExperienceContext";

export const animationPresets = {
  cardReveal: { duration: 280, easing: Easing.out(Easing.cubic), translateY: 14 },
  fadeIn: { duration: 260, easing: Easing.out(Easing.cubic) },
  heroReveal: { duration: 340, easing: Easing.out(Easing.cubic), translateY: 18 },
  listStagger: 55,
  scaleIn: { damping: 16, stiffness: 220 },
  slideLeft: { duration: 280, easing: Easing.out(Easing.cubic), translateX: 18 },
  slideUp: { duration: 280, easing: Easing.out(Easing.cubic), translateY: 12 },
};

type ToastTone = "critical" | "error" | "info" | "success" | "warning";

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastInput {
  action?: ToastAction;
  message: string;
  title: string;
  type: ToastTone;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
  success: (title: string, message: string, action?: ToastAction) => void;
  error: (title: string, message: string, action?: ToastAction) => void;
  warning: (title: string, message: string, action?: ToastAction) => void;
  info: (title: string, message: string, action?: ToastAction) => void;
  critical: (title: string, message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({
  critical: () => {},
  error: () => {},
  info: () => {},
  showToast: () => {},
  success: () => {},
  warning: () => {},
});

function toneColor(colors: ReturnType<typeof useColors>, tone: ToastTone) {
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "critical" || tone === "error") return colors.destructive;
  return colors.primary;
}

function ToastCard({ onDismiss, toast }: { onDismiss: (id: string) => void; toast: ToastItem }) {
  const colors = useColors();
  const { effectiveMotionEnabled } = useVisualExperience();
  const translate = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const tint = toneColor(colors, toast.type);

  useEffect(() => {
    if (effectiveMotionEnabled) {
      Animated.parallel([
        Animated.timing(opacity, { duration: 220, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
        Animated.spring(translate, { damping: 18, stiffness: 220, toValue: 0, useNativeDriver: true }),
        Animated.timing(progress, { duration: toast.type === "critical" ? 7000 : 4500, easing: Easing.linear, toValue: 0, useNativeDriver: false }),
      ]).start();
    } else {
      opacity.setValue(1);
      translate.setValue(0);
    }
    const timer = setTimeout(() => onDismiss(toast.id), toast.type === "critical" ? 7200 : 4700);
    return () => clearTimeout(timer);
  }, [effectiveMotionEnabled, onDismiss, opacity, progress, toast.id, toast.type, translate]);

  const handleSwipe = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END && Math.abs(event.nativeEvent.translationX) > 70) {
      onDismiss(toast.id);
    }
  };

  return (
    <PanGestureHandler activeOffsetX={[-14, 14]} onHandlerStateChange={handleSwipe}>
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY: translate }] }]}>
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.toastChrome, { borderColor: tint + "44" }]}>
          <View style={[styles.toastIcon, { backgroundColor: tint + "20" }]}>
            <Feather name={toast.type === "success" ? "check" : toast.type === "info" ? "info" : "alert-triangle"} size={16} color={tint} />
          </View>
          <View style={styles.toastBody}>
            <Text style={[styles.toastTitle, { color: colors.text }]}>{toast.title}</Text>
            <Text style={[styles.toastMessage, { color: colors.textSecondary }]}>{toast.message}</Text>
            {toast.action ? (
              <Pressable accessibilityRole="button" onPress={toast.action.onPress} style={styles.toastAction}>
                <Text style={[styles.toastActionText, { color: tint }]}>{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => onDismiss(toast.id)} style={styles.toastClose}>
            <Feather name="x" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Animated.View style={[styles.toastProgress, { backgroundColor: tint, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </Animated.View>
    </PanGestureHandler>
  );
}

function InlineToast({ message, title, type }: ToastInput) {
  const colors = useColors();
  const tint = toneColor(colors, type);
  return (
    <View style={styles.toast}>
      <View style={[styles.toastChrome, { borderColor: tint + "44" }]}>
        <View style={[styles.toastIcon, { backgroundColor: tint + "20" }]}>
          <Feather name={type === "success" ? "check" : type === "info" ? "info" : "alert-triangle"} size={16} color={tint} />
        </View>
        <View style={styles.toastBody}>
          <Text style={[styles.toastTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.toastMessage, { color: colors.textSecondary }]}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

export function SuccessToast(props: Omit<ToastInput, "type">) {
  return <InlineToast {...props} type="success" />;
}

export function ErrorToast(props: Omit<ToastInput, "type">) {
  return <InlineToast {...props} type="error" />;
}

export function WarningToast(props: Omit<ToastInput, "type">) {
  return <InlineToast {...props} type="warning" />;
}

export function InfoToast(props: Omit<ToastInput, "type">) {
  return <InlineToast {...props} type="info" />;
}

export function CriticalToast(props: Omit<ToastInput, "type">) {
  return <InlineToast {...props} type="critical" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((items) => [{ ...toast, id }, ...items].slice(0, 4));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    critical: (title, message, action) => showToast({ action, message, title, type: "critical" }),
    error: (title, message, action) => showToast({ action, message, title, type: "error" }),
    info: (title, message, action) => showToast({ action, message, title, type: "info" }),
    showToast,
    success: (title, message, action) => showToast({ action, message, title, type: "success" }),
    warning: (title, message, action) => showToast({ action, message, title, type: "warning" }),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.toastLayer}>
        {toasts.map((toast) => <ToastCard key={toast.id} onDismiss={dismiss} toast={toast} />)}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function PageTransition({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { effectiveMotionEnabled } = useVisualExperience();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!effectiveMotionEnabled) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { duration: 300, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(translateY, { duration: 300, easing: Easing.out(Easing.cubic), toValue: 0, useNativeDriver: true }),
    ]).start();
    return () => {
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [effectiveMotionEnabled, opacity, translateY]);

  return <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export function PremiumButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
  state = "default",
  style,
}: {
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  loading?: boolean;
  onPress?: () => void;
  state?: "default" | "error" | "success";
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const { triggerHaptic } = useVisualExperience();
  const scale = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);
  const tint = state === "success" ? colors.success : state === "error" ? colors.destructive : colors.primary;

  function pressScale(toValue: number) {
    Animated.spring(scale, { damping: 14, stiffness: 240, toValue, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        android_ripple={{ color: "rgba(255,255,255,0.22)" }}
        disabled={disabled || loading}
        onPress={() => {
          void triggerHaptic(state === "error" ? "error" : state === "success" ? "success" : "selection");
          onPress?.();
        }}
        onPressIn={() => pressScale(0.97)}
        onPressOut={() => pressScale(1)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.premiumButton,
          {
            backgroundColor: tint,
            borderColor: focused ? "#FFFFFF" : tint,
            opacity: disabled ? 0.52 : 1,
            shadowColor: tint,
          },
        ]}
      >
        {loading ? <MiniEcgLoader color="#fff" /> : icon ? <Feather name={icon} size={17} color="#fff" /> : null}
        <Text style={styles.premiumButtonText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function MiniEcgLoader({ color }: { color: string }) {
  return (
    <Svg height={18} viewBox="0 0 80 24" width={42}>
      <Polyline fill="none" points="0,12 14,12 18,5 24,20 30,3 36,12 80,12" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </Svg>
  );
}

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return <SkeletonBlock height={132} style={[styles.skeletonCard, style]} />;
}

export function SkeletonAvatar() {
  return <SkeletonBlock height={52} style={styles.skeletonAvatar} />;
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.skeletonStack}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonPatient() {
  return (
    <View style={styles.skeletonPatient}>
      <SkeletonAvatar />
      <View style={styles.skeletonPatientBody}>
        <SkeletonBlock height={18} />
        <SkeletonBlock height={14} style={{ width: "72%" }} />
        <SkeletonBlock height={14} style={{ width: "52%" }} />
      </View>
    </View>
  );
}

export function SkeletonECG() {
  return (
    <View style={styles.skeletonEcg}>
      <SkeletonBlock height={22} style={{ width: "46%" }} />
      <SkeletonWave />
      <SkeletonBlock height={16} style={{ width: "68%" }} />
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={styles.skeletonStack}>
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} style={styles.skeletonGridCard} />)}
      </View>
      <SkeletonECG />
      <SkeletonList count={3} />
    </View>
  );
}

function SkeletonBlock({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const { effectiveMotionEnabled } = useVisualExperience();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!effectiveMotionEnabled) return;
    const loop = Animated.loop(Animated.timing(shimmer, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [effectiveMotionEnabled, shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-180, 320] });
  return (
    <View style={[styles.skeletonBlock, { backgroundColor: colors.muted, height }, style]}>
      <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX }] }]}>
        <LinearGradient colors={["transparent", colors.primary + "18", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

function SkeletonWave() {
  const colors = useColors();
  return (
    <View style={styles.skeletonWave}>
      <Svg height={68} viewBox="0 0 240 68" width="100%">
        <Polyline fill="none" points="0,34 48,34 58,14 68,54 78,8 88,34 140,34 154,24 168,44 182,34 240,34" stroke={colors.primary + "44"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      </Svg>
    </View>
  );
}

export function PremiumRefreshControl({ onRefresh, refreshing }: { onRefresh: () => void | Promise<void>; refreshing: boolean }) {
  const colors = useColors();
  const { triggerHaptic } = useVisualExperience();
  return (
    <RefreshControl
      colors={[colors.primary, colors.accent]}
      onRefresh={() => {
        void triggerHaptic("selection");
        void onRefresh();
      }}
      progressBackgroundColor={colors.surface}
      refreshing={refreshing}
      tintColor={colors.primary}
      title="Refreshing ECG data..."
      titleColor={colors.textSecondary}
    />
  );
}

export function SwipeActionRow({
  children,
  leftLabel = "Open",
  onLeft,
  onRight,
  rightLabel = "Dismiss",
}: {
  children: React.ReactNode;
  leftLabel?: string;
  onLeft?: () => void;
  onRight?: () => void;
  rightLabel?: string;
}) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const { triggerHaptic } = useVisualExperience();

  const handleSwipe = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state !== State.END) return;
    const x = event.nativeEvent.translationX;
    if (x > 72 && onLeft) {
      void triggerHaptic("selection");
      onLeft();
    }
    if (x < -72 && onRight) {
      void triggerHaptic("warning");
      onRight();
    }
    Animated.spring(translateX, { damping: 18, stiffness: 220, toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.swipeShell}>
      <View style={styles.swipeActions}>
        <Text style={[styles.swipeLabel, { color: colors.success }]}>{leftLabel}</Text>
        <Text style={[styles.swipeLabel, { color: colors.destructive }]}>{rightLabel}</Text>
      </View>
      <PanGestureHandler activeOffsetX={[-16, 16]} onGestureEvent={Animated.event([{ nativeEvent: { translationX: translateX } }], { useNativeDriver: true })} onHandlerStateChange={handleSwipe}>
        <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
      </PanGestureHandler>
    </View>
  );
}

export function BottomSheet({
  children,
  onClose,
  visible,
}: {
  children: React.ReactNode;
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(420)).current;

  useEffect(() => {
    Animated.spring(translate, { damping: 22, stiffness: 180, toValue: visible ? 0 : 420, useNativeDriver: true }).start();
  }, [translate, visible]);

  const handleSwipe = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END && event.nativeEvent.translationY > 70) onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close bottom sheet" onPress={onClose} style={styles.modalBackdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetKeyboard}>
        <PanGestureHandler activeOffsetY={[-12, 12]} onHandlerStateChange={handleSwipe}>
          <Animated.View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.gradientBorder, transform: [{ translateY: translate }] }]}>
            <View style={[styles.dragIndicator, { backgroundColor: colors.textSecondary }]} />
            {children}
          </Animated.View>
        </PanGestureHandler>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ActionSheet(props: React.ComponentProps<typeof BottomSheet>) {
  return <BottomSheet {...props} />;
}

export function PremiumModal({
  children,
  onClose,
  visible,
}: {
  children: React.ReactNode;
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useColors();
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.centerModalWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close modal" onPress={onClose} style={styles.modalBackdrop} />
        <View style={[styles.premiumModal, { backgroundColor: colors.surface, borderColor: colors.gradientBorder }]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxHeight: "86%",
    padding: 18,
  },
  centerModalWrap: { alignItems: "center", flex: 1, justifyContent: "center", padding: 18 },
  dragIndicator: { alignSelf: "center", borderRadius: 999, height: 5, opacity: 0.5, width: 44 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.52)" },
  premiumButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  premiumButtonText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  premiumModal: { borderRadius: 24, borderWidth: 1, gap: 12, maxWidth: 520, padding: 18, width: "100%" },
  sheetKeyboard: { flex: 1, justifyContent: "flex-end" },
  skeletonAvatar: { borderRadius: 999, width: 52 },
  skeletonBlock: { borderRadius: 16, overflow: "hidden" },
  skeletonCard: { borderRadius: 20 },
  skeletonEcg: { borderRadius: 22, gap: 12, overflow: "hidden", padding: 14 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skeletonGridCard: { flex: 1, minWidth: "47%" },
  skeletonPatient: { alignItems: "center", flexDirection: "row", gap: 12 },
  skeletonPatientBody: { flex: 1, gap: 8 },
  skeletonShimmer: { bottom: 0, position: "absolute", top: 0, width: 120 },
  skeletonStack: { gap: 12 },
  skeletonWave: { borderRadius: 18, overflow: "hidden" },
  swipeActions: { ...StyleSheet.absoluteFillObject, alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18 },
  swipeLabel: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "uppercase" },
  swipeShell: { overflow: "hidden", position: "relative" },
  toast: {
    borderRadius: 22,
    elevation: 16,
    maxWidth: 420,
    overflow: "hidden",
    shadowColor: "#00E5FF",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: "100%",
  },
  toastAction: { alignSelf: "flex-start", marginTop: 6 },
  toastActionText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  toastBody: { flex: 1 },
  toastChrome: { alignItems: "flex-start", backgroundColor: "rgba(15,23,42,0.86)", borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  toastClose: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  toastIcon: { alignItems: "center", borderRadius: 12, height: 32, justifyContent: "center", width: 32 },
  toastLayer: { gap: 10, left: 14, position: "absolute", right: 14, top: Platform.OS === "web" ? 18 : 54, zIndex: 2000 },
  toastMessage: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  toastProgress: { bottom: 0, height: 3, left: 0, position: "absolute" },
  toastTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
});

