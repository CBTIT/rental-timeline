import type { LeaseData } from "../../types/lease";
import type { UnitMaterialSet } from "./materials";

type GetUnitMaterialProps = {
  mode: string;
  viewContext: string;
  isSelected: boolean;
  isLeased: boolean;
  isAffordable: boolean;
  materials: UnitMaterialSet;
};
type GetUnitVisualStateProps = {
  unitId: string;
  leaseData: LeaseData;
  currentDate: Date;
  selectedUnit: string | null;
};
type UnitVisualState = {
  row: LeaseData[string] | undefined;
  start: Date | null;
  isLeased: boolean;
  isSelected: boolean;
  isAffordable: boolean;
};

function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function getUnitMaterial({
  mode,
  viewContext,
  isSelected,
  isLeased,
  isAffordable,
  materials,
}: GetUnitMaterialProps) {
  const inCombined = mode === "combined";
  const in2DCombined = inCombined && viewContext === "2D";
  const in3DCombined = inCombined && viewContext === "3D";

  if (in2DCombined) {
    if (isSelected) return materials.selected;
    if (isLeased) return materials.overlayLeased;
    return materials.combinedBase3D;
  }

  if (in3DCombined) {
    if (isSelected) return materials.selected;
    if (isLeased) return materials.leased;
    return materials.combinedBase3D;
  }

  if (isSelected) return materials.selected;
  if (isLeased) return materials.leased;
  if (isAffordable) return materials.affordable;
  return materials.base;
}
export function getUnitVisualState({
  unitId,
  leaseData,
  currentDate,
  selectedUnit,
}: GetUnitVisualStateProps): UnitVisualState {
  const row = leaseData[unitId];
  const start = row ? parseLeaseDate(row.leaseStartDate) : null;

  const isLeased = !!(start && start <= currentDate);
  const isSelected = selectedUnit === unitId;
  const isAffordable = !!row?.affordable;

  return {
    row,
    start,
    isLeased,
    isSelected,
    isAffordable,
  };
}
