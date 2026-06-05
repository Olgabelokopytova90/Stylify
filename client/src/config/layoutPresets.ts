import type { BodyPreset } from "./bodyPresets";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type LayoutPresetConfig = {
  top: Rect;
  bottom: Rect;
  outerwear: Rect;
};

export const LAYOUT_PRESETS: Record<BodyPreset, LayoutPresetConfig> = {
  rectangle: {
    top: { top: 11, left: 10, width: 80, height: 55 },
    bottom: { top: 34, left: 10, width: 81, height: 66 },
    outerwear: { top: 6.5, left: 10, width: 80, height: 55 },
  },

  pear: {
    top: { top: 11, left: 12, width: 76, height: 52 },
    bottom: { top: 34, left: 8, width: 85, height: 68 },
    outerwear: { top: 6.5, left: 10, width: 80, height: 56 },
  },

  hourglass: {
    top: { top: 11, left: 10, width: 80, height: 54 },
    bottom: { top: 34, left: 10, width: 81, height: 67 },
    outerwear: { top: 6.5, left: 10, width: 80, height: 56 },
  },

  apple: {
    top: { top: 10, left: 8, width: 84, height: 57 },
    bottom: { top: 35, left: 10, width: 80, height: 64 },
    outerwear: { top: 6, left: 8, width: 84, height: 58 },
  },
};