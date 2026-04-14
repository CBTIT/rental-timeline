import { useMemo } from "react";
import "./ConcessionDistribution.css";
import type { LeaseData } from "../../types/lease";

type Props = {
  unitData: LeaseData | null;
  leasedUnits: string[]; // leased at currentDate (already filtered by active filters)
  mode: string; // "levels" | "combined"
  level: string; // selected level for levels mode
  selectedConcessionFilter: string | null;
  setSelectedConcessionFilter: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

function levelFromUnitId(unitId: string): string {
  const t = unitId.trim();
  const m = t.match(/^(\d)/);
  return m ? m[1] : "unknown";
}

function concessionLabel(key: string): string {
  if (key === "Unknown") return "Unknown";
  return key;
}

export default function ConcessionDistribution({
  unitData,
  leasedUnits,
  mode,
  level,
  selectedConcessionFilter,
  setSelectedConcessionFilter,
}: Props) {
  const { buckets, maxPct } = useMemo(() => {
    if (!unitData) {
      return {
        buckets: [] as Array<{ k: string; count: number; pct: number }>,
        maxPct: 1,
      };
    }

    // Always render all unique concession buckets, even when there are no leased units.
    const allKeysSet = new Set<string>();
    for (const row of Object.values(unitData)) {
      const v = row?.freeMonths;
      if (typeof v === "number" && Number.isFinite(v)) {
        allKeysSet.add(String(v));
      } else if (v !== undefined && v !== null) {
        allKeysSet.add("Unknown");
      }
    }
    if (allKeysSet.size === 0) allKeysSet.add("Unknown");

    const counts = new Map<string, number>();
    for (const k of allKeysSet) counts.set(k, 0);

    let denomLeased = 0;
    for (const unitId of leasedUnits) {
      if (mode === "levels" && levelFromUnitId(unitId) !== level) continue;
      denomLeased += 1;

      const row = unitData[unitId];
      if (!row) continue;

      const key =
        typeof row.freeMonths === "number" && Number.isFinite(row.freeMonths)
          ? String(row.freeMonths)
          : row.freeMonths !== undefined && row.freeMonths !== null
            ? "Unknown"
            : "Unknown";

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const keys = Array.from(counts.keys()).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(a) - Number(b);
    });

    const buckets = keys.map((k) => {
      const count = counts.get(k) ?? 0;
      const pct = denomLeased > 0 ? (count / denomLeased) * 100 : 0;
      return { k, count, pct };
    });

    const maxPct = Math.max(1, ...buckets.map((b) => b.pct));
    return { buckets, maxPct };
  }, [unitData, leasedUnits, mode, level]);

  return (
    <div className="con-strip">
      <div className="con-title-row">
        <div className="con-title">Concession Distribution</div>
        <div className="con-subtitle" />
      </div>

      <div className="con-row">
        {buckets.map((b) => {
          const hPct = (b.pct / maxPct) * 100;
          const labelPct = `${Math.round(b.pct)}%`;

          const wrapPx = 68;
          const px = (hPct / 100) * wrapPx;
          const pxClamped = b.count > 0 ? Math.max(6, px) : 0;

          return (
            <button
              key={b.k}
              type="button"
              className={`con-col ${selectedConcessionFilter === b.k ? "active" : ""}`}
              onClick={() =>
                setSelectedConcessionFilter((prev) => (prev === b.k ? null : b.k))
              }
              aria-pressed={selectedConcessionFilter === b.k}
              title={`Filter leased units by concession ${b.k}`}
            >
              <div className="con-count">{labelPct}</div>

              <div className="con-bar-wrap">
                <div className="con-bar" style={{ height: `${pxClamped}px` }} />
              </div>

              <div className="con-label">{concessionLabel(b.k)}</div>
            </button>
          );
        })}
      </div>

      <div className="chart-footnote">
        % = leased with value ÷ total leased (after filters).
      </div>
    </div>
  );
}

