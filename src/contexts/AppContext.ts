import { createContext } from "react";
import type { LeaseData } from "../types/lease";

export type AppContextType = {
  // Lease data
  unitData: LeaseData | null;
  leasedUnits: string[];
  setLeasedUnits: React.Dispatch<React.SetStateAction<string[]>>;
  firstLease: Date | null;
  days: number;

  // Timeline
  currentDate: Date | null;
  currentDateString: string;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;

  // Selection
  selectedUnit: string | null;
  setSelectedUnit: React.Dispatch<React.SetStateAction<string | null>>;
  selectedLeaseColor: string;
  setSelectedLeaseColor: React.Dispatch<React.SetStateAction<string>>;
  bucketCount: number;
  setBucketCount: React.Dispatch<React.SetStateAction<number>>;

  // Level & Mode
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  viewContext: string;
  setViewContext: React.Dispatch<React.SetStateAction<string>>;

  // Data display
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);
