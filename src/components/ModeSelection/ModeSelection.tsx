import React from "react";
import "./ModeSelection.css";
type ModeSelectionProps = {
  setMode: React.Dispatch<React.SetStateAction<string>>;
  mode: string;
  showData: boolean;
  setShowData: React.Dispatch<React.SetStateAction<boolean>>;
};

const ModeSelection = ({
  setMode,
  mode,
  showData,
  setShowData,
}: ModeSelectionProps) => {
  return (
    <div className="mode-selection">
      <button disabled={mode === "levels"} onClick={() => setMode("levels")}>
        Levels
      </button>
      <button
        disabled={mode === "combined"}
        onClick={() => setMode("combined")}
      >
        Combined
      </button>
      <button disabled={mode === "table"} onClick={() => setMode("table")}>
        Table
      </button>
      {mode !== "table" && (
        <button onClick={() => setShowData(showData ? false : true)}>
          {showData ? "Hide Data" : "Show Data"}
        </button>
      )}
    </div>
  );
};

export default ModeSelection;
