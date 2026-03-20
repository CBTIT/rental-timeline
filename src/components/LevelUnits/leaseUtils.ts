import type { LeaseData } from "../../types/lease";
import type { UnitMaterialSet } from "./materials";
import { getBucketIndex } from "../../utils/leaseBuckets";
import { parseLeaseDate } from "../../utils/dateUtils";

type GetUnitMaterialProps = {
  mode: string;
  viewContext: string;
  isSelected: boolean;
  isLeased: boolean;
  isAffordable: boolean;
  bucketIndex: number;
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
};

export function getUnitMaterial({
  mode,
  viewContext,
  isSelected,
  isLeased,
  isAffordable,
  bucketIndex,
  materials,
}: GetUnitMaterialProps) {
  const inCombined = mode === "combined";
  const in2DCombined = inCombined && viewContext === "2D";
  const in3DCombined = inCombined && viewContext === "3D";

  if (in2DCombined) {
    if (isSelected) return materials.selected;
    if (isLeased && bucketIndex >= 0)
      return materials.bucketOverlayMaterials[bucketIndex];
    return materials.combinedBase3D;
  }

  if (in3DCombined) {
    if (isSelected) return materials.selected;
    if (isLeased && bucketIndex >= 0)
      return materials.bucketMaterials[bucketIndex];
    return materials.combinedBase3D;
  }

  if (isSelected) return materials.selected;
  if (isLeased && bucketIndex >= 0)
    return materials.bucketMaterials[bucketIndex];
  if (isAffordable) return materials.affordable;
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
  };
}
