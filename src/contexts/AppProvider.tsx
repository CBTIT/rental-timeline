import React, { useState, useEffect } from "react";
import { AppContext, type AppContextType } from "./AppContext";
import type { LeaseData } from "../types/lease";
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "../utils/dateUtils";

type AppProviderProps = {
  children: React.ReactNode;
};

/**
 * AppProvider wraps the entire app and provides shared state via context
 * Eliminates prop drilling and allows components to access state directly
 */
export function AppProvider({ children }: AppProviderProps) {
  // Lease data
  const [unitData, setUnitData] = useState<LeaseData | null>(null);
  const [leasedUnits, setLeasedUnits] = useState<string[]>([]);
  const [firstLease, setFirstLease] = useState<Date | null>(null);
  const [days, setDays] = useState<number>(0);

  // Timeline
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentDateString, setCurrentDateString] = useState<string>("");
  const [currentDay, setCurrentDay] = useState<number>(-1);

  // Selection
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedLeaseColor, setSelectedLeaseColor] =
    useState<string>("#56ae57");
  const [bucketCount, setBucketCount] = useState<number>(5);

  // Level & Mode
  const [level, setLevel] = useState<string>("1");
  const [mode, setMode] = useState<string>("levels");
  const [viewContext, setViewContext] = useState<string>("3D");

  // Data display
  const [showData, setShowData] = useState<boolean>(true);

  // Fetch unit data on mount
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(base + "data/lease_data.json")
      .then((r) => r.json())
      .then((data) => setUnitData(data))
      .catch((error) => console.error("Failed to load lease data:", error));
  }, []);

  // Calculate first lease date and total days
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
    if (earliest && latest) {
      setDays(daysBetween(earliest, latest));
    } else {
      setDays(0);
    }
  }, [unitData]);

  // Update current date based on current day
  useEffect(() => {
    if (!firstLease) return;
    setCurrentDate(dateFromDayIndex(firstLease, currentDay));
    setCurrentDateString(stringDateFromDayIndex(firstLease, currentDay));
  }, [firstLease, currentDay]);

  // Reset selected unit when level changes
  useEffect(() => {
    setSelectedUnit(null);
  }, [level]);

  // Reset selected unit when switching to 2D combined view
  useEffect(() => {
    if (mode === "combined" && viewContext === "2D") {
      setSelectedUnit(null);
    }
  }, [viewContext, mode]);

  const value: AppContextType = {
    // Lease data
    unitData,
    leasedUnits,
    setLeasedUnits,
    firstLease,
    days,

    // Timeline
    currentDate,
    currentDateString,
    currentDay,
    setCurrentDay,

    // Selection
    selectedUnit,
    setSelectedUnit,
    selectedLeaseColor,
    setSelectedLeaseColor,
    bucketCount,
    setBucketCount,

    // Level & Mode
    level,
    setLevel,
    mode,
    setMode,
    viewContext,
    setViewContext,

    // Data display
    showData,
    setShowData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
