import { useMemo } from "react";
import type { LeaseData } from "../../App";
import "./SortedByRentPSFPercent.css";

type Props = {
  unitData: LeaseData | null;
  leasedUnits: string[]; // leased at currentDate (changes with slider)
  mode: string; // "levels" | "combined"
  level: string; // selected level for levels mode
};

function parsePSF(psf: unknown): number | null {
  if (psf == null) return null;
  const s = String(psf).replace(/,/g, "");
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

type BucketKey = "1" | "2" | "3" | "4" | "5" | "6" | "7p";
const ORDER: BucketKey[] = ["1", "2", "3", "4", "5", "6", "7p"];

function bucketForPSF(psf: number): BucketKey {
  if (psf >= 7) return "7p";
  if (psf >= 6) return "6";
  if (psf >= 5) return "5";
  if (psf >= 4) return "4";
  if (psf >= 3) return "3";
  if (psf >= 2) return "2";
  return "1";
}

function bucketLabel(k: BucketKey): string {
  return k === "7p" ? ">$7.0" : `$${k}.x`;
}

function levelFromUnitId(unitId: string): string {
  const t = unitId.trim();
  const m = t.match(/^(\d)/);
  return m ? m[1] : "unknown";
}

export default function SortedByRentPSFPercent({
  unitData,
  leasedUnits,
  mode,
  level,
}: Props) {
  // ✅ STATIC denominator from unitData (ever-lease inventory), per your rule
  const denomStatic = useMemo(() => {
    if (!unitData) return 0;

    if (mode === "combined") {
      return Object.keys(unitData).length;
    }

    let total = 0;
    for (const unitId of Object.keys(unitData)) {
      if (levelFromUnitId(unitId) === level) total += 1;
    }
    return total;
  }, [unitData, mode, level]);

  const { buckets, maxPct } = useMemo(() => {
    const counts: Record<BucketKey, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7p": 0,
    };

    if (!unitData || leasedUnits.length === 0) {
      const buckets = ORDER.map((k) => ({ k, count: 0, pct: 0 }));
      return { buckets, maxPct: 1 };
    }

    for (const unitId of leasedUnits) {
      const row = unitData[unitId];
      if (!row) continue;

      // levels mode: only count leased units on the selected level
      if (mode === "levels") {
        if (levelFromUnitId(unitId) !== level) continue;
      }

      const psf = parsePSF(row.psf);
      if (psf == null) continue;

      counts[bucketForPSF(psf)] += 1;
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
    <div className="psf-strip">
      <div className="psf-title">Rent Distribution ($/SF)</div>

      <div className="psf-row">
        {buckets.map((b) => {
          const hPct = (b.pct / maxPct) * 100;

          // show % label
          const labelPct = `${Math.round(b.pct)}%`;

          // ensure visible minimum for nonzero buckets
          const wrapPx = 68;
          const px = (hPct / 100) * wrapPx;
          const pxClamped = b.count > 0 ? Math.max(6, px) : 0;

          return (
            <div key={b.k} className="psf-col">
              <div className="psf-count">{labelPct}</div>

              <div className="psf-bar-wrap">
                <div className="psf-bar" style={{ height: `${pxClamped}px` }} />
              </div>

              <div className="psf-label">{bucketLabel(b.k)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
