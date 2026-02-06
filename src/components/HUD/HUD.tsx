import type { LeaseData } from "../../App";
import HUDUnit from "../HUDUnit/HUDUnit";
import "./HUD.css";

type HUDProps = {
  date: string;
  leasedUnits: string[];
  unitData: LeaseData;
};

const HUD = ({ date, leasedUnits, unitData }: HUDProps) => {
  return (
    <div className="HUD">
      <div className="date">{date}</div>
      <div className="leased-units">
        {leasedUnits.map((unit) => {
          return <HUDUnit key={unit} unit={unitData[unit]} name={unit} />;
        })}
      </div>
    </div>
  );
};

export default HUD;
