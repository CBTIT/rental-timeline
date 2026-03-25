import type {} from "../../App";
import type { LeaseData } from "../../types/lease";
import { memo } from "react";
import type { UnitTypeLegendCategory } from "../../types/coloring";
import "./DataCharts.css";
import LeasedKPI from "./LeasedKPI";
import SortedByFloorLeasePercent from "./SortedByFloorLeasePercent";
import SortedByRentPSFPercent from "./SortedByRentPSFPercent";
import SortedByUnitTypePercent from "./SortedByUnitTypePercent";

type DataChartsType = {
  leasedUnits: string[];
  mode: string;
  unitData: LeaseData | null;
  level: string;
  showData: boolean;
  selectedUnitTypeFilter: UnitTypeLegendCategory | null;
  setSelectedUnitTypeFilter: React.Dispatch<
    React.SetStateAction<UnitTypeLegendCategory | null>
  >;
};

const DataCharts = ({
  leasedUnits,
  mode,
  unitData,
  level,
  showData,
  selectedUnitTypeFilter,
  setSelectedUnitTypeFilter,
}: DataChartsType) => {
  return (
    showData && (
      <div className="data-charts">
        <LeasedKPI leasedUnits={leasedUnits} mode={mode} level={level} />
        <SortedByRentPSFPercent
          unitData={unitData}
          leasedUnits={leasedUnits}
          mode={mode}
          level={level}
        />
        <SortedByUnitTypePercent
          unitData={unitData}
          leasedUnits={leasedUnits}
          mode={mode}
          level={level}
          selectedUnitTypeFilter={selectedUnitTypeFilter}
          setSelectedUnitTypeFilter={setSelectedUnitTypeFilter}
        />
        {mode === "combined" && (
          <SortedByFloorLeasePercent
            unitData={unitData}
            leasedUnits={leasedUnits}
          />
        )}
      </div>
    )
  );
};

export default memo(DataCharts);
