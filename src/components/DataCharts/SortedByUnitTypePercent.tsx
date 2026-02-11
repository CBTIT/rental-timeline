import { useMemo } from "react";
import type { LeaseData } from "../../App";
import "./SortedByUnitTypePercent.css";

type Props = {
  unitData: LeaseData | null;
  leasedUnits: string[]; // leased at currentDate
  mode: string; // "levels" | "combined"
  level: string; // selected level (only used when mode="levels")
};

type UnitBucket = "Studio" | "1B" | "2B" | "3B";
const ORDER: UnitBucket[] = ["Studio", "1B", "2B", "3B"];

function levelFromUnitId(unitId: string): string {
  const t = String(unitId).trim();
  const m = t.match(/^(\d)/); // "303" => "3"
  return m ? m[1] : "unknown";
}

function bucketFromRow(row: {
  unitType?: string;
  description?: string;
}): UnitBucket | null {
  const desc = (row.description ?? "").toLowerCase();

  // description-based
  if (desc.includes("studio")) return "Studio";
  if (desc.includes("3") && desc.includes("bed")) return "3B";
  if (desc.includes("2") && desc.includes("bed")) return "2B";
  if (desc.includes("1") && desc.includes("bed")) return "1B";

  // fallback: unitType prefix (based on your dataset)
  const ut = (row.unitType ?? "").trim().toUpperCase();
  if (ut.startsWith("S")) return "Studio";
  if (ut.startsWith("A")) return "1B";
  if (ut.startsWith("B")) return "2B";
  if (ut.startsWith("C")) return "3B";

  return null;
}

export default function SortedByUnitTypePercent({
  unitData,
  leasedUnits,
  mode,
  level,
}: Props) {
  // ✅ STATIC denominator: total units in dataset for that context
  const denomStatic = useMemo(() => {
    if (!unitData) return 0;

    if (mode === "combined") {
      return Object.keys(unitData).length;
    }

    // levels mode: count all units in dataset that belong to this floor
    let total = 0;
    for (const unitId of Object.keys(unitData)) {
      if (levelFromUnitId(unitId) === level) total += 1;
    }
    return total;
  }, [unitData, mode, level]);

  const { buckets, maxPct } = useMemo(() => {
    const counts: Record<UnitBucket, number> = {
      Studio: 0,
      "1B": 0,
      "2B": 0,
      "3B": 0,
    };

    if (!unitData || leasedUnits.length === 0) {
      const buckets = ORDER.map((k) => ({ k, count: 0, pct: 0 }));
      return { buckets, maxPct: 1 };
    }

    // ✅ count leased-at-currentDate into buckets (dynamic)
    for (const unitId of leasedUnits) {
      const row = unitData[unitId];
      if (!row) continue;

      if (mode === "levels") {
        if (levelFromUnitId(unitId) !== level) continue;
      }

      const b = bucketFromRow(row);
      if (!b) continue;

      counts[b] += 1;
    }

    const buckets = ORDER.map((k) => {
      const c = counts[k];
      const pct = denomStatic > 0 ? (c / denomStatic) * 100 : 0;
      return { k, count: c, pct };
    });

    const maxPct = Math.max(1, ...buckets.map((b) => b.pct));
    return { buckets, maxPct };
  }, [unitData, leasedUnits, mode, level, denomStatic]);

  return (
    <div className="ut-strip">
      <div className="ut-title">Unit Type Distribution</div>

      <div className="ut-row">
        {buckets.map((b) => {
          const hPct = (b.pct / maxPct) * 100;
          const labelPct = `${Math.round(b.pct)}%`;

          const wrapPx = 68;
          const px = (hPct / 100) * wrapPx;
          const pxClamped = b.count > 0 ? Math.max(6, px) : 0;

          return (
            <div key={b.k} className="ut-col">
              <div className="ut-count">{labelPct}</div>

              <div className="ut-bar-wrap">
                <div className="ut-bar" style={{ height: `${pxClamped}px` }} />
              </div>

              <div className="ut-label">{b.k}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
