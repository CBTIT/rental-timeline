import "./Level Selector.css";
import React from "react";
type LevelSelectorProps = {
  setLevel: React.Dispatch<React.SetStateAction<string>>;
};
const LevelSelector = ({ setLevel }: LevelSelectorProps) => {
  return (
    <select
      className="level-selector"
      defaultValue={"1"}
      onChange={(e) => setLevel(e.target.value)}
    >
      <option value={"1"}>Level 1</option>
      <option value={"2"}>Level 2</option>
    </select>
  );
};

export default LevelSelector;
