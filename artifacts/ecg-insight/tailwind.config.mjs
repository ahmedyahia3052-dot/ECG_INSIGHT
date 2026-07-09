import { boltTailwindTheme } from "./design-system/tailwind/theme.mjs";

/** Merged Tailwind config — Bolt theme + ECG Insight content paths. Reference for future web tooling. */
export default {
  content: [
    "./app/**/*.{tsx,ts}",
    "./components/**/*.{tsx,ts}",
    "./design-system/**/*.{tsx,ts}",
    "./presentation/**/*.{tsx,ts}",
    "./bolt-ui/**/*.{tsx,ts}",
  ],
  theme: boltTailwindTheme,
};
