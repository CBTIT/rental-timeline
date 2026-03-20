import type { LeaseData } from "../../types/lease";
import { memo } from "react";
import "./HUD.css";

type HUDProps = {
  date: string;
  leasedUnits: string[];
  unitData: LeaseData;
  selectedUnit: string | null;
  mode: string;
  viewContext: string;
  setSelectedLeaseColor: React.Dispatch<React.SetStateAction<string>>;
  bucketCount: number;
  setBucketCount: React.Dispatch<React.SetStateAction<number>>;
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
};
const colors = ["#E23D3D", "#2BB673", "#1B5EAA"];

const HUD = ({
  date,
  leasedUnits,
  unitData,
  selectedUnit,
  mode,
  viewContext,
  setSelectedLeaseColor,
  bucketCount,
  setBucketCount,
  level,
  setLevel,
  setMode,
  showData,
  setShowData,
}: HUDProps) => {
  const inCombined2D = mode === "combined" && viewContext === "2D";
  const selectedRow = selectedUnit ? unitData[selectedUnit] : undefined;
  const selectedIsLeasedNow =
    !!selectedUnit && leasedUnits.includes(selectedUnit);

  return (
    <div className="HUD">
      <div className="date">{date}</div>
      <div className="color-selection">
        <div className="color-selection-title">Select a Unit Display Color</div>
        <div className="color-selection-group">
          {colors.map((color) => {
            return (
              <div
                className="color-box"
                key={color}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedLeaseColor(color)}
              ></div>
            );
          })}
        </div>
      </div>
      <div className="bucket-selection">
        <div className="bucket-selection-title">
          Gradient Buckets: <span>{bucketCount}</span>
        </div>
        <input
          type="range"
          min="3"
          max="7"
          value={bucketCount}
          onChange={(e) => setBucketCount(Number(e.target.value))}
          className="bucket-slider"
        />
      </div>
      {/* <div className="leased-units">
        {leasedUnits.map((unitId) => (
          <HUDUnit key={unitId} unit={unitData[unitId]} name={unitId} />
        ))}
      </div> */}
      {inCombined2D && (
        <div className="unit-detail">
          Change mode to 3D for unit selection details
        </div>
      )}
      {!inCombined2D && !selectedUnit && (
        <div className="unit-detail">Select a Unit for details</div>
      )}

      {!inCombined2D && selectedUnit && !selectedRow && (
        <div className="unit-detail">{selectedUnit} — Unleased</div>
      )}

      {!inCombined2D && selectedUnit && selectedRow && !selectedIsLeasedNow && (
        <div className="unit-detail">{selectedUnit} — Unleased</div>
      )}

      {!inCombined2D && selectedUnit && selectedRow && selectedIsLeasedNow && (
        <div className="unit-detail">
          <div className="unit-detail-row">
            <div>Unit</div>
            <div className="value">{selectedUnit}</div>
          </div>
          <div className="unit-detail-row">
            <div>Type</div>
            <div className="value">{selectedRow.unitType}</div>
          </div>
          <div className="unit-detail-row">
            <div>Description</div>
            <div className="value">{selectedRow.description}</div>
          </div>
          <div className="unit-detail-row">
            <div>Area</div>
            <div className="value">{selectedRow.unitArea}</div>
          </div>
          <div className="unit-detail-row">
            <div>Lease Start</div>
            <div className="value">{selectedRow.leaseStartDate}</div>
          </div>
          <div className="unit-detail-row">
            <div>Lease End</div>
            <div className="value">{selectedRow.leaseEndDate}</div>
          </div>
          <div className="unit-detail-row">
            <div>Rent</div>
            <div className="value">{selectedRow.rent}</div>
          </div>
          <div className="unit-detail-row">
            <div>Leasing Associate</div>
            <div className="value">{selectedRow.leasingAssociate}</div>
          </div>
          <div className="unit-detail-row">
            <div>Affordable</div>
            <div className="value">{selectedRow.affordable ? "Yes" : "No"}</div>
          </div>
        </div>
      )}

      {/* Level Selector - Only show in levels mode */}
      {mode === "levels" && (
        <div className="hud-level-selector">
          <div className="hud-level-title">Level</div>
          <div className="hud-level-buttons">
            {["1", "2", "3", "4", "5", "6", "7", "8"].map((lvl) => (
              <button
                key={lvl}
                className={`hud-level-btn ${level === lvl ? "active" : ""}`}
                onClick={() => setLevel(lvl)}
              >
                L{lvl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="hud-mode-selector">
        <div className="hud-mode-title">View Mode</div>
        <div className="hud-mode-buttons">
          <button
            className={`hud-mode-btn ${mode === "levels" ? "active" : ""}`}
            onClick={() => setMode("levels")}
          >
            Levels
          </button>
          <button
            className={`hud-mode-btn ${mode === "combined" ? "active" : ""}`}
            onClick={() => setMode("combined")}
          >
            Combined
          </button>
          <button
            className={`hud-mode-btn ${mode === "table" ? "active" : ""}`}
            onClick={() => setMode("table")}
          >
            Table
          </button>
        </div>
        {mode !== "table" && (
          <button
            className="hud-mode-btn"
            onClick={() => setShowData(showData ? false : true)}
            style={{ marginTop: "var(--space-xs)" }}
          >
            {showData ? "Hide Data" : "Show Data"}
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(HUD);
