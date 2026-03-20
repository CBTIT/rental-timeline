import "./App.css";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import LevelUnits from "./components/LevelUnits/LevelUnits";
import HUD from "./components/HUD/HUD";
import UserSelection from "./components/UserSelection/UserSelection";
import CamerasAndControls from "./components/CamerasAndControls/CamerasAndControls";
import ModeSelection from "./components/ModeSelection/ModeSelection";
import DataCharts from "./components/DataCharts/DataCharts";
import BaseMap from "./components/BaseMap/BaseMap";
import DataTable from "./components/DataTable/DataTable";
import type { LeaseData } from "./types/lease";
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "./utils/dateUtils";
function App() {
  const base = import.meta.env.BASE_URL;
  const [selectedLeaseColor, setSelectedLeaseColor] =
    useState<string>("#56ae57");
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
  console.log(days);
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
      <div>
        <ModeSelection
          setMode={setMode}
          mode={mode}
          showData={showData}
          setShowData={setShowData}
        />
        <DataTable unitData={unitData} />
      </div>
    );
  } else {
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
              selectedLeasedColor={selectedLeaseColor}
              firstLeaseDate={firstLease}
              totalDays={days}
              bucketCount={bucketCount}
            />
            <BaseMap level={level} viewContext={viewContext} mode={mode} />
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
            setSelectedLeaseColor={setSelectedLeaseColor}
            bucketCount={bucketCount}
            setBucketCount={setBucketCount}
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
        <ModeSelection
          setMode={setMode}
          mode={mode}
          showData={showData}
          setShowData={setShowData}
        />
        <DataCharts
          showData={showData}
          leasedUnits={leasedUnits}
          mode={mode}
          unitData={unitData}
          level={level}
        />
      </div>
    );
  }
}

export default App;
