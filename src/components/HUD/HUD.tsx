import type { LeaseData } from "../../types/lease";
import "./HUD.css";

type HUDProps = {
  date: string;
  leasedUnits: string[];
  unitData: LeaseData;
  selectedUnit: string | null;
  mode: string;
  viewContext: string;
  setUnitColor: React.Dispatch<React.SetStateAction<string>>;
};
const colors = ["#E23D3D", "#2BB673", "#1B5EAA"];

const HUD = ({
  date,
  leasedUnits,
  unitData,
  selectedUnit,
  mode,
  viewContext,
  setUnitColor,
}: HUDProps) => {
  const inCombined2D = mode === "combined" && viewContext === "2D";
  const selectedRow = selectedUnit ? unitData[selectedUnit] : undefined;
  console.log(selectedRow);
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
                onClick={() => setUnitColor(color)}
              ></div>
            );
          })}
        </div>
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
    </div>
  );
};

export default HUD;
