import { useEffect, useMemo, useState } from "react";
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
type DisplayMode = "leased" | "total";

type UnitTypeCounts = Record<UnitTypeLegendCategory, number>;
type UnitTypeCountsByLevel = Record<string, UnitTypeCounts>;

const EMPTY_COUNTS: UnitTypeCounts = { Studio: 0, "1B": 0, "2B": 0, "3B": 0 };

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>("leased");
  const [totalCountsByLevel, setTotalCountsByLevel] =
    useState<UnitTypeCountsByLevel | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    fetch(base + "data/uniTypeCount.json")
      .then((r) => r.json())
      .then(
        (rows: Array<{
          level: string;
          studio: number;
          "1b": number;
          "2b": number;
          "3b": number;
        }>) => {
        if (cancelled) return;
        const byLevel: UnitTypeCountsByLevel = {};
        for (const row of rows ?? []) {
          byLevel[String(row.level)] = {
            Studio: Number(row.studio) || 0,
            "1B": Number(row["1b"]) || 0,
            "2B": Number(row["2b"]) || 0,
            "3B": Number(row["3b"]) || 0,
          };
        }
        setTotalCountsByLevel(byLevel);
      },
      )
      .catch(() => {
        if (cancelled) return;
        setTotalCountsByLevel(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const leasedCounts: UnitTypeCounts = { ...EMPTY_COUNTS };

    if (unitData && leasedUnits.length > 0) {
      for (const unitId of leasedUnits) {
        const row = unitData[unitId];
        if (!row) continue;

        if (mode === "levels") {
          if (levelFromUnitId(unitId) !== level) continue;
        }

        const b = classifyUnitTypeCategory(row);
        if (b === "Unknown") continue;

        leasedCounts[b] += 1;
      }
    }

    const totalCountsForContext = (() => {
      if (!totalCountsByLevel) return null;
      if (mode === "levels") {
        return totalCountsByLevel[level] ?? null;
      }
      // combined: sum all known levels from the totals file
      const sum: UnitTypeCounts = { ...EMPTY_COUNTS };
      for (const v of Object.values(totalCountsByLevel)) {
        sum.Studio += v.Studio;
        sum["1B"] += v["1B"];
        sum["2B"] += v["2B"];
        sum["3B"] += v["3B"];
      }
      return sum;
    })();

    const buckets = ORDER.map((k) => {
      const leased = leasedCounts[k] ?? 0;

      if (displayMode === "total" && totalCountsForContext) {
        const totalForType = totalCountsForContext[k] ?? 0;
        const pct = totalForType > 0 ? (leased / totalForType) * 100 : 0;
        return { k, count: leased, pct };
      }

      const pct = denomStatic > 0 ? (leased / denomStatic) * 100 : 0;
      return { k, count: leased, pct };
    });

    const maxPct = Math.max(1, ...buckets.map((b) => b.pct));
    return { buckets, maxPct };
  }, [unitData, leasedUnits, mode, level, denomStatic, displayMode, totalCountsByLevel]);

  return (
    <div className="ut-strip">
      <div className="ut-title-row">
        <div className="ut-title">Unit Type Distribution</div>
        <div className="ut-toggle" role="group" aria-label="Unit type distribution mode">
          <button
            type="button"
            className={`ut-toggle-btn ${displayMode === "leased" ? "active" : ""}`}
            onClick={() => setDisplayMode("leased")}
            aria-pressed={displayMode === "leased"}
          >
            Leased
          </button>
          <button
            type="button"
            className={`ut-toggle-btn ${displayMode === "total" ? "active" : ""}`}
            onClick={() => setDisplayMode("total")}
            aria-pressed={displayMode === "total"}
          >
            Total
          </button>
        </div>
      </div>

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

      {displayMode === "leased" ? (
        <div className="chart-footnote">% = leased in type ÷ total units in view.</div>
      ) : (
        <div className="chart-footnote">% = leased in type ÷ total units of that type.</div>
      )}
    </div>
  );
}
