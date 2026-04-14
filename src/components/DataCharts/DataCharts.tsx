import type {} from "../../App";
import type { LeaseData } from "../../types/lease";
import { memo } from "react";
import "./DataCharts.css";
import SortedByFloorLeasePercent from "./SortedByFloorLeasePercent";
import SortedByRentPSFPercent from "./SortedByRentPSFPercent";
import SortedByUnitTypePercent from "./SortedByUnitTypePercent";
import ConcessionDistribution from "./ConcessionDistribution";
import type { UnitFilters } from "../../utils/unitFilters";

type DataChartsType = {
  leasedUnits: string[];
  mode: string;
  unitData: LeaseData | null;
  level: string;
  showData: boolean;
  showRentDistribution: boolean;
  showUnitTypeDistribution: boolean;
  showLevelDistribution: boolean;
  showConcessionDistribution: boolean;
  unitFilters: UnitFilters;
  setUnitFilters: React.Dispatch<React.SetStateAction<UnitFilters>>;
};

const DataCharts = ({
  leasedUnits,
  mode,
  unitData,
  level,
  showData,
  showRentDistribution,
  showUnitTypeDistribution,
  showLevelDistribution,
  showConcessionDistribution,
  unitFilters,
  setUnitFilters,
}: DataChartsType) => {
  return (
    showData && (
      <div className="data-charts">
        {showRentDistribution && (
          <SortedByRentPSFPercent
            unitData={unitData}
            leasedUnits={leasedUnits}
            mode={mode}
            level={level}
            selectedRentPsfFilter={unitFilters.rentPsf}
            setSelectedRentPsfFilter={(next) =>
              setUnitFilters((prev) => ({
                ...prev,
                rentPsf: typeof next === "function" ? next(prev.rentPsf) : next,
              }))
            }
          />
        )}
        {showUnitTypeDistribution && (
          <SortedByUnitTypePercent
            unitData={unitData}
            leasedUnits={leasedUnits}
            mode={mode}
            level={level}
            selectedUnitTypeFilter={unitFilters.unitType}
            setSelectedUnitTypeFilter={(next) =>
              setUnitFilters((prev) => ({
                ...prev,
                unitType: typeof next === "function" ? next(prev.unitType) : next,
              }))
            }
          />
        )}
        {showLevelDistribution && mode === "combined" && (
          <SortedByFloorLeasePercent unitData={unitData} leasedUnits={leasedUnits} />
        )}

        {showConcessionDistribution && (
          <ConcessionDistribution
            unitData={unitData}
            leasedUnits={leasedUnits}
            mode={mode}
            level={level}
            selectedConcessionFilter={unitFilters.concession}
            setSelectedConcessionFilter={(next) =>
              setUnitFilters((prev) => ({
                ...prev,
                concession:
                  typeof next === "function" ? next(prev.concession) : next,
              }))
            }
          />
        )}
      </div>
    )
  );
};

export default memo(DataCharts);
