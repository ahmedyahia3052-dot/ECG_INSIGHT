/**
 * Sprint 78 — UI manager contracts (presentation-only state).
 * Business logic and services remain outside this layer.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useToast } from "@/components/interaction/PremiumInteraction";

// ─── Navigation Manager ─────────────────────────────────────────────────────

export type NavigationRoute = {
  href: string;
  icon?: string;
  title: string;
};

export type NavigationManagerValue = {
  activeHref: string;
  registerRoutes: (routes: NavigationRoute[]) => void;
  routes: NavigationRoute[];
  setActiveHref: (href: string) => void;
};

const NavigationManagerContext = createContext<NavigationManagerValue | null>(null);

export function NavigationManagerProvider({ children, initialHref = "/" }: { children: React.ReactNode; initialHref?: string }) {
  const [routes, setRoutes] = useState<NavigationRoute[]>([]);
  const [activeHref, setActiveHref] = useState(initialHref);
  const registerRoutes = useCallback((next: NavigationRoute[]) => setRoutes(next), []);
  const value = useMemo(() => ({ activeHref, registerRoutes, routes, setActiveHref }), [activeHref, registerRoutes, routes]);
  return <NavigationManagerContext.Provider value={value}>{children}</NavigationManagerContext.Provider>;
}

export function useNavigationManager() {
  const ctx = useContext(NavigationManagerContext);
  if (!ctx) throw new Error("useNavigationManager requires NavigationManagerProvider");
  return ctx;
}

// ─── Modal Manager ────────────────────────────────────────────────────────────

export type ModalEntry = { id: string; title?: string };

export type ModalManagerValue = {
  closeModal: (id: string) => void;
  modals: ModalEntry[];
  openModal: (entry: ModalEntry) => void;
  topModal: ModalEntry | null;
};

const ModalManagerContext = createContext<ModalManagerValue | null>(null);

export function ModalManagerProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<ModalEntry[]>([]);
  const openModal = useCallback((entry: ModalEntry) => setModals((stack) => [...stack, entry]), []);
  const closeModal = useCallback((id: string) => setModals((stack) => stack.filter((m) => m.id !== id)), []);
  const topModal = modals.length ? modals[modals.length - 1] : null;
  const value = useMemo(() => ({ closeModal, modals, openModal, topModal }), [closeModal, modals, openModal, topModal]);
  return <ModalManagerContext.Provider value={value}>{children}</ModalManagerContext.Provider>;
}

export function useModalManager() {
  const ctx = useContext(ModalManagerContext);
  if (!ctx) throw new Error("useModalManager requires ModalManagerProvider");
  return ctx;
}

// ─── Dialog Manager ───────────────────────────────────────────────────────────

export type DialogRequest = {
  confirmLabel?: string;
  dismissLabel?: string;
  id: string;
  message: string;
  title: string;
  onConfirm?: () => void;
};

export type DialogManagerValue = {
  activeDialog: DialogRequest | null;
  dismissDialog: () => void;
  requestDialog: (dialog: DialogRequest) => void;
};

const DialogManagerContext = createContext<DialogManagerValue | null>(null);

export function DialogManagerProvider({ children }: { children: React.ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DialogRequest | null>(null);
  const requestDialog = useCallback((dialog: DialogRequest) => setActiveDialog(dialog), []);
  const dismissDialog = useCallback(() => setActiveDialog(null), []);
  const value = useMemo(() => ({ activeDialog, dismissDialog, requestDialog }), [activeDialog, dismissDialog, requestDialog]);
  return <DialogManagerContext.Provider value={value}>{children}</DialogManagerContext.Provider>;
}

export function useDialogManager() {
  const ctx = useContext(DialogManagerContext);
  if (!ctx) throw new Error("useDialogManager requires DialogManagerProvider");
  return ctx;
}

// ─── Toast Manager (facade over production ToastProvider) ─────────────────────

export type ToastManagerValue = ReturnType<typeof useToast>;

const ToastManagerContext = createContext<ToastManagerValue | null>(null);

export function ToastManagerBridge({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  return <ToastManagerContext.Provider value={toast}>{children}</ToastManagerContext.Provider>;
}

export function useToastManager() {
  const ctx = useContext(ToastManagerContext);
  if (!ctx) throw new Error("useToastManager requires ToastManagerBridge inside ToastProvider");
  return ctx;
}

// ─── Drawer Manager ─────────────────────────────────────────────────────────

export type DrawerSide = "left" | "right";

export type DrawerManagerValue = {
  closeDrawer: () => void;
  openDrawer: (side: DrawerSide, id: string) => void;
  openDrawerId: string | null;
  openDrawerSide: DrawerSide | null;
};

const DrawerManagerContext = createContext<DrawerManagerValue | null>(null);

export function DrawerManagerProvider({ children }: { children: React.ReactNode }) {
  const [openDrawerSide, setOpenDrawerSide] = useState<DrawerSide | null>(null);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);
  const openDrawer = useCallback((side: DrawerSide, id: string) => {
    setOpenDrawerSide(side);
    setOpenDrawerId(id);
  }, []);
  const closeDrawer = useCallback(() => {
    setOpenDrawerSide(null);
    setOpenDrawerId(null);
  }, []);
  const value = useMemo(() => ({ closeDrawer, openDrawer, openDrawerId, openDrawerSide }), [closeDrawer, openDrawer, openDrawerId, openDrawerSide]);
  return <DrawerManagerContext.Provider value={value}>{children}</DrawerManagerContext.Provider>;
}

export function useDrawerManager() {
  const ctx = useContext(DrawerManagerContext);
  if (!ctx) throw new Error("useDrawerManager requires DrawerManagerProvider");
  return ctx;
}

// ─── Command Palette Manager ──────────────────────────────────────────────────

export type CommandPaletteManagerValue = {
  close: () => void;
  isOpen: boolean;
  open: () => void;
  toggle: () => void;
};

const CommandPaletteManagerContext = createContext<CommandPaletteManagerValue | null>(null);

export function CommandPaletteManagerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const value = useMemo(() => ({ close, isOpen, open, toggle }), [close, isOpen, open, toggle]);
  return <CommandPaletteManagerContext.Provider value={value}>{children}</CommandPaletteManagerContext.Provider>;
}

export function useCommandPaletteManager() {
  const ctx = useContext(CommandPaletteManagerContext);
  if (!ctx) throw new Error("useCommandPaletteManager requires CommandPaletteManagerProvider");
  return ctx;
}

// ─── Composite UI Foundation Provider ─────────────────────────────────────────

export function UiFoundationProvider({ children, initialHref = "/" }: { children: React.ReactNode; initialHref?: string }) {
  return (
    <NavigationManagerProvider initialHref={initialHref}>
      <ModalManagerProvider>
        <DialogManagerProvider>
          <DrawerManagerProvider>
            <CommandPaletteManagerProvider>
              <ToastManagerBridge>{children}</ToastManagerBridge>
            </CommandPaletteManagerProvider>
          </DrawerManagerProvider>
        </DialogManagerProvider>
      </ModalManagerProvider>
    </NavigationManagerProvider>
  );
}
