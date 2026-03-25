export type ColorMode = "lease-date" | "unit-type";

export type UnitTypeCategory = "Studio" | "1B" | "2B" | "3B" | "Unknown";
export type UnitTypeLegendCategory = Exclude<UnitTypeCategory, "Unknown">;

export const UNIT_TYPE_ORDER: UnitTypeCategory[] = [
  "Studio",
  "1B",
  "2B",
  "3B",
  "Unknown",
];

export const DEFAULT_UNIT_TYPE_COLORS: Record<UnitTypeCategory, string> = {
  Studio: "#06b6d4",
  "1B": "#22c55e",
  "2B": "#f59e0b",
  "3B": "#ef4444",
  Unknown: "#8b5cf6",
};

export const DEFAULT_AFFORDABLE_COLOR = "#a7bed3";