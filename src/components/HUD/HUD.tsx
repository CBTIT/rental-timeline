import type { LeaseData } from "../../App";
import HUDUnit from "../HUDUnit/HUDUnit";
import "./HUD.css";

type HUDProps = {
  date: string;
  leasedUnits: string[];
  unitData: LeaseData;
  selectedUnit: string | null;
};

const HUD = ({ date, leasedUnits, unitData, selectedUnit }: HUDProps) => {
  const selectedRow = selectedUnit ? unitData[selectedUnit] : undefined;
  const selectedIsLeasedNow =
    !!selectedUnit && leasedUnits.includes(selectedUnit);

  return (
    <div className="HUD">
      <div className="date">{date}</div>

      <div className="leased-units">
        {leasedUnits.map((unitId) => (
          <HUDUnit key={unitId} unit={unitData[unitId]} name={unitId} />
        ))}
      </div>

      {!selectedUnit && (
        <div className="unit-detail">Select a Unit for details</div>
      )}

      {selectedUnit && !selectedRow && (
        <div className="unit-detail">{selectedUnit} — Unleased</div>
      )}

      {selectedUnit && selectedRow && !selectedIsLeasedNow && (
        <div className="unit-detail">{selectedUnit} — Unleased</div>
      )}

      {selectedUnit && selectedRow && selectedIsLeasedNow && (
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
            <div>Rent</div>
            <div className="value">{selectedRow.rent}</div>
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
        </div>
      )}
    </div>
  );
};

export default HUD;
