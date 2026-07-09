export const zIndexLayers = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  drawer: 400,
  dialog: 500,
  toast: 600,
  tooltip: 700,
  monitorHud: 800,
  criticalAlert: 900,
} as const;

export type ZIndexLayer = keyof typeof zIndexLayers;
