import { useEffect, useState } from "react";

type HUDprops = {
  hoveredUnitId: string | null;
};

type UnitData = {
  id: string;
  label: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
};

const HUD = ({ hoveredUnitId }: HUDprops) => {
  const [unitDataMap, setUnitDataMap] = useState<Record<string, UnitData>>({});
  const hovered = hoveredUnitId ? unitDataMap[hoveredUnitId] : null;

  useEffect(() => {
    fetch("data/unit_data.json")
      .then((data) => data.json())
      .then(setUnitDataMap);
  }, []);
  return (
    <div className="hud">
      {hovered ? (
        <>
          <div>{hovered.label}</div>
          <div>
            {hovered.beds} BR · {hovered.baths} BA · {hovered.sqft} sqft
          </div>
          {hovered.rent && <div>${hovered.rent}/mo</div>}
        </>
      ) : (
        <div>Hover a unit</div>
      )}
    </div>
  );
};

export default HUD;
