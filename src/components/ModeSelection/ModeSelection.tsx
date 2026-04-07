import React, { memo } from "react";
import "./ModeSelection.css";

type FilterTag = {
  id: string;
  label: string;
  onClear: () => void;
};
type ModeSelectionProps = {
  setMode: React.Dispatch<React.SetStateAction<string>>;
  mode: string;
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
  themeMode?: "light" | "dark";
  toggleTheme?: () => void;
  inline?: boolean;
  showDataToggle?: boolean;
  filterTags?: FilterTag[];
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
  filterTags,
}: ModeSelectionProps) => {
  const hasFilters = !!filterTags && filterTags.length > 0;
  return (
    <div className={`mode-selection ${inline ? "mode-selection-inline" : ""}`}>
      <div className="mode-selection-row">
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

        {hasFilters && (
          <div className="mode-selection-filters" aria-label="Active filters">
            <div className="mode-selection-filters-label">Filters</div>
            <div className="mode-selection-filters-tags">
              {filterTags!.map((t) => (
                <span key={t.id} className="mode-selection-filter-tag">
                  <span className="mode-selection-filter-tag-text">{t.label}</span>
                  <button
                    type="button"
                    className="mode-selection-filter-tag-clear"
                    onClick={t.onClear}
                    aria-label={`Remove filter ${t.label}`}
                    title={`Remove filter ${t.label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ModeSelection);
