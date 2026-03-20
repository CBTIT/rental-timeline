import React, { memo } from "react";
import "./ModeSelection.css";
type ModeSelectionProps = {
  setMode: React.Dispatch<React.SetStateAction<string>>;
  mode: string;
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
  themeMode?: "light" | "dark";
  toggleTheme?: () => void;
  inline?: boolean;
  showDataToggle?: boolean;
};

const ModeSelection = ({
  setMode,
  mode,
  showData,
  setShowData,
  themeMode,
  toggleTheme,
  inline,
  showDataToggle = true,
}: ModeSelectionProps) => {
  return (
    <div className={`mode-selection ${inline ? "mode-selection-inline" : ""}`}>
      <button
        disabled={mode === "levels"}
        onClick={() => setMode("levels")}
        className={mode === "levels" ? "active" : ""}
      >
        Levels
      </button>
      <button
        disabled={mode === "combined"}
        onClick={() => setMode("combined")}
        className={mode === "combined" ? "active" : ""}
      >
        Combined
      </button>
      <button
        disabled={mode === "table"}
        onClick={() => setMode("table")}
        className={mode === "table" ? "active" : ""}
      >
        Table
      </button>
      {showDataToggle && mode !== "table" && (
        <button onClick={() => setShowData(showData ? false : true)}>
          {showData ? "Hide Data" : "Show Data"}
        </button>
      )}
      {toggleTheme && (
        <button
          type="button"
          className="theme-toggle-mode-btn"
          onClick={toggleTheme}
          title={
            themeMode === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          aria-label={
            themeMode === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {themeMode === "dark" ? "☀" : "☾"}
        </button>
      )}
    </div>
  );
};

export default memo(ModeSelection);
