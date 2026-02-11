import { useMemo } from "react";
import type { LeaseData } from "../../App";
import "./SortedByFloorLeasePercent.css";

type Props = {
  unitData: LeaseData | null;
  leasedUnits: string[]; // leased at currentDate
};

const FLOORS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

function levelFromUnitId(unitId: string): string {
  const t = String(unitId).trim();
  const m = t.match(/^(\d)/); // "303" => "3"
  return m ? m[1] : "unknown";
}

export default function SortedByFloorLeasePercent({
  unitData,
  leasedUnits,
}: Props) {
  const { floors, maxPct, denomStatic } = useMemo(() => {
    // denom is STATIC: total count from lease_data.json
    const denom = unitData ? Object.keys(unitData).length : 0;

    // counts are DYNAMIC: from leasedUnits (current date)
    const counts: Record<string, number> = {};
    for (const f of FLOORS) counts[f] = 0;

    if (!unitData || leasedUnits.length === 0) {
      const floors = FLOORS.map((f) => ({ floor: f, count: 0, pct: 0 }));
      return { floors, maxPct: 1, denomStatic: denom };
    }

    // count leased units by floor
    for (const unitId of leasedUnits) {
      // (optional) ignore leased ids not in dataset
      if (!unitData[unitId]) continue;

      const fl = levelFromUnitId(unitId);
      if (counts[fl] == null) continue;
      counts[fl] += 1;
    }

    const floors = FLOORS.map((f) => {
      const c = counts[f] ?? 0;
      const pct = denom > 0 ? (c / denom) * 100 : 0;
      return { floor: f, count: c, pct };
    });

    const maxPct = Math.max(1, ...floors.map((x) => x.pct));
    return { floors, maxPct, denomStatic: denom };
  }, [unitData, leasedUnits]);

  return (
    <div className="fl-strip">
      <div className="fl-title">SORTED BY LEVELS</div>

      <div className="fl-row">
        {floors.map((b) => {
          const hPct = (b.pct / maxPct) * 100;
          const labelPct = `${Math.round(b.pct)}%`;

          const wrapPx = 68;
          const px = (hPct / 100) * wrapPx;
          const pxClamped = b.count > 0 ? Math.max(6, px) : 0;

          return (
            <div key={b.floor} className="fl-col">
              <div className="fl-count">{labelPct}</div>

              <div className="fl-bar-wrap">
                <div className="fl-bar" style={{ height: `${pxClamped}px` }} />
              </div>

              <div className="fl-label">{b.floor}F</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
