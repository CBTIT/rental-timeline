import { useEffect, useMemo, useState } from "react";
import "./LeasedKPI.css";

type FloorCountRow = { level: string; label: string; unitCount: number };

type Props = {
  leasedUnits: string[];
  mode: string; // "levels" | "combined" | "table"
  level: string; // selected level
};

function levelFromUnitId(unitId: string): string {
  const t = String(unitId).trim();
  const m = t.match(/^(\d)/); // "303" => "3"
  return m ? m[1] : "unknown";
}

export default function LeasedKPI({ leasedUnits, mode, level }: Props) {
  const [floorCounts, setFloorCounts] = useState<FloorCountRow[] | null>(null);
  const base = import.meta.env.BASE_URL;
  useEffect(() => {
    fetch(base + "data/floor_unitCount.json")
      .then((r) => r.json())
      .then((data) => setFloorCounts(data));
  }, []);

  const floorTotals = useMemo(() => {
    const map: Record<string, number> = {};
    if (!floorCounts) return map;
    for (const r of floorCounts) map[r.level] = Number(r.unitCount) || 0;
    return map;
  }, [floorCounts]);

  const buildingTotal = useMemo(() => {
    if (!floorCounts) return 0;
    return floorCounts.reduce((sum, r) => sum + (Number(r.unitCount) || 0), 0);
  }, [floorCounts]);

  const leasedNowCombined = leasedUnits.length;

  const leasedNowOnLevel = useMemo(() => {
    if (mode !== "levels") return 0;
    let c = 0;
    for (const id of leasedUnits) {
      if (levelFromUnitId(id) === level) c += 1;
    }
    return c;
  }, [leasedUnits, mode, level]);

  const totalUnitsContext = useMemo(() => {
    if (mode === "levels") return floorTotals[level] ?? 0;
    return buildingTotal;
  }, [mode, level, floorTotals, buildingTotal]);

  const leasedUnitsContext = useMemo(() => {
    if (mode === "levels") return leasedNowOnLevel;
    return leasedNowCombined;
  }, [mode, leasedNowOnLevel, leasedNowCombined]);

  const pct =
    totalUnitsContext > 0 ? (leasedUnitsContext / totalUnitsContext) * 100 : 0;

  return (
    <div className="kpi-container">
      <div className="kpi">
        <div className="kpi-label">TOTAL UNITS</div>
        <div className="kpi-value">{totalUnitsContext}</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">LEASED NOW</div>
        <div className="kpi-value">{leasedUnitsContext}</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">% LEASED</div>
        <div className="kpi-value">{Math.round(pct)}%</div>
      </div>
    </div>
  );
}
