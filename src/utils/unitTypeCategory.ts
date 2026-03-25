import type { LeaseRow } from "../types/lease";
import type { UnitTypeCategory } from "../types/coloring";

export function classifyUnitTypeCategory(
  row: Pick<LeaseRow, "unitType" | "description">,
): UnitTypeCategory {
  const desc = (row.description ?? "").toLowerCase();

  if (desc.includes("studio")) return "Studio";
  if (desc.includes("3") && desc.includes("bed")) return "3B";
  if (desc.includes("2") && desc.includes("bed")) return "2B";
  if (desc.includes("1") && desc.includes("bed")) return "1B";

  const unitType = (row.unitType ?? "").trim().toUpperCase();
  if (unitType.startsWith("S")) return "Studio";
  if (unitType.startsWith("A")) return "1B";
  if (unitType.startsWith("B")) return "2B";
  if (unitType.startsWith("C")) return "3B";

  return "Unknown";
}