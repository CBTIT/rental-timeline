import { useState, useMemo } from "react";
import type { LeaseData } from "../../types/lease";
import type { ColorMode, UnitTypeCategory } from "../../types/coloring";
import type { UnitFilters } from "../../utils/unitFilters";
import { rentPsfFilterLabel } from "../../utils/unitFilters";
import { generateGradient } from "../../utils/colorGradient";
import { classifyUnitTypeCategory } from "../../utils/unitTypeCategory";
import TimeSlider from "../TimeSlider/TimeSlider";

const MOBILE_LEASE_PRESET_COLORS = ["#6366f1", "#0ea5e9", "#f97316", "#ec4899"];
const MOBILE_DONUT_PALETTE = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
] as const;

function concessionLabel(key: string) {
  if (key === "Unknown") return "Unknown";
  if (key === "0") return "No Concession";
  return `${key} ${key === "1" ? "month" : "months"}`;
}

type MobileControlsProps = {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  viewContext: string;
  setViewContext: React.Dispatch<React.SetStateAction<string>>;
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  currentDateString: string;
  days: number;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
  themeMode: "light" | "dark";
  toggleTheme: () => void;
  colorMode: ColorMode;
  setColorMode: React.Dispatch<React.SetStateAction<ColorMode>>;
  selectedLeaseColor: string;
  setSelectedLeaseColor: React.Dispatch<React.SetStateAction<string>>;
  defaultLeaseColor: string;
  bucketCount: number;
  setBucketCount: React.Dispatch<React.SetStateAction<number>>;
  unitTypeColors: Record<UnitTypeCategory, string>;
  setUnitTypeColors: React.Dispatch<
    React.SetStateAction<Record<UnitTypeCategory, string>>
  >;
  affordableColor: string;
  setAffordableColor: React.Dispatch<React.SetStateAction<string>>;
  concessionKeys: string[];
  concessionColors: Record<string, string>;
  setConcessionColors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  unitFilters: UnitFilters;
  setUnitFilters: React.Dispatch<React.SetStateAction<UnitFilters>>;
  filterTags: Array<{ id: string; label: string; onClear: () => void }>;
  unitData: LeaseData | null;
  filteredLeasedUnits: string[];
  floorCounts: Array<{
    level: string;
    label: string;
    unitCount: number;
  }> | null;
};

export default function MobileControls({
  mode,
  setMode,
  viewContext,
  setViewContext,
  level,
  setLevel,
  currentDateString,
  days,
  currentDay,
  setCurrentDay,
  themeMode,
  toggleTheme,
  colorMode,
  setColorMode,
  selectedLeaseColor,
  setSelectedLeaseColor,
  defaultLeaseColor,
  bucketCount,
  setBucketCount,
  unitTypeColors,
  setUnitTypeColors,
  affordableColor,
  setAffordableColor,
  concessionKeys,
  concessionColors,
  setConcessionColors,
  unitFilters,
  setUnitFilters,
  filterTags,
  unitData,
  filteredLeasedUnits,
  floorCounts,
}: MobileControlsProps) {
  // All mobile-only UI open/close state lives here
  const [showColorModePicker, setShowColorModePicker] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showChartsPicker, setShowChartsPicker] = useState(false);
  const [showChartRent, setShowChartRent] = useState(false);
  const [showChartUnitType, setShowChartUnitType] = useState(true);
  const [showChartConcession, setShowChartConcession] = useState(false);
  const [showChartLevel, setShowChartLevel] = useState(false);
  const [chartFilterKind, setChartFilterKind] = useState<
    "rentPsf" | "unitType" | "concession" | null
  >(null);

  const levelFromUnitId = (unitId: string): string => {
    const t = String(unitId).trim();
    const m = t.match(/^(\d)/);
    return m ? m[1] : "unknown";
  };

  const mobileTimelineStats = useMemo(() => {
    if (!unitData) return { leased: 0, total: 0, pct: 0 };
    const buildingTotal = floorCounts
      ? floorCounts.reduce((sum, r) => sum + (Number(r.unitCount) || 0), 0)
      : 0;
    const levelTotal =
      floorCounts?.find((r) => String(r.level) === String(level))?.unitCount ??
      0;
    const total = mode === "levels" ? Number(levelTotal) || 0 : buildingTotal;
    const leased = (() => {
      if (mode !== "levels") return filteredLeasedUnits.length;
      let c = 0;
      for (const id of filteredLeasedUnits) {
        if (levelFromUnitId(id) === level) c += 1;
      }
      return c;
    })();
    const pct = total > 0 ? (leased / total) * 100 : 0;
    return { leased, total, pct };
  }, [unitData, mode, level, filteredLeasedUnits, floorCounts]);

  const mobileChartsData = useMemo(() => {
    if (!unitData) return null;

    const totalUnitsInView = (() => {
      if (mode !== "levels") return Object.keys(unitData).length;
      let total = 0;
      for (const unitId of Object.keys(unitData)) {
        if (levelFromUnitId(unitId) === level) total += 1;
      }
      return total;
    })();

    const leasedUnitsInView = (() => {
      if (mode !== "levels") return filteredLeasedUnits.length;
      let c = 0;
      for (const id of filteredLeasedUnits)
        if (levelFromUnitId(id) === level) c += 1;
      return c;
    })();

    const leasedPct =
      totalUnitsInView > 0 ? (leasedUnitsInView / totalUnitsInView) * 100 : 0;

    const unitTypeCounts: Record<"Studio" | "1B" | "2B" | "3B", number> = {
      Studio: 0,
      "1B": 0,
      "2B": 0,
      "3B": 0,
    };
    for (const unitId of filteredLeasedUnits) {
      if (mode === "levels" && levelFromUnitId(unitId) !== level) continue;
      const row = unitData[unitId];
      if (!row) continue;
      const cat = classifyUnitTypeCategory(row);
      if (cat === "Unknown") continue;
      unitTypeCounts[cat] += 1;
    }

    type RentBucketKey = "1" | "2" | "3" | "4" | "5" | "6" | "7p";
    const rentOrder: RentBucketKey[] = ["1", "2", "3", "4", "5", "6", "7p"];
    const parsePSF = (psf: unknown): number | null => {
      if (psf == null) return null;
      const s = String(psf).replace(/,/g, "");
      const cleaned = s.replace(/[^0-9.]/g, "");
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    };
    const bucketForPSF = (psf: number): RentBucketKey => {
      if (psf >= 7) return "7p";
      if (psf >= 6) return "6";
      if (psf >= 5) return "5";
      if (psf >= 4) return "4";
      if (psf >= 3) return "3";
      if (psf >= 2) return "2";
      return "1";
    };
    const rentCounts: Record<RentBucketKey, number> = {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7p": 0,
    };
    for (const unitId of filteredLeasedUnits) {
      if (mode === "levels" && levelFromUnitId(unitId) !== level) continue;
      const row = unitData[unitId];
      if (!row) continue;
      const psf = parsePSF(row.psf);
      if (psf == null) continue;
      rentCounts[bucketForPSF(psf)] += 1;
    }

    const concessionCounts = new Map<string, number>();
    let leasedDenom = 0;
    for (const unitId of filteredLeasedUnits) {
      if (mode === "levels" && levelFromUnitId(unitId) !== level) continue;
      leasedDenom += 1;
      const row = unitData[unitId];
      if (!row) continue;
      const key =
        typeof row.freeMonths === "number" && Number.isFinite(row.freeMonths)
          ? String(row.freeMonths)
          : row.freeMonths !== undefined && row.freeMonths !== null
            ? "Unknown"
            : "Unknown";
      concessionCounts.set(key, (concessionCounts.get(key) ?? 0) + 1);
    }

    const levelCounts: Record<string, number> = {};
    for (const unitId of filteredLeasedUnits) {
      const lvl = levelFromUnitId(unitId);
      levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
    }

    return {
      totalUnitsInView,
      leasedUnitsInView,
      leasedPct,
      unitTypeCounts,
      rentCounts,
      rentOrder,
      concessionCounts,
      leasedDenom,
      levelCounts,
    };
  }, [unitData, filteredLeasedUnits, mode, level]);

  const colorModeLabel = useMemo(() => {
    switch (colorMode) {
      case "lease-date": return "Lease Date";
      case "unit-type": return "Unit Type";
      case "concession": return "Concession";
      default: return "Color Mode";
    }
  }, [colorMode]);

  const colorModeLegend = useMemo(() => {
    if (colorMode === "lease-date") {
      const colors = generateGradient(selectedLeaseColor, bucketCount);
      return (
        <span className="mobile-color-mode-legend" aria-hidden="true">
          <span className="mobile-color-mode-legend__caption">High</span>
          <span className="mobile-color-mode-legend__gradient">
            {colors.map((c, idx) => (
              <span
                key={`legend-grad-${idx}`}
                className="mobile-color-mode-legend__gradient-segment"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
          <span className="mobile-color-mode-legend__caption">Low</span>
        </span>
      );
    }

    if (colorMode === "unit-type") {
      const swatches = [
        { key: "Studio", color: unitTypeColors.Studio },
        { key: "1B", color: unitTypeColors["1B"] },
        { key: "2B", color: unitTypeColors["2B"] },
        { key: "3B", color: unitTypeColors["3B"] },
        { key: "Aff", color: affordableColor },
      ];
      return (
        <span className="mobile-color-mode-legend" aria-hidden="true">
          <span className="mobile-color-mode-legend__caption">Types</span>
          {swatches.map((s) => (
            <span
              key={`legend-swatch-${s.key}`}
              className="mobile-color-mode-legend__pair"
              title={s.key}
            >
              <span
                className="mobile-color-mode-legend__swatch"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="mobile-color-mode-legend__tinylabel">{s.key}</span>
            </span>
          ))}
        </span>
      );
    }

    const swatchKeys = concessionKeys.slice(0, 4);
    const remaining = Math.max(0, concessionKeys.length - swatchKeys.length);
    return (
      <span className="mobile-color-mode-legend" aria-hidden="true">
        {swatchKeys.map((k) => {
          const short = k === "Unknown" ? "Unk" : k;
          return (
            <span key={`legend-concession-${k}`} className="mobile-color-mode-legend__pair">
              <span
                className="mobile-color-mode-legend__swatch"
                style={{ backgroundColor: concessionColors[k] ?? "#888888" }}
                title={concessionLabel(k)}
                aria-hidden="true"
              />
              <span className="mobile-color-mode-legend__tinylabel">{short}</span>
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="mobile-color-mode-legend__more">+{remaining}</span>
        )}
      </span>
    );
  }, [colorMode, selectedLeaseColor, bucketCount, unitTypeColors, affordableColor, concessionKeys, concessionColors]);

  const renderDonut = (
    title: string,
    segments: Array<{ label: string; value: number; color: string }>,
    centerText?: string,
    onClick?: () => void,
  ) => {
    const size = 56;
    const stroke = 9;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
    let offset = 0;

    return (
      <button
        type="button"
        className={`mobile-donut ${onClick ? "mobile-donut--clickable" : ""}`}
        aria-label={onClick ? `${title} (tap to filter)` : title}
        onClick={onClick}
        disabled={!onClick}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mobile-donut__svg"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s, idx) => {
                const len = (s.value / total) * c;
                const dasharray = `${len} ${c - len}`;
                const dashoffset = -offset;
                offset += len;
                return (
                  <circle
                    key={`${title}-seg-${idx}`}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
              })}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="mobile-donut__center"
          >
            {centerText ?? ""}
          </text>
        </svg>
        <div className="mobile-donut__meta">
          <div className="mobile-donut__title">{title}</div>
          <div className="mobile-donut__legend">
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div key={`${title}-${s.label}`} className="mobile-donut__legenditem">
                  <span
                    className="mobile-donut__dot"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  <span className="mobile-donut__legendtext">{s.label}</span>
                </div>
              ))}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Header bar */}
      <div className="lease-visualizer-header">
        <button
          type="button"
          className="mobile-charts-button compact-only"
          onClick={() => setShowChartsPicker(true)}
          aria-haspopup="dialog"
          aria-expanded={showChartsPicker}
          aria-label="Charts"
          title="Charts"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 19H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 15L11 11L14 14L19 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="15" r="1" fill="currentColor" />
            <circle cx="11" cy="11" r="1" fill="currentColor" />
            <circle cx="14" cy="14" r="1" fill="currentColor" />
            <circle cx="19" cy="9" r="1" fill="currentColor" />
          </svg>
        </button>
        <div className="lease-visualizer-title">Lease Visualizer</div>
        <div className="lease-visualizer-subtitle">Fenway Kilmarnock</div>
        <button
          type="button"
          className="mobile-theme-button compact-only"
          onClick={toggleTheme}
          aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
          title="Toggle theme"
        >
          {themeMode === "light" ? "☾" : "☀"}
        </button>
        <button
          type="button"
          className="mobile-mode-button compact-only"
          onClick={() => setShowModePicker(true)}
          aria-haspopup="dialog"
          aria-expanded={showModePicker}
          aria-label="Select view mode"
        >
          ☰
        </button>
      </div>

      {/* Mobile charts strip */}
      {unitData && (
        <div className="mobile-charts-strip compact-only" aria-label="Charts">
          <div className="mobile-charts-strip__row">
            {mobileChartsData && showChartUnitType &&
              renderDonut(
                "Unit Types",
                (["Studio", "1B", "2B", "3B"] as const).map((k, idx) => ({
                  label: k,
                  value: mobileChartsData.unitTypeCounts[k],
                  color: MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                })),
                undefined,
                () => setChartFilterKind("unitType"),
              )}

            {mobileChartsData && showChartRent &&
              renderDonut(
                "$/SF",
                mobileChartsData.rentOrder.map((k, idx) => ({
                  label: k === "7p" ? "7+" : k,
                  value: mobileChartsData.rentCounts[k],
                  color: MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                })),
                undefined,
                () => setChartFilterKind("rentPsf"),
              )}

            {mobileChartsData && showChartConcession &&
              renderDonut(
                "Concession",
                Array.from(mobileChartsData.concessionCounts.entries())
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                  .slice(0, 6)
                  .map(([k, v], idx) => ({
                    label: k,
                    value: v,
                    color: concessionColors[k] ?? MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                  })),
                undefined,
                () => setChartFilterKind("concession"),
              )}

            {mobileChartsData && showChartLevel && mode === "combined" &&
              renderDonut(
                "Levels",
                Object.entries(mobileChartsData.levelCounts)
                  .filter(([k]) => k !== "unknown")
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([k, v], idx) => ({
                    label: `L${k}`,
                    value: v,
                    color: MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                  })),
              )}
          </div>
        </div>
      )}

      {/* Mobile bottom controls */}
      {mode !== "table" && (
        <div className="mobile-bottom-controls compact-only" aria-label="Mobile controls">
          <div className="mobile-controls-row">
            {mode === "levels" ? (
              <div className="mobile-level-select">
                <button
                  type="button"
                  className="mobile-pill-button mobile-level-button"
                  onClick={() => setShowLevelPicker((p) => !p)}
                  aria-haspopup="menu"
                  aria-expanded={showLevelPicker}
                >
                  Level: L{level}
                </button>
                {showLevelPicker && (
                  <div className="mobile-level-menu" role="menu" aria-label="Select level">
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((lvl) => (
                      <button
                        key={`mobile-level-${lvl}`}
                        type="button"
                        role="menuitem"
                        className="mobile-level-menu__item"
                        onClick={() => {
                          setLevel(lvl);
                          setShowLevelPicker(false);
                        }}
                      >
                        Level {lvl}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="mobile-controls-right">
              {filterTags.length > 0 && (
                <div className="mobile-active-filters" aria-label="Active filters">
                  {filterTags.map((t) => (
                    <button
                      key={`mobile-filter-${t.id}`}
                      type="button"
                      className="mobile-filter-chip"
                      onClick={t.onClear}
                      aria-label={`Remove filter ${t.label}`}
                      title={`Remove filter: ${t.label}`}
                    >
                      <span className="mobile-filter-chip__text">{t.label}</span>
                      <span className="mobile-filter-chip__x" aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mobile-pill-button mobile-view-button"
                onClick={() => setViewContext((prev) => (prev === "2D" ? "3D" : "2D"))}
                aria-label={`Switch to ${viewContext === "2D" ? "3D" : "2D"} view`}
              >
                {viewContext === "2D" ? "3D" : "2D"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="mobile-color-mode-button"
            onClick={() => setShowColorModePicker(true)}
            aria-haspopup="dialog"
            aria-expanded={showColorModePicker}
          >
            <span className="mobile-color-mode-button__label">Color mode</span>
            <span className="mobile-color-mode-button__right">
              <span className="mobile-color-mode-button__value">{colorModeLabel}</span>
              {colorModeLegend}
            </span>
          </button>

          <div className="mobile-timeline-dock" aria-label="Timeline">
            <div className="mobile-timeline-dock__inner">
              <div className="mobile-timeline-dock__title">
                <span className="mobile-timeline-dock__date">
                  {currentDateString || "Timeline"}
                </span>
                <span className="mobile-timeline-dock__kpi">
                  {mobileTimelineStats.leased}/{mobileTimelineStats.total} (
                  {Math.round(mobileTimelineStats.pct)}%)
                </span>
              </div>
              <TimeSlider days={days} currentDay={currentDay} setCurrentDay={setCurrentDay} />
            </div>
          </div>
        </div>
      )}

      {/* Mode picker modal */}
      {showModePicker && (
        <div
          className="mobile-popover-backdrop compact-only"
          role="dialog"
          aria-modal="true"
          aria-label="Select view mode"
          onClick={() => setShowModePicker(false)}
        >
          <div className="mobile-mode-popover" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-mode-popover__title">View mode</div>
            <div className="mobile-mode-popover__options" role="radiogroup">
              {(["levels", "combined", "table"] as const).map((m) => (
                <button
                  key={`mode-${m}`}
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={mode === m}
                  onClick={() => { setMode(m); setShowModePicker(false); }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color mode picker modal */}
      {showColorModePicker && (
        <div
          className="mobile-color-mode-overlay compact-only"
          role="dialog"
          aria-modal="true"
          aria-label="Select color mode"
          onClick={() => setShowColorModePicker(false)}
        >
          <div className="mobile-color-mode-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-color-mode-sheet__title">Color mode</div>
            <div className="mobile-color-mode-sheet__options" role="radiogroup">
              {(["lease-date", "unit-type", "concession"] as const).map((cm) => (
                <button
                  key={`cm-${cm}`}
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  onClick={() => setColorMode(cm)}
                  aria-checked={colorMode === cm}
                >
                  {cm === "lease-date" ? "Lease Date" : cm === "unit-type" ? "Unit Type" : "Concession"}
                </button>
              ))}
            </div>

            <div className="mobile-color-mode-sheet__editor" aria-label="Legend">
              {colorMode === "lease-date" && (
                <div className="mobile-color-mode-editor">
                  <div className="mobile-color-mode-editor__row">
                    <div className="mobile-color-mode-editor__label">Lease color</div>
                    <div className="mobile-color-mode-editor__controls">
                      <div className="mobile-color-mode-editor__swatches">
                        {MOBILE_LEASE_PRESET_COLORS.map((c) => (
                          <button
                            key={`mobile-lease-preset-${c}`}
                            type="button"
                            className="mobile-color-mode-editor__swatchbtn"
                            style={{ backgroundColor: c }}
                            aria-label={`Select color ${c}`}
                            onClick={() => setSelectedLeaseColor(c)}
                          />
                        ))}
                        <button
                          type="button"
                          className="mobile-color-mode-editor__swatchbtn"
                          style={{ backgroundColor: defaultLeaseColor }}
                          aria-label="Reset default lease color"
                          title="Default"
                          onClick={() => setSelectedLeaseColor(defaultLeaseColor)}
                        />
                      </div>
                      <label className="mobile-color-mode-editor__colorinput">
                        <span className="mobile-color-mode-editor__colorinputtext">Custom</span>
                        <input
                          type="color"
                          value={selectedLeaseColor}
                          onChange={(e) => setSelectedLeaseColor(e.target.value)}
                          aria-label="Pick custom lease color"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="mobile-color-mode-editor__row mobile-color-mode-editor__row--slider">
                    <div className="mobile-color-mode-editor__label">Popularity spread</div>
                    <div className="mobile-color-mode-editor__sliderwrap">
                      <span className="mobile-color-mode-editor__slidervalue">{bucketCount}</span>
                      <input
                        type="range"
                        min="3"
                        max="7"
                        value={bucketCount}
                        onChange={(e) => setBucketCount(Number(e.target.value))}
                        className="mobile-color-mode-editor__slider"
                        aria-label="Set popularity spread"
                      />
                    </div>
                  </div>
                  <div className="mobile-color-mode-editor__hint">Legend runs from High → Low.</div>
                </div>
              )}

              {colorMode === "unit-type" && (
                <div className="mobile-color-mode-editor mobile-color-mode-editor--unit-types">
                  {(["Studio", "1B", "2B", "3B"] as const).map((key) => (
                    <label
                      key={`mobile-unit-type-${key}`}
                      className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label"
                    >
                      <span className="mobile-color-mode-editor__label">{key}</span>
                      <input
                        className="mobile-color-mode-editor__picker"
                        type="color"
                        value={unitTypeColors[key]}
                        onChange={(e) =>
                          setUnitTypeColors((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        aria-label={`Pick ${key} color`}
                      />
                    </label>
                  ))}
                  <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                    <span className="mobile-color-mode-editor__label">Aff</span>
                    <input
                      className="mobile-color-mode-editor__picker"
                      type="color"
                      value={affordableColor}
                      onChange={(e) => setAffordableColor(e.target.value)}
                      aria-label="Pick affordable color"
                    />
                  </label>
                </div>
              )}

              {colorMode === "concession" && (
                <div className="mobile-color-mode-editor mobile-color-mode-editor--concession">
                  <div className="mobile-color-mode-editor__scroll mobile-color-mode-editor__scroll--compact">
                    {concessionKeys.length === 0 ? (
                      <div className="mobile-color-mode-editor__hint">No concession values.</div>
                    ) : (
                      concessionKeys.map((k) => (
                        <label
                          key={`mobile-concession-${k}`}
                          className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label"
                        >
                          <span className="mobile-color-mode-editor__label">
                            <span className="mobile-color-mode-editor__labelmain">
                              {concessionLabel(k)}
                            </span>
                          </span>
                          <input
                            className="mobile-color-mode-editor__picker"
                            type="color"
                            value={concessionColors[k] ?? "#888888"}
                            onChange={(e) =>
                              setConcessionColors((prev) => ({ ...prev, [k]: e.target.value }))
                            }
                            aria-label={`Pick ${concessionLabel(k)} color`}
                          />
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="mobile-color-mode-sheet__cancel"
              onClick={() => setShowColorModePicker(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Charts visibility picker modal */}
      {showChartsPicker && (
        <div
          className="mobile-color-mode-overlay compact-only"
          role="dialog"
          aria-modal="true"
          aria-label="Charts"
          onClick={() => setShowChartsPicker(false)}
        >
          <div className="mobile-color-mode-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-color-mode-sheet__title">Charts</div>
            <div className="mobile-color-mode-sheet__editor">
              <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                <span className="mobile-color-mode-editor__label">Unit Types</span>
                <input
                  type="checkbox"
                  checked={showChartUnitType}
                  onChange={(e) => setShowChartUnitType(e.target.checked)}
                  aria-label="Toggle unit type chart"
                />
              </label>
              <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                <span className="mobile-color-mode-editor__label">$/SF</span>
                <input
                  type="checkbox"
                  checked={showChartRent}
                  onChange={(e) => setShowChartRent(e.target.checked)}
                  aria-label="Toggle rent chart"
                />
              </label>
              <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                <span className="mobile-color-mode-editor__label">Concession</span>
                <input
                  type="checkbox"
                  checked={showChartConcession}
                  onChange={(e) => setShowChartConcession(e.target.checked)}
                  aria-label="Toggle concession chart"
                />
              </label>
              {mode === "combined" && (
                <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                  <span className="mobile-color-mode-editor__label">Levels</span>
                  <input
                    type="checkbox"
                    checked={showChartLevel}
                    onChange={(e) => setShowChartLevel(e.target.checked)}
                    aria-label="Toggle levels chart"
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              className="mobile-color-mode-sheet__cancel"
              onClick={() => setShowChartsPicker(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Chart filter modal */}
      {chartFilterKind && (
        <div
          className="mobile-color-mode-overlay compact-only"
          role="dialog"
          aria-modal="true"
          aria-label="Filter"
          onClick={() => setChartFilterKind(null)}
        >
          <div className="mobile-color-mode-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-color-mode-sheet__title">
              {chartFilterKind === "unitType"
                ? "Unit Type filter"
                : chartFilterKind === "rentPsf"
                  ? "$/SF filter"
                  : "Concession filter"}
            </div>

            {chartFilterKind === "unitType" && (
              <div className="mobile-color-mode-sheet__options" role="radiogroup">
                {(["Studio", "1B", "2B", "3B"] as const).map((k) => (
                  <button
                    key={`filter-unitType-${k}`}
                    type="button"
                    className="mobile-color-mode-sheet__option"
                    aria-checked={unitFilters.unitType === k}
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        unitType: prev.unitType === k ? null : k,
                      }))
                    }
                  >
                    {k}
                  </button>
                ))}
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  aria-checked={unitFilters.unitType == null}
                  onClick={() => setUnitFilters((prev) => ({ ...prev, unitType: null }))}
                >
                  Clear
                </button>
              </div>
            )}

            {chartFilterKind === "rentPsf" && (
              <div className="mobile-color-mode-sheet__options" role="radiogroup">
                {(["1", "2", "3", "4", "5", "6", "7p"] as const).map((k) => (
                  <button
                    key={`filter-rent-${k}`}
                    type="button"
                    className="mobile-color-mode-sheet__option"
                    aria-checked={unitFilters.rentPsf === k}
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        rentPsf: prev.rentPsf === k ? null : k,
                      }))
                    }
                  >
                    {rentPsfFilterLabel(k)}
                  </button>
                ))}
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  aria-checked={unitFilters.rentPsf == null}
                  onClick={() => setUnitFilters((prev) => ({ ...prev, rentPsf: null }))}
                >
                  Clear
                </button>
              </div>
            )}

            {chartFilterKind === "concession" && (
              <div className="mobile-color-mode-editor__scroll">
                {concessionKeys.map((k) => (
                  <button
                    key={`filter-concession-${k}`}
                    type="button"
                    className="mobile-color-mode-sheet__option"
                    aria-checked={unitFilters.concession === k}
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        concession: prev.concession === k ? null : k,
                      }))
                    }
                  >
                    {concessionLabel(k)}
                  </button>
                ))}
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  aria-checked={unitFilters.concession == null}
                  onClick={() => setUnitFilters((prev) => ({ ...prev, concession: null }))}
                >
                  Clear
                </button>
              </div>
            )}

            <button
              type="button"
              className="mobile-color-mode-sheet__cancel"
              onClick={() => setChartFilterKind(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
