import type { LeaseData } from "../../types/lease";
import type { UnitMaterialSet } from "./materials";
import { getBucketIndex } from "../../utils/leaseBuckets";
import { parseLeaseDate } from "../../utils/dateUtils";
import type { ColorMode, UnitTypeCategory } from "../../types/coloring";
import { classifyUnitTypeCategory } from "../../utils/unitTypeCategory";

type GetUnitMaterialProps = {
  mode: string;
  viewContext: string;
  colorMode: ColorMode;
  isSelected: boolean;
  isLeased: boolean;
  isAffordable: boolean;
  bucketIndex: number;
  unitTypeCategory: UnitTypeCategory | null;
  materials: UnitMaterialSet;
};
type GetUnitVisualStateProps = {
  unitId: string;
  leaseData: LeaseData;
  currentDate: Date;
  selectedUnit: string | null;
  firstLeaseDate: Date | null;
  totalDays: number;
  bucketCount?: number;
};
type UnitVisualState = {
  row: LeaseData[string] | undefined;
  start: Date | null;
  isLeased: boolean;
  isSelected: boolean;
  isAffordable: boolean;
  bucketIndex: number;
  unitTypeCategory: UnitTypeCategory | null;
};

export function getUnitMaterial({
  mode,
  viewContext,
  colorMode,
  isSelected,
  isLeased,
  isAffordable,
  bucketIndex,
  unitTypeCategory,
  materials,
}: GetUnitMaterialProps) {
  const inCombined = mode === "combined";
  const in2DCombined = inCombined && viewContext === "2D";
  const in3DCombined = inCombined && viewContext === "3D";

  const leasedMaterial3D =
    colorMode === "unit-type" && unitTypeCategory
      ? materials.unitTypeMaterials[unitTypeCategory]
      : bucketIndex >= 0
        ? materials.bucketMaterials[bucketIndex]
        : null;

  const leasedMaterial2D =
    colorMode === "unit-type" && unitTypeCategory
      ? materials.unitTypeOverlayMaterials[unitTypeCategory]
      : bucketIndex >= 0
        ? materials.bucketOverlayMaterials[bucketIndex]
        : null;

  if (in2DCombined) {
    if (isSelected) return materials.selected;
    if (isAffordable) return materials.affordable;
    if (isLeased && leasedMaterial2D) return leasedMaterial2D;
    return materials.combinedBase3D;
  }

  if (in3DCombined) {
    if (isSelected) return materials.selected;
    if (isAffordable) return materials.affordable;
    if (isLeased && leasedMaterial3D) return leasedMaterial3D;
    return materials.combinedBase3D;
  }

  if (isSelected) return materials.selected;
  if (isAffordable) return materials.affordable;
  if (isLeased && leasedMaterial3D) return leasedMaterial3D;
  return materials.base;
}
export function getUnitVisualState({
  unitId,
  leaseData,
  currentDate,
  selectedUnit,
  firstLeaseDate,
  totalDays,
  bucketCount = 5,
}: GetUnitVisualStateProps): UnitVisualState {
  const row = leaseData[unitId];
  const start = row ? parseLeaseDate(row.leaseStartDate) : null;

  const isLeased = !!(start && start <= currentDate);
  const isSelected = selectedUnit === unitId;
  const isAffordable = !!row?.affordable;
  const unitTypeCategory = row ? classifyUnitTypeCategory(row) : null;

  let bucketIndex = -1;
  if (isLeased && start && firstLeaseDate) {
    bucketIndex = getBucketIndex(start, firstLeaseDate, totalDays, bucketCount);
  }

  return {
    row,
    start,
    isLeased,
    isSelected,
    isAffordable,
    bucketIndex,
    unitTypeCategory,
  };
}
