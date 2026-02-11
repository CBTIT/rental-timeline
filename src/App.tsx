import "./App.css";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import LevelUnits from "./components/LevelUnits";
import HUD from "./components/HUD/HUD";
import UserSelection from "./components/UserSelection/UserSelection";
import CamerasAndControls from "./components/CamerasAndControls/CamerasAndControls";
import ModeSelection from "./components/ModeSelection/ModeSelection";
import DataCharts from "./components/DataCharts/DataCharts";
export type LeaseRow = {
  unitType: string;
  description: string;
  unitArea: number;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTerm: number;
  rent: string;
  psf: string;
  freeMonths: number;
  netRent: string;
  leasingAssociate: string;
};
export type LeaseData = Record<string, LeaseRow>;

function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.round((utcB - utcA) / msPerDay); // can be negative
}
function stringDateFromDayIndex(firstDate: Date, dayIndex: number): string {
  const d = new Date(firstDate); // copy
  d.setDate(d.getDate() + dayIndex); // add days (calendar-safe)
  return d.toDateString(); // "YYYY-MM-DD"
}
function dateFromDayIndex(firstDate: Date, dayIndex: number): Date {
  const d = new Date(firstDate); // copy
  d.setDate(d.getDate() + dayIndex); // add days (calendar-safe)
  return d;
}
function App() {
  const [mode, setMode] = useState<string>("levels");
  const [unitData, setUnitData] = useState<LeaseData | null>(null);
  const [firstLease, setFirstLease] = useState<Date | null>(null);
  const [level, setLevel] = useState<string>("1");
  const [leasedUnits, setLeasedUnits] = useState<string[]>([]);
  const [days, setDays] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentDateString, setCurrentDateString] = useState<string>("");
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [viewContext, setViewContext] = useState<string>("3D");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  useEffect(() => {
    if (mode === "combined" && viewContext === "2D") {
      setSelectedUnit(null);
    }
  }, [viewContext, mode]);
  useEffect(() => {
    fetch("/data/lease_data.json")
      .then((r) => r.json())
      .then((data) => setUnitData(data));
  }, []);
  useEffect(() => {
    setSelectedUnit(null);
  }, [level]);
  useEffect(() => {
    console.log("[App] mode changed ->", mode);
  }, [mode]);
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
  console.log("[App render] mode =", mode);

  return (
    <div className="canvas-container">
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
          />
        </Suspense>
        {/* Soft overall fill */}
        <ambientLight intensity={0.55} />
        {/* Key light */}
        <directionalLight
          castShadow
          position={[40000, -100000, 60000]}
          intensity={1}
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
        <directionalLight position={[-60000, 40000, 60000]} intensity={1} />
        {/* Rim/back light (adds edge separation) */}
        <directionalLight position={[0, -80000, 90000]} intensity={1} />
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
        />
      )}
      <UserSelection
        setViewContext={setViewContext}
        viewContext={viewContext}
        setLevel={setLevel}
        days={days}
        currentDay={currentDay}
        setCurrentDay={setCurrentDay}
        mode={mode}
        level={level}
      />
      <ModeSelection setMode={setMode} mode={mode} />
      <DataCharts
        leasedUnits={leasedUnits}
        mode={mode}
        unitData={unitData}
        level={level}
      />
    </div>
  );
}

export default App;
