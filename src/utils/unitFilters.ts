import type { LeaseData } from "../types/lease";
import type { UnitTypeLegendCategory } from "../types/coloring";
import { classifyUnitTypeCategory } from "./unitTypeCategory";
import type { BucketKey } from "../components/DataCharts/SortedByRentPSFPercent";

export type UnitFilters = {
  unitType: UnitTypeLegendCategory | null;
  rentPsf: BucketKey | null;
};

export const DEFAULT_UNIT_FILTERS: UnitFilters = {
  unitType: null,
  rentPsf: null,
};

function parsePSF(psf: unknown): number | null {
  if (psf == null) return null;
  const s = String(psf).replace(/,/g, "");
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function bucketForPSF(psf: number): BucketKey {
  if (psf >= 7) return "7p";
  if (psf >= 6) return "6";
  if (psf >= 5) return "5";
  if (psf >= 4) return "4";
  if (psf >= 3) return "3";
  if (psf >= 2) return "2";
  return "1";
}

export function unitMatchesFilters(
  row: LeaseData[string] | undefined,
  filters: UnitFilters,
): boolean {
  if (!row) return false;

  if (filters.unitType) {
    const cat = classifyUnitTypeCategory(row);
    if (cat !== filters.unitType) return false;
  }

  if (filters.rentPsf) {
    const psf = parsePSF(row.psf);
    if (psf == null) return false;
    if (bucketForPSF(psf) !== filters.rentPsf) return false;
  }

  return true;
}

