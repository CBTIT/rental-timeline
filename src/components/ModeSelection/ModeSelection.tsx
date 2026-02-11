import React from "react";
import "./ModeSelection.css";
type ModeSelectionProps = {
  setMode: React.Dispatch<React.SetStateAction<string>>;
  mode: string;
};

const ModeSelection = ({ setMode, mode }: ModeSelectionProps) => {
  return (
    <div className="mode-selection">
      <button disabled={mode == "levels"} onClick={() => setMode("levels")}>
        Levels
      </button>
      <button disabled={mode == "combined"} onClick={() => setMode("combined")}>
        Combined
      </button>
      <button disabled={mode == "table"} onClick={() => setMode("table")}>
        Table
      </button>
    </div>
  );
};

export default ModeSelection;
