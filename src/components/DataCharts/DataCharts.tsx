import type { LeaseData } from "../../App";
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
};

const DataCharts = ({
  leasedUnits,
  mode,
  unitData,
  level,
  showData,
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

export default DataCharts;
