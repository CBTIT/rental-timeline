import type { LeaseData } from "../../types/lease";
import { memo, useMemo } from "react";
import TimeSlider from "../TimeSlider/TimeSlider";
import ViewContextButton from "../ViewContextButton/ViewContextButton";
import { generateGradient } from "../../utils/colorGradient";
import { type ColorMode, type UnitTypeCategory } from "../../types/coloring";
import LeasedKPI from "../DataCharts/LeasedKPI";
import "./HUD.css";

type HUDProps = {
  date: string;
  leasedUnits: string[];
  unitData: LeaseData;
  selectedUnit: string | null;
  mode: string;
  viewContext: string;
  setViewContext: React.Dispatch<React.SetStateAction<string>>;
  selectedLeaseColor: string;
  defaultLeaseColor: string;
  setSelectedLeaseColor: React.Dispatch<React.SetStateAction<string>>;
  colorMode: ColorMode;
  setColorMode: React.Dispatch<React.SetStateAction<ColorMode>>;
  unitTypeColors: Record<UnitTypeCategory, string>;
  setUnitTypeColors: React.Dispatch<
    React.SetStateAction<Record<UnitTypeCategory, string>>
  >;
  affordableColor: string;
  setAffordableColor: React.Dispatch<React.SetStateAction<string>>;
  bucketCount: number;
  setBucketCount: React.Dispatch<React.SetStateAction<number>>;
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
  days: number;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
};
const presetColors = ["#6366f1", "#0ea5e9", "#f97316", "#ec4899"];
const unitTypeLabels: Record<Exclude<UnitTypeCategory, "Unknown">, string> = {
  Studio: "Studio",
  "1B": "1 Bed",
  "2B": "2 Bed",
  "3B": "3 Bed",
};
const HUD_UNIT_TYPE_ORDER: Exclude<UnitTypeCategory, "Unknown">[] = [
  "Studio",
  "1B",
  "2B",
  "3B",
];

const HUD = ({
  date,
  leasedUnits,
  unitData,
  selectedUnit,
  mode,
  viewContext,
  setViewContext,
  selectedLeaseColor,
  defaultLeaseColor,
  setSelectedLeaseColor,
  colorMode,
  setColorMode,
  unitTypeColors,
  setUnitTypeColors,
  affordableColor,
  setAffordableColor,
  bucketCount,
  setBucketCount,
  level,
  setLevel,
  showData,
  setShowData,
  days,
  currentDay,
  setCurrentDay,
}: HUDProps) => {
  const inCombined2D = mode === "combined" && viewContext === "2D";
  const selectedRow = selectedUnit ? unitData[selectedUnit] : undefined;
  const selectedIsLeasedNow =
    !!selectedUnit && leasedUnits.includes(selectedUnit);
  const isCustomColor =
    selectedLeaseColor !== defaultLeaseColor &&
    !presetColors.includes(selectedLeaseColor.toLowerCase());
  const bucketColors = useMemo(
    () => generateGradient(selectedLeaseColor, bucketCount),
    [selectedLeaseColor, bucketCount],
  );

  const setUnitTypeColor = (category: UnitTypeCategory, color: string) => {
    setUnitTypeColors((prev) => ({ ...prev, [category]: color }));
  };

  return (
    <div className="HUD">
      <div className="date">{date}</div>
      <LeasedKPI leasedUnits={leasedUnits} mode={mode} level={level} />
      <div className="color-selection">
        <div className="hud-color-mode-row">
          <div className="color-selection-title">Color Mode</div>
          <select
            className="hud-color-mode-select-input"
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
            aria-label="Select color mode"
          >
            <option value="lease-date">Lease Date</option>
            <option value="unit-type">Unit Type</option>
          </select>
        </div>

        {colorMode === "lease-date" && (
          <>
            <div className="color-selection-title">
              Select a Unit Display Color
            </div>
            <div className="color-selection-group">
              {presetColors.map((color) => {
                return (
                  <button
                    type="button"
                    className={`color-box ${selectedLeaseColor.toLowerCase() === color.toLowerCase() ? "active" : ""}`}
                    key={color}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedLeaseColor(color)}
                    aria-label={`Select color ${color}`}
                    title={`Select color ${color}`}
                  />
                );
              })}

              <button
                type="button"
                className={`color-box color-default-option ${selectedLeaseColor.toLowerCase() === defaultLeaseColor.toLowerCase() ? "active" : ""}`}
                style={{ backgroundColor: defaultLeaseColor }}
                onClick={() => setSelectedLeaseColor(defaultLeaseColor)}
                aria-label="Reset to default lease color"
                title="Reset to default lease color"
              >
                D
              </button>

              <label
                className={`color-wheel ${isCustomColor ? "active" : ""}`}
                title="Pick custom lease color"
              >
                <span className="color-wheel-text">Custom</span>
                <input
                  type="color"
                  value={selectedLeaseColor}
                  onChange={(e) => setSelectedLeaseColor(e.target.value)}
                  aria-label="Choose custom lease color"
                />
              </label>
            </div>
          </>
        )}

        {colorMode === "unit-type" && (
          <div className="unit-type-color-list">
            {HUD_UNIT_TYPE_ORDER.map((category) => (
              <label className="unit-type-color-item" key={category}>
                <span className="unit-type-color-label">
                  {unitTypeLabels[category]}
                </span>
                <input
                  type="color"
                  value={unitTypeColors[category]}
                  onChange={(e) => setUnitTypeColor(category, e.target.value)}
                  aria-label={`Select ${unitTypeLabels[category]} color`}
                />
              </label>
            ))}

            <label className="unit-type-color-item" key="affordable">
              <span className="unit-type-color-label">Affordable</span>
              <input
                type="color"
                value={affordableColor}
                onChange={(e) => setAffordableColor(e.target.value)}
                aria-label="Select Affordable color"
              />
            </label>
          </div>
        )}

      </div>

      {/* Time Slider - moved to top */}
      {mode !== "table" && (
        <div className="hud-time-slider-container">
          <div className="hud-time-label">Timeline</div>
          <TimeSlider
            days={days}
            currentDay={currentDay}
            setCurrentDay={setCurrentDay}
          />
        </div>
      )}

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

      {/* Time Slider and View Context */}
      {mode !== "table" && (
        <>
          <div className="hud-view-selector">
            <div className="hud-view-title">View</div>
            <div className="hud-view-buttons">
              <ViewContextButton
                text={"2D"}
                onClick={setViewContext}
                isDisabled={viewContext === "2D"}
                isActive={viewContext === "2D"}
              />
              <ViewContextButton
                text={"3D"}
                onClick={setViewContext}
                isDisabled={viewContext === "3D"}
                isActive={viewContext === "3D"}
              />
              <button
                type="button"
                className="hud-view-toggle-btn"
                onClick={() => setShowData(!showData)}
              >
                {showData ? "Hide Data" : "Show Data"}
              </button>
            </div>
          </div>

          {colorMode === "lease-date" && (
            <div className="hud-bucket-selector">
              <div className="hud-bucket-title">
                Popularity Spread: <span>{bucketCount}</span>
              </div>
              <input
                type="range"
                min="3"
                max="7"
                value={bucketCount}
                onChange={(e) => setBucketCount(Number(e.target.value))}
                className="bucket-slider"
              />
              <div className="hud-bucket-legend" aria-hidden="true">
                <div className="hud-bucket-band">
                  {bucketColors.map((color, idx) => (
                    <div
                      key={`bucket-color-${idx}`}
                      className="hud-bucket-band-segment"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="hud-bucket-marks">
                  {bucketColors.map((_, idx) => (
                    <div
                      key={`bucket-mark-${idx}`}
                      className="hud-bucket-mark-item"
                    >
                      <span className="hud-bucket-mark-dot" />
                    </div>
                  ))}
                </div>
                <div className="hud-bucket-end-labels">
                  <span className="hud-bucket-end-label">High</span>
                  <span className="hud-bucket-end-label">Low</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(HUD);
