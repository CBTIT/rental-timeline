import { useContext } from "react";
import { AppContext, type AppContextType } from "./AppContext";

/**
 * Custom hook to access app context
 * Throws error if used outside of AppProvider
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
