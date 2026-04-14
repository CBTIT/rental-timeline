import "./App.css";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import LevelUnits from "./components/LevelUnits/LevelUnits";
import HUD from "./components/HUD/HUD";
import TimeSlider from "./components/TimeSlider/TimeSlider";
import CamerasAndControls from "./components/CamerasAndControls/CamerasAndControls";
import DataCharts from "./components/DataCharts/DataCharts";
import BaseMap from "./components/BaseMap/BaseMap";
import DataTable from "./components/DataTable/DataTable";
import ModeSelection from "./components/ModeSelection/ModeSelection";
import type { LeaseData } from "./types/lease";
import { generateGradient } from "./utils/colorGradient";
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "./utils/dateUtils";
import { AppProvider } from "./contexts/AppProvider";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import FloorPlanView from "./components/FloorPlanView/FloorPlanView";
import DevCameraDebugPanel from "./components/DevCameraDebugPanel/DevCameraDebugPanel";
import {
  DEFAULT_AFFORDABLE_COLOR,
  DEFAULT_UNIT_TYPE_COLORS,
  type ColorMode,
  type UnitTypeCategory,
} from "./types/coloring";
import { classifyUnitTypeCategory } from "./utils/unitTypeCategory";
import {
  DEFAULT_UNIT_FILTERS,
  type UnitFilters,
  unitMatchesFilters,
} from "./utils/unitFilters";
import { useCompactViewport } from "./hooks/useCompactViewport";
import WebglContextStability from "./components/WebglContextStability/WebglContextStability";

const DEFAULT_LEASE_COLOR = "#14b8a6";
const DEFAULT_CONCESSION_PALETTE = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#22c55e", // green
  "#f97316", // orange
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#ef4444", // red
  "#84cc16", // lime
  "#06b6d4", // cyan
] as const;
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

function rentPsfFilterLabel(k: UnitFilters["rentPsf"]): string {
  if (!k) return "";
  if (k === "7p") return ">$7.0";
  return `$${k}.x`;
}

function App() {
  const base = import.meta.env.BASE_URL;
  const compactViewport = useCompactViewport();
  const shadowMapSize = compactViewport ? 1024 : 4096;
  const [selectedLeaseColor, setSelectedLeaseColor] =
    useState<string>(DEFAULT_LEASE_COLOR);
  const [colorMode, setColorMode] = useState<ColorMode>("lease-date");
  const [showMobileColorModePicker, setShowMobileColorModePicker] =
    useState<boolean>(false);
  const [showMobileModePicker, setShowMobileModePicker] =
    useState<boolean>(false);
  const [showMobileLevelPicker, setShowMobileLevelPicker] =
    useState<boolean>(false);
  const [showMobileChartsPicker, setShowMobileChartsPicker] =
    useState<boolean>(false);
  const [showMobileChartRent, setShowMobileChartRent] = useState<boolean>(false);
  const [showMobileChartUnitType, setShowMobileChartUnitType] =
    useState<boolean>(true);
  const [showMobileChartConcession, setShowMobileChartConcession] =
    useState<boolean>(false);
  const [showMobileChartLevel, setShowMobileChartLevel] =
    useState<boolean>(false);
  const [mobileChartFilterKind, setMobileChartFilterKind] = useState<
    "rentPsf" | "unitType" | "concession" | null
  >(null);
  const [unitTypeColors, setUnitTypeColors] = useState<
    Record<UnitTypeCategory, string>
  >(() => ({ ...DEFAULT_UNIT_TYPE_COLORS }));
  const [affordableColor, setAffordableColor] = useState<string>(
    DEFAULT_AFFORDABLE_COLOR,
  );
  const [concessionColors, setConcessionColors] = useState<Record<string, string>>(
    {},
  );
  const [unitFilters, setUnitFilters] = useState<UnitFilters>(DEFAULT_UNIT_FILTERS);
  const [bucketCount, setBucketCount] = useState<number>(3);
  const [showData, setShowData] = useState<boolean>(true);
  const [showRentDistribution, setShowRentDistribution] = useState<boolean>(true);
  const [showUnitTypeDistribution, setShowUnitTypeDistribution] =
    useState<boolean>(true);
  const [showLevelDistribution, setShowLevelDistribution] = useState<boolean>(true);
  const [showConcessionDistribution, setShowConcessionDistribution] =
    useState<boolean>(true);
  const [mode, setMode] = useState<string>("levels");
  const [unitData, setUnitData] = useState<LeaseData | null>(null);
  const [firstLease, setFirstLease] = useState<Date | null>(null);
  const [level, setLevel] = useState<string>("1");
  const [leasedUnits, setLeasedUnits] = useState<string[]>([]);
  const [days, setDays] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentDateString, setCurrentDateString] = useState<string>("");
  const [currentDay, setCurrentDay] = useState<number>(-1);
  const [viewContext, setViewContext] = useState<string>("3D");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("themeMode");
    // Default to dark on first visit; only switch to light if explicitly saved
    return saved === "light" ? "light" : "dark";
  });
  const [floorCounts, setFloorCounts] = useState<
    Array<{ level: string; label: string; unitCount: number }> | null
  >(null);

  function concessionLabel(key: string) {
    if (key === "Unknown") return "Unknown";
    if (key === "0") return "No Concession";
    return `${key} ${key === "1" ? "month" : "months"}`;
  }

  useEffect(() => {
    fetch(base + "data/floor_unitCount.json")
      .then((r) => r.json())
      .then((data) => setFloorCounts(data))
      .catch(() => setFloorCounts(null));
  }, [base]);

  const mobileColorModeLabel = useMemo(() => {
    switch (colorMode) {
      case "lease-date":
        return "Lease Date";
      case "unit-type":
        return "Unit Type";
      case "concession":
        return "Concession";
      default:
        return "Color Mode";
    }
  }, [colorMode]);

  const sunLighting = useMemo(() => {
    // Sun/Time controls removed; keep a stable default midday lighting.
    const sunTime = 12;
    const normalized = (sunTime - 6) / 12;
    const elevation = Math.sin(normalized * Math.PI);
    const daylight = Math.max(0, elevation);
    const azimuth = ((sunTime - 6) / 24) * Math.PI * 2;

    const orbitalRadius = 140000;
    const height = Math.max(12000, 110000 * elevation + 12000);

    return {
      keyPosition: [
        orbitalRadius * Math.cos(azimuth),
        orbitalRadius * Math.sin(azimuth),
        height,
      ] as [number, number, number],
      fillPosition: [
        -orbitalRadius * 0.6 * Math.cos(azimuth),
        -orbitalRadius * 0.6 * Math.sin(azimuth),
        70000 + 30000 * daylight,
      ] as [number, number, number],
      rimPosition: [
        orbitalRadius * 0.3 * Math.sin(azimuth),
        -orbitalRadius * 0.8 * Math.cos(azimuth),
        90000,
      ] as [number, number, number],
      ambientIntensity: 0.22 + 0.38 * daylight,
      keyIntensity: 0.3 + 1.2 * daylight,
      fillIntensity: 0.22 + 0.45 * daylight,
      rimIntensity: 0.15 + 0.4 * daylight,
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "theme-dark",
      themeMode === "dark",
    );
    document.body.classList.toggle("theme-dark", themeMode === "dark");

    return () => {
      document.documentElement.classList.remove("theme-dark");
      document.body.classList.remove("theme-dark");
    };
  }, [themeMode]);

  useEffect(() => {
    if (mode === "combined" && viewContext === "2D") {
      setSelectedUnit(null);
    }
  }, [viewContext, mode]);

  const filteredLeasedUnits = useMemo(() => {
    if (!unitData) return leasedUnits;
    if (!unitFilters.unitType && !unitFilters.rentPsf && !unitFilters.concession)
      return leasedUnits;
    return leasedUnits.filter((unitId) =>
      unitMatchesFilters(unitData[unitId], unitFilters),
    );
  }, [leasedUnits, unitData, unitFilters]);

  const mobileTimelineStats = useMemo(() => {
    if (!unitData) {
      return { leased: 0, total: 0, pct: 0 };
    }

    const levelFromUnitId = (unitId: string): string => {
      const t = String(unitId).trim();
      const m = t.match(/^(\d)/);
      return m ? m[1] : "unknown";
    };

    // Total inventory, using the same source as LeasedKPI: data/floor_unitCount.json
    const buildingTotal = floorCounts
      ? floorCounts.reduce((sum, r) => sum + (Number(r.unitCount) || 0), 0)
      : 0;
    const levelTotal =
      floorCounts?.find((r) => String(r.level) === String(level))?.unitCount ?? 0;
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

  const concessionKeys = useMemo(() => {
    if (!unitData) return [];
    const numeric = new Set<number>();
    let hasUnknown = false;

    for (const row of Object.values(unitData)) {
      const v = row?.freeMonths;
      if (typeof v === "number" && Number.isFinite(v)) {
        numeric.add(v);
      } else if (v !== undefined && v !== null) {
        hasUnknown = true;
      }
    }

    const sorted = Array.from(numeric).sort((a, b) => a - b).map(String);
    if (hasUnknown) sorted.push("Unknown");
    return sorted;
  }, [unitData]);

  const mobileColorModeLegend = useMemo(() => {
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
  }, [
    colorMode,
    selectedLeaseColor,
    bucketCount,
    unitTypeColors,
    affordableColor,
    concessionKeys,
    concessionColors,
  ]);

  const mobileChartsData = useMemo(() => {
    if (!unitData) return null;

    const levelFromUnitId = (unitId: string): string => {
      const t = String(unitId).trim();
      const m = t.match(/^(\d)/);
      return m ? m[1] : "unknown";
    };

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
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7p": 0,
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

  const renderMobileDonut = (
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

  useEffect(() => {
    if (!unitData) return;
    if (concessionKeys.length === 0) return;

    setConcessionColors((prev) => {
      const next: Record<string, string> = {};

      // Preserve existing overrides for keys that still exist.
      for (const k of concessionKeys) {
        const existing = prev[k];
        if (existing) next[k] = existing;
      }

      // Fill missing keys with stable palette colors.
      for (let i = 0; i < concessionKeys.length; i++) {
        const k = concessionKeys[i];
        if (next[k]) continue;
        next[k] = DEFAULT_CONCESSION_PALETTE[i % DEFAULT_CONCESSION_PALETTE.length];
      }

      return next;
    });
  }, [unitData, concessionKeys]);

  useEffect(() => {
    if (selectedUnit !== null && filteredLeasedUnits.includes(selectedUnit)) {
      setShowFloorPlan(true);
    } else {
      setShowFloorPlan(false);
    }
  }, [selectedUnit, filteredLeasedUnits]);

  const filterTags = useMemo(() => {
    const tags: { id: string; label: string; onClear: () => void }[] = [];
    if (unitFilters.unitType) {
      tags.push({
        id: "unitType",
        label: `Unit type: ${unitFilters.unitType}`,
        onClear: () =>
          setUnitFilters((prev) => ({
            ...prev,
            unitType: null,
          })),
      });
    }
    if (unitFilters.rentPsf) {
      tags.push({
        id: "rentPsf",
        label: `Rent $/SF: ${rentPsfFilterLabel(unitFilters.rentPsf)}`,
        onClear: () =>
          setUnitFilters((prev) => ({
            ...prev,
            rentPsf: null,
          })),
      });
    }
    if (unitFilters.concession) {
      tags.push({
        id: "concession",
        label: `Concession: ${unitFilters.concession}`,
        onClear: () =>
          setUnitFilters((prev) => ({
            ...prev,
            concession: null,
          })),
      });
    }
    return tags;
  }, [unitFilters.unitType, unitFilters.rentPsf, unitFilters.concession]);
  useEffect(() => {
    fetch(base + "data/lease_data.json")
      .then((r) => r.json())
      .then((data) => setUnitData(data));
  }, []);
  useEffect(() => {
    setSelectedUnit(null);
  }, [level]);
  useEffect(() => {
    if (!firstLease) return;
    setCurrentDate(dateFromDayIndex(firstLease, currentDay));
    setCurrentDateString(stringDateFromDayIndex(firstLease, currentDay));
  }, [firstLease, currentDay]);
  useEffect(() => {
    if (!unitData) return;
    let earliest: Date | null = null;
    let latest: Date | null = null;
    for (const row of Object.values(unitData)) {
      let leaseDate = parseLeaseDate(row.leaseStartDate);
      if (leaseDate && (!earliest || leaseDate < earliest))
        earliest = leaseDate;
      if (leaseDate && (!latest || leaseDate > latest)) latest = leaseDate;
    }
    setFirstLease(earliest);
    // setLastLease(latest);
    if (earliest && latest) {
      setDays(daysBetween(earliest, latest));
    } else {
      setDays(0);
    }
  }, [unitData]);
  if (mode === "table") {
    return (
      <div
        className={`table-view-shell ${themeMode === "dark" ? "theme-dark" : ""}`}
      >
        {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}
        <div className="lease-visualizer-header compact-only">
          <div className="lease-visualizer-title">Lease Visualizer</div>
          <div className="lease-visualizer-subtitle">Fenway Kilmarnock</div>
          <button
            type="button"
            className="mobile-theme-button compact-only"
            onClick={() =>
              setThemeMode((prev) => (prev === "light" ? "dark" : "light"))
            }
            aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
            title="Toggle theme"
          >
            {themeMode === "light" ? "☾" : "☀"}
          </button>
          <button
            type="button"
            className="mobile-mode-button compact-only"
            onClick={() => setShowMobileModePicker(true)}
            aria-haspopup="dialog"
            aria-expanded={showMobileModePicker}
            aria-label="Select view mode"
          >
            ☰
          </button>
        </div>
        <div className="table-view-topbar">
          <div className="table-view-header">
            <div className="table-view-title">Lease Visualizer</div>
            <div className="table-view-subtitle">Fenway Kilmarnock</div>
          </div>
          <ModeSelection
            setMode={setMode}
            mode={mode}
            showData={showData}
            setShowData={setShowData}
            themeMode={themeMode}
            toggleTheme={() =>
              setThemeMode((prev) => (prev === "light" ? "dark" : "light"))
            }
            inline
            filterTags={filterTags}
          />
        </div>
        {showMobileModePicker && (
          <div
            className="mobile-popover-backdrop compact-only"
            role="dialog"
            aria-modal="true"
            aria-label="Select view mode"
            onClick={() => setShowMobileModePicker(false)}
          >
            <div
              className="mobile-mode-popover"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-mode-popover__title">View mode</div>
              <div className="mobile-mode-popover__options" role="radiogroup">
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={false}
                  onClick={() => {
                    setMode("levels");
                    setShowMobileModePicker(false);
                  }}
                >
                  Levels
                </button>
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={false}
                  onClick={() => {
                    setMode("combined");
                    setShowMobileModePicker(false);
                  }}
                >
                  Combined
                </button>
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={true}
                  onClick={() => {
                    setMode("table");
                    setShowMobileModePicker(false);
                  }}
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        )}
        <DataTable unitData={unitData} />
      </div>
    );
  } else {
    return (
      <div
        className={`canvas-container ${themeMode === "dark" ? "theme-dark" : ""}`}
      >
        {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}
        <ModeSelection
          setMode={setMode}
          mode={mode}
          showData={showData}
          setShowData={setShowData}
          themeMode={themeMode}
          toggleTheme={() =>
            setThemeMode((prev) => (prev === "light" ? "dark" : "light"))
          }
          showDataToggle={false}
        />
        <Canvas
          shadows
          dpr={compactViewport ? 1 : [1, 2]}
          onPointerMissed={() => setSelectedUnit(null)}
        >
          <WebglContextStability />
          {/* Outside Suspense so context.3dm loads in parallel with useLoader (units); inside Suspense it waited until after units resolved. */}
          <BaseMap viewContext={viewContext} mode={mode} />
          <Suspense fallback={null}>
            <LevelUnits
              level={level}
              leaseData={unitData}
              currentDate={currentDate}
              setLeasedUnits={setLeasedUnits}
              setSelectedUnit={setSelectedUnit}
              selectedUnit={selectedUnit}
              mode={mode}
              viewContext={viewContext}
              selectedLeasedColor={selectedLeaseColor}
              colorMode={colorMode}
              unitTypeColors={unitTypeColors}
              affordableColor={affordableColor}
              concessionColors={concessionColors}
              unitFilters={unitFilters}
              firstLeaseDate={firstLease}
              totalDays={days}
              bucketCount={bucketCount}
            />
          </Suspense>
          {/* Soft overall fill */}
          <ambientLight intensity={sunLighting.ambientIntensity} />
          {/* Key light */}
          <directionalLight
            castShadow
            position={sunLighting.keyPosition}
            intensity={sunLighting.keyIntensity}
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
            shadow-camera-near={10}
            shadow-camera-far={100000}
            shadow-camera-left={-400000}
            shadow-camera-right={400000}
            shadow-camera-top={400000}
            shadow-camera-bottom={-400000}
            shadow-bias={-0.0002}
            shadow-normalBias={0.002}
          />
          {/* Fill light (opposite side, weaker) */}
          <directionalLight
            position={sunLighting.fillPosition}
            intensity={sunLighting.fillIntensity}
          />
          {/* Rim/back light (adds edge separation) */}
          <directionalLight
            position={sunLighting.rimPosition}
            intensity={sunLighting.rimIntensity}
          />
          <CamerasAndControls viewContext={viewContext} />
        </Canvas>
        {unitData && (
          <HUD
            date={currentDateString}
            leasedUnits={filteredLeasedUnits}
            unitData={unitData}
            selectedUnit={selectedUnit}
            mode={mode}
            viewContext={viewContext}
            setViewContext={setViewContext}
            selectedLeaseColor={selectedLeaseColor}
            defaultLeaseColor={DEFAULT_LEASE_COLOR}
            setSelectedLeaseColor={setSelectedLeaseColor}
            colorMode={colorMode}
            setColorMode={setColorMode}
            unitTypeColors={unitTypeColors}
            setUnitTypeColors={setUnitTypeColors}
            affordableColor={affordableColor}
            setAffordableColor={setAffordableColor}
            concessionKeys={concessionKeys}
            concessionColors={concessionColors}
            setConcessionColors={setConcessionColors}
            bucketCount={bucketCount}
            setBucketCount={setBucketCount}
            level={level}
            setLevel={setLevel}
            showData={showData}
            setShowData={setShowData}
            days={days}
            currentDay={currentDay}
            setCurrentDay={setCurrentDay}
          />
        )}
        <DataCharts
          showData={showData}
          leasedUnits={filteredLeasedUnits}
          mode={mode}
          unitData={unitData}
          level={level}
          showRentDistribution={showRentDistribution}
          showUnitTypeDistribution={showUnitTypeDistribution}
          showLevelDistribution={showLevelDistribution}
          showConcessionDistribution={showConcessionDistribution}
          unitFilters={unitFilters}
          setUnitFilters={setUnitFilters}
        />
        <div className="lease-visualizer-header">
          <button
            type="button"
            className="mobile-charts-button compact-only"
            onClick={() => setShowMobileChartsPicker(true)}
            aria-haspopup="dialog"
            aria-expanded={showMobileChartsPicker}
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
              <path
                d="M4 19V5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M4 19H20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M7 15L11 11L14 14L19 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
            onClick={() =>
              setThemeMode((prev) => (prev === "light" ? "dark" : "light"))
            }
            aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
            title="Toggle theme"
          >
            {themeMode === "light" ? "☾" : "☀"}
          </button>
          <button
            type="button"
            className="mobile-mode-button compact-only"
            onClick={() => setShowMobileModePicker(true)}
            aria-haspopup="dialog"
            aria-expanded={showMobileModePicker}
            aria-label="Select view mode"
          >
            ☰
          </button>
        </div>
        {unitData && (
          <div className="mobile-charts-strip compact-only" aria-label="Charts">
            <div className="mobile-charts-strip__row">
              {mobileChartsData &&
                showMobileChartUnitType &&
                renderMobileDonut(
                  "Unit Types",
                  (["Studio", "1B", "2B", "3B"] as const).map((k, idx) => ({
                    label: k,
                    value: mobileChartsData.unitTypeCounts[k],
                    color: MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                  })),
                  undefined,
                  () => setMobileChartFilterKind("unitType"),
                )}

              {mobileChartsData &&
                showMobileChartRent &&
                renderMobileDonut(
                  "$/SF",
                  mobileChartsData.rentOrder.map((k, idx) => ({
                    label: k === "7p" ? "7+" : k,
                    value: mobileChartsData.rentCounts[k],
                    color: MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                  })),
                  undefined,
                  () => setMobileChartFilterKind("rentPsf"),
                )}

              {mobileChartsData &&
                showMobileChartConcession &&
                renderMobileDonut(
                  "Concession",
                  Array.from(mobileChartsData.concessionCounts.entries())
                    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                    .slice(0, 6)
                    .map(([k, v], idx) => ({
                      label: k,
                      value: v,
                      color:
                        concessionColors[k] ??
                        MOBILE_DONUT_PALETTE[idx % MOBILE_DONUT_PALETTE.length],
                    })),
                  undefined,
                  () => setMobileChartFilterKind("concession"),
                )}

              {mobileChartsData &&
                showMobileChartLevel &&
                mode === "combined" &&
                renderMobileDonut(
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
        {mode !== "table" && (
          <div className="sun-and-filters">
            <div
              className="sun-control-panel sun-control-panel--data"
              aria-label="Data chart visibility"
            >
              <div className="sun-control-title">Data to show</div>
              <div className="active-filters-tags active-filters-tags--wrap">
                <label className="mode-selection-filter-tag">
                  <input
                    type="checkbox"
                    checked={showRentDistribution}
                    onChange={(e) => setShowRentDistribution(e.target.checked)}
                    aria-label="Toggle rent distribution"
                  />
                  <span className="mode-selection-filter-tag-text">
                    Rent distribution
                  </span>
                </label>
                <label className="mode-selection-filter-tag">
                  <input
                    type="checkbox"
                    checked={showUnitTypeDistribution}
                    onChange={(e) => setShowUnitTypeDistribution(e.target.checked)}
                    aria-label="Toggle unit type distribution"
                  />
                  <span className="mode-selection-filter-tag-text">
                    Unit type distribution
                  </span>
                </label>
                <label className="mode-selection-filter-tag">
                  <input
                    type="checkbox"
                    checked={showConcessionDistribution}
                    onChange={(e) => setShowConcessionDistribution(e.target.checked)}
                    aria-label="Toggle concession distribution"
                  />
                  <span className="mode-selection-filter-tag-text">
                    Concession distribution
                  </span>
                </label>
                {mode === "combined" && (
                  <label className="mode-selection-filter-tag">
                    <input
                      type="checkbox"
                      checked={showLevelDistribution}
                      onChange={(e) => setShowLevelDistribution(e.target.checked)}
                      aria-label="Toggle level distribution"
                    />
                    <span className="mode-selection-filter-tag-text">
                      Level distribution
                    </span>
                  </label>
                )}
              </div>
            </div>

            {filterTags.length > 0 && (
              <div
                className="sun-control-panel sun-control-panel--filters"
                aria-label="Active filters"
              >
                <div className="sun-control-title">Filters</div>
                <div className="active-filters-tags">
                  {filterTags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="mode-selection-filter-tag"
                      onClick={t.onClear}
                      aria-label={`Remove filter ${t.label}`}
                      title={`Remove filter: ${t.label}`}
                    >
                      <span className="mode-selection-filter-tag-text">
                        {t.label}
                      </span>
                      <span
                        className="mode-selection-filter-tag-icon"
                        aria-hidden="true"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {showFloorPlan &&
          selectedUnit &&
          filteredLeasedUnits.includes(selectedUnit) && (
            <FloorPlanView
              selectedUnit={selectedUnit}
              unitData={unitData}
              onClose={() => {
                setShowFloorPlan(false);
                setSelectedUnit(null);
              }}
              base={base}
            />
          )}
        <div className="mobile-bottom-controls compact-only" aria-label="Mobile controls">
          {mode !== "table" && (
            <div className="mobile-controls-row">
              {mode === "levels" ? (
                <div className="mobile-level-select">
                  <button
                    type="button"
                    className="mobile-pill-button mobile-level-button"
                    onClick={() => setShowMobileLevelPicker((p) => !p)}
                    aria-haspopup="menu"
                    aria-expanded={showMobileLevelPicker}
                  >
                    Level: L{level}
                  </button>
                  {showMobileLevelPicker && (
                    <div
                      className="mobile-level-menu"
                      role="menu"
                      aria-label="Select level"
                    >
                      {["1", "2", "3", "4", "5", "6", "7", "8"].map((lvl) => (
                        <button
                          key={`mobile-level-${lvl}`}
                          type="button"
                          role="menuitem"
                          className="mobile-level-menu__item"
                          onClick={() => {
                            setLevel(lvl);
                            setShowMobileLevelPicker(false);
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
                        <span className="mobile-filter-chip__x" aria-hidden="true">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="mobile-pill-button mobile-view-button"
                  onClick={() =>
                    setViewContext((prev) => (prev === "2D" ? "3D" : "2D"))
                  }
                  aria-label={`Switch to ${viewContext === "2D" ? "3D" : "2D"} view`}
                >
                  {viewContext === "2D" ? "3D" : "2D"}
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="mobile-color-mode-button"
            onClick={() => setShowMobileColorModePicker(true)}
            aria-haspopup="dialog"
            aria-expanded={showMobileColorModePicker}
          >
            <span className="mobile-color-mode-button__label">Color mode</span>
            <span className="mobile-color-mode-button__right">
              <span className="mobile-color-mode-button__value">
                {mobileColorModeLabel}
              </span>
              {mobileColorModeLegend}
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
              <TimeSlider
                days={days}
                currentDay={currentDay}
                setCurrentDay={setCurrentDay}
              />
            </div>
          </div>
        </div>

        {showMobileModePicker && (
          <div
            className="mobile-popover-backdrop compact-only"
            role="dialog"
            aria-modal="true"
            aria-label="Select view mode"
            onClick={() => setShowMobileModePicker(false)}
          >
            <div
              className="mobile-mode-popover"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-mode-popover__title">View mode</div>
              <div className="mobile-mode-popover__options" role="radiogroup">
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={mode === "levels"}
                  onClick={() => {
                    setMode("levels");
                    setShowMobileModePicker(false);
                  }}
                >
                  Levels
                </button>
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={mode === "combined"}
                  onClick={() => {
                    setMode("combined");
                    setShowMobileModePicker(false);
                  }}
                >
                  Combined
                </button>
                <button
                  type="button"
                  className="mobile-mode-popover__option"
                  aria-checked={mode === "table"}
                  onClick={() => {
                    setMode("table");
                    setShowMobileModePicker(false);
                  }}
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        )}

        {showMobileColorModePicker && (
          <div
            className="mobile-color-mode-overlay compact-only"
            role="dialog"
            aria-modal="true"
            aria-label="Select color mode"
            onClick={() => setShowMobileColorModePicker(false)}
          >
            <div
              className="mobile-color-mode-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-color-mode-sheet__title">Color mode</div>
              <div className="mobile-color-mode-sheet__options" role="radiogroup">
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  onClick={() => {
                    setColorMode("lease-date");
                  }}
                  aria-checked={colorMode === "lease-date"}
                >
                  Lease Date
                </button>
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  onClick={() => {
                    setColorMode("unit-type");
                  }}
                  aria-checked={colorMode === "unit-type"}
                >
                  Unit Type
                </button>
                <button
                  type="button"
                  className="mobile-color-mode-sheet__option"
                  onClick={() => {
                    setColorMode("concession");
                  }}
                  aria-checked={colorMode === "concession"}
                >
                  Concession
                </button>
              </div>

              <div className="mobile-color-mode-sheet__editor" aria-label="Legend">
                {colorMode === "lease-date" && (
                  <div className="mobile-color-mode-editor">
                    <div className="mobile-color-mode-editor__row">
                      <div className="mobile-color-mode-editor__label">
                        Lease color
                      </div>
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
                            style={{ backgroundColor: DEFAULT_LEASE_COLOR }}
                            aria-label="Reset default lease color"
                            title="Default"
                            onClick={() => setSelectedLeaseColor(DEFAULT_LEASE_COLOR)}
                          />
                        </div>
                        <label className="mobile-color-mode-editor__colorinput">
                          <span className="mobile-color-mode-editor__colorinputtext">
                            Custom
                          </span>
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
                      <div className="mobile-color-mode-editor__label">
                        Popularity spread
                      </div>
                      <div className="mobile-color-mode-editor__sliderwrap">
                        <span className="mobile-color-mode-editor__slidervalue">
                          {bucketCount}
                        </span>
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
                    <div className="mobile-color-mode-editor__hint">
                      Legend runs from High → Low.
                    </div>
                  </div>
                )}

                {colorMode === "unit-type" && (
                  <div className="mobile-color-mode-editor mobile-color-mode-editor--unit-types">
                    {[
                      { key: "Studio", label: "Studio", value: unitTypeColors.Studio },
                      { key: "1B", label: "1B", value: unitTypeColors["1B"] },
                      { key: "2B", label: "2B", value: unitTypeColors["2B"] },
                      { key: "3B", label: "3B", value: unitTypeColors["3B"] },
                    ].map((row) => (
                      <label
                        key={`mobile-unit-type-${row.key}`}
                        className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label"
                      >
                        <span className="mobile-color-mode-editor__label">
                          {row.label}
                        </span>
                        <input
                          className="mobile-color-mode-editor__picker"
                          type="color"
                          value={row.value}
                          onChange={(e) =>
                            setUnitTypeColors((prev) => ({
                              ...prev,
                              [row.key]: e.target.value,
                            }))
                          }
                          aria-label={`Pick ${row.label} color`}
                        />
                      </label>
                    ))}
                    <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                      <span className="mobile-color-mode-editor__label">
                        Aff
                      </span>
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
                        <div className="mobile-color-mode-editor__hint">
                          No concession values.
                        </div>
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
                                setConcessionColors((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
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
                onClick={() => setShowMobileColorModePicker(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {showMobileChartsPicker && (
          <div
            className="mobile-color-mode-overlay compact-only"
            role="dialog"
            aria-modal="true"
            aria-label="Charts"
            onClick={() => setShowMobileChartsPicker(false)}
          >
            <div
              className="mobile-color-mode-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-color-mode-sheet__title">Charts</div>
              <div className="mobile-color-mode-sheet__editor">
                <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                  <span className="mobile-color-mode-editor__label">Unit Types</span>
                  <input
                    type="checkbox"
                    checked={showMobileChartUnitType}
                    onChange={(e) => setShowMobileChartUnitType(e.target.checked)}
                    aria-label="Toggle unit type chart"
                  />
                </label>
                <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                  <span className="mobile-color-mode-editor__label">$/SF</span>
                  <input
                    type="checkbox"
                    checked={showMobileChartRent}
                    onChange={(e) => setShowMobileChartRent(e.target.checked)}
                    aria-label="Toggle rent chart"
                  />
                </label>
                <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                  <span className="mobile-color-mode-editor__label">Concession</span>
                  <input
                    type="checkbox"
                    checked={showMobileChartConcession}
                    onChange={(e) => setShowMobileChartConcession(e.target.checked)}
                    aria-label="Toggle concession chart"
                  />
                </label>
                {mode === "combined" && (
                  <label className="mobile-color-mode-editor__row mobile-color-mode-editor__row--label">
                    <span className="mobile-color-mode-editor__label">Levels</span>
                    <input
                      type="checkbox"
                      checked={showMobileChartLevel}
                      onChange={(e) => setShowMobileChartLevel(e.target.checked)}
                      aria-label="Toggle levels chart"
                    />
                  </label>
                )}
              </div>
              <button
                type="button"
                className="mobile-color-mode-sheet__cancel"
                onClick={() => setShowMobileChartsPicker(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {mobileChartFilterKind && (
          <div
            className="mobile-color-mode-overlay compact-only"
            role="dialog"
            aria-modal="true"
            aria-label="Filter"
            onClick={() => setMobileChartFilterKind(null)}
          >
            <div
              className="mobile-color-mode-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-color-mode-sheet__title">
                {mobileChartFilterKind === "unitType"
                  ? "Unit Type filter"
                  : mobileChartFilterKind === "rentPsf"
                    ? "$/SF filter"
                    : "Concession filter"}
              </div>

              {mobileChartFilterKind === "unitType" && (
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
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        unitType: null,
                      }))
                    }
                  >
                    Clear
                  </button>
                </div>
              )}

              {mobileChartFilterKind === "rentPsf" && (
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
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        rentPsf: null,
                      }))
                    }
                  >
                    Clear
                  </button>
                </div>
              )}

              {mobileChartFilterKind === "concession" && (
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
                    onClick={() =>
                      setUnitFilters((prev) => ({
                        ...prev,
                        concession: null,
                      }))
                    }
                  >
                    Clear
                  </button>
                </div>
              )}

              <button
                type="button"
                className="mobile-color-mode-sheet__cancel"
                onClick={() => setMobileChartFilterKind(null)}
              >
                Done
              </button>
            </div>
          </div>
        )}
        <DevCameraDebugPanel />
      </div>
    );
  }
}

/**
 * Wrap App with AppProvider to provide context throughout the component tree
 * This eliminates prop drilling and allows components to access shared state via useAppContext()
 */
function AppWithProvider() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

export default AppWithProvider;
