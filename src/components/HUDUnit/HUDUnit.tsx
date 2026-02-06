import type { LeaseRow } from "../../App";

type HUDUnitProps = {
  unit: LeaseRow;
  name: string;
};

const HUDUnit = ({ unit, name }: HUDUnitProps) => {
  return (
    <div className="unit-data">
      <div>{name}</div>
      <div>{unit.unitType}</div>
      <div>{unit.leaseStartDate}</div>
    </div>
  );
};

export default HUDUnit;
