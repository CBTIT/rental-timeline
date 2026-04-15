import "./App.css";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import LevelUnits from "./components/LevelUnits/LevelUnits";
import HUD from "./components/HUD/HUD";
import CamerasAndControls from "./components/CamerasAndControls/CamerasAndControls";
import DataCharts from "./components/DataCharts/DataCharts";
import BaseMap from "./components/BaseMap/BaseMap";
import DataTable from "./components/DataTable/DataTable";
import ModeSelection from "./components/ModeSelection/ModeSelection";
import MobileControls from "./components/MobileControls/MobileControls";
import type { LeaseData } from "./types/lease";
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "./utils/dateUtils";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import FloorPlanView from "./components/FloorPlanView/FloorPlanView";
import DevCameraDebugPanel from "./components/DevCameraDebugPanel/DevCameraDebugPanel";
import {
  DEFAULT_AFFORDABLE_COLOR,
  DEFAULT_UNIT_TYPE_COLORS,
  type ColorMode,
  type UnitTypeCategory,
} from "./types/coloring";
import {
  DEFAULT_UNIT_FILTERS,
  type UnitFilters,
  unitMatchesFilters,
  rentPsfFilterLabel,
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

function App() {
  const base = import.meta.env.BASE_URL;
  const compactViewport = useCompactViewport();
  // Shadows disabled globally for stability/perf across devices.
  const [selectedLeaseColor, setSelectedLeaseColor] =
    useState<string>(DEFAULT_LEASE_COLOR);
  const [colorMode, setColorMode] = useState<ColorMode>("lease-date");
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

  useEffect(() => {
    fetch(base + "data/floor_unitCount.json")
      .then((r) => r.json())
      .then((data) => setFloorCounts(data))
      .catch(() => setFloorCounts(null));
  }, [base]);

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
            onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
            aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
            title="Toggle theme"
          >
            {themeMode === "light" ? "☾" : "☀"}
          </button>
          <button
            type="button"
            className="mobile-mode-button compact-only"
            onClick={() => setMode("levels")}
            aria-label="Switch to levels view"
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
            position={sunLighting.keyPosition}
            intensity={sunLighting.keyIntensity}
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
        <MobileControls
          mode={mode}
          setMode={setMode}
          viewContext={viewContext}
          setViewContext={setViewContext}
          level={level}
          setLevel={setLevel}
          currentDateString={currentDateString}
          days={days}
          currentDay={currentDay}
          setCurrentDay={setCurrentDay}
          themeMode={themeMode}
          toggleTheme={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
          colorMode={colorMode}
          setColorMode={setColorMode}
          selectedLeaseColor={selectedLeaseColor}
          setSelectedLeaseColor={setSelectedLeaseColor}
          defaultLeaseColor={DEFAULT_LEASE_COLOR}
          bucketCount={bucketCount}
          setBucketCount={setBucketCount}
          unitTypeColors={unitTypeColors}
          setUnitTypeColors={setUnitTypeColors}
          affordableColor={affordableColor}
          setAffordableColor={setAffordableColor}
          concessionKeys={concessionKeys}
          concessionColors={concessionColors}
          setConcessionColors={setConcessionColors}
          unitFilters={unitFilters}
          setUnitFilters={setUnitFilters}
          filterTags={filterTags}
          unitData={unitData}
          filteredLeasedUnits={filteredLeasedUnits}
          floorCounts={floorCounts}
        />
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
        <DevCameraDebugPanel />
      </div>
    );
  }
}

export default App;
