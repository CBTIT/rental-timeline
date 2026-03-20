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
import type { LeaseData } from "./types/lease";
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "./utils/dateUtils";
import { AppProvider } from "./contexts/AppProvider";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

const DEFAULT_LEASE_COLOR = "#14b8a6";

function formatSunTime(time: number) {
  const clamped = Math.max(8, Math.min(16, time));
  const hour = Math.floor(clamped) % 24;
  const minute = Math.round((clamped - Math.floor(clamped)) * 60);
  const normalizedMinute = minute === 60 ? 0 : minute;
  const normalizedHour = minute === 60 ? (hour + 1) % 24 : hour;
  const meridiem = normalizedHour >= 12 ? "PM" : "AM";
  const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  const minuteText = String(normalizedMinute).padStart(2, "0");

  return `${hour12}:${minuteText} ${meridiem}`;
}

function App() {
  const base = import.meta.env.BASE_URL;
  const [selectedLeaseColor, setSelectedLeaseColor] =
    useState<string>(DEFAULT_LEASE_COLOR);
  const [bucketCount, setBucketCount] = useState<number>(5);
  const [showData, setShowData] = useState<boolean>(true);
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
  const [sunTime, setSunTime] = useState<number>(12);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("themeMode");
    // Default to dark on first visit; only switch to light if explicitly saved
    return saved === "light" ? "light" : "dark";
  });

  const sunLighting = useMemo(() => {
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
  }, [sunTime]);
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
        <Canvas shadows dpr={[1, 2]}>
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
              firstLeaseDate={firstLease}
              totalDays={days}
              bucketCount={bucketCount}
            />
            <BaseMap level={level} viewContext={viewContext} mode={mode} />
          </Suspense>
          {/* Soft overall fill */}
          <ambientLight intensity={sunLighting.ambientIntensity} />
          {/* Key light */}
          <directionalLight
            castShadow
            position={sunLighting.keyPosition}
            intensity={sunLighting.keyIntensity}
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-near={10}
            shadow-camera-far={100000}
            shadow-camera-left={-400000}
            shadow-camera-right={400000}
            shadow-camera-top={400000}
            shadow-camera-bottom={-400000}
            shadow-bias={-0.0002}
            shadow-normalBias={0.02}
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
          <CamerasAndControls viewContext={viewContext} level={level} />
        </Canvas>
        {unitData && (
          <HUD
            date={currentDateString}
            leasedUnits={leasedUnits}
            unitData={unitData}
            selectedUnit={selectedUnit}
            mode={mode}
            viewContext={viewContext}
            setViewContext={setViewContext}
            selectedLeaseColor={selectedLeaseColor}
            defaultLeaseColor={DEFAULT_LEASE_COLOR}
            setSelectedLeaseColor={setSelectedLeaseColor}
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
          leasedUnits={leasedUnits}
          mode={mode}
          unitData={unitData}
          level={level}
        />
        <div className="lease-visualizer-header">
          <div className="lease-visualizer-title">Lease Visualizer</div>
          <div className="lease-visualizer-subtitle">Fenway Kilmarnock</div>
        </div>
        {mode !== "table" && (
          <div className="sun-control-panel">
            <div className="sun-control-title">Sun / Time</div>
            <div className="sun-control-time">{formatSunTime(sunTime)}</div>
            <input
              type="range"
              min="8"
              max="16"
              step="0.25"
              value={sunTime}
              onChange={(e) => setSunTime(Number(e.target.value))}
              className="sun-control-slider"
            />
          </div>
        )}
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
