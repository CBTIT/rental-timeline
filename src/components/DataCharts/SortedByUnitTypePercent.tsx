import { useMemo } from "react";
import "./SortedByUnitTypePercent.css";
import type { LeaseData } from "../../types/lease";
import type { UnitTypeLegendCategory } from "../../types/coloring";
import { classifyUnitTypeCategory } from "../../utils/unitTypeCategory";

type Props = {
  unitData: LeaseData | null;
  leasedUnits: string[]; // leased at currentDate
  mode: string; // "levels" | "combined"
  level: string; // selected level (only used when mode="levels")
  selectedUnitTypeFilter: UnitTypeLegendCategory | null;
  setSelectedUnitTypeFilter: React.Dispatch<
    React.SetStateAction<UnitTypeLegendCategory | null>
  >;
};

const ORDER: UnitTypeLegendCategory[] = ["Studio", "1B", "2B", "3B"];

function levelFromUnitId(unitId: string): string {
  const t = String(unitId).trim();
  const m = t.match(/^(\d)/); // "303" => "3"
  return m ? m[1] : "unknown";
}

export default function SortedByUnitTypePercent({
  unitData,
  leasedUnits,
  mode,
  level,
  selectedUnitTypeFilter,
  setSelectedUnitTypeFilter,
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
    const counts: Record<UnitTypeLegendCategory, number> = {
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

      const b = classifyUnitTypeCategory(row);
      if (b === "Unknown") continue;

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

          const wrapPx = 57;
          const px = (hPct / 100) * wrapPx;
          const pxClamped = b.count > 0 ? Math.max(6, px) : 0;

          return (
            <button
              key={b.k}
              type="button"
              className={`ut-col ${selectedUnitTypeFilter === b.k ? "active" : ""}`}
              onClick={() =>
                setSelectedUnitTypeFilter((prev) => (prev === b.k ? null : b.k))
              }
              aria-pressed={selectedUnitTypeFilter === b.k}
              title={`Filter leased units by ${b.k}`}
            >
              <div className="ut-count">{labelPct}</div>

              <div className="ut-bar-wrap">
                <div className="ut-bar" style={{ height: `${pxClamped}px` }} />
              </div>

              <div className="ut-label">{b.k}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
