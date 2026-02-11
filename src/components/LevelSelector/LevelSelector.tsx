import "./Level Selector.css";
import React from "react";
type LevelSelectorProps = {
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
};
const LevelSelector = ({ level, setLevel }: LevelSelectorProps) => {
  return (
    <select
      className="level-selector"
      defaultValue={level}
      onChange={(e) => setLevel(e.target.value)}
    >
      <option value={"1"}>Level 1</option>
      <option value={"2"}>Level 2</option>
      <option value={"3"}>Level 3</option>
      <option value={"4"}>Level 4</option>
      <option value={"5"}>Level 5</option>
      <option value={"6"}>Level 6</option>
      <option value={"7"}>Level 7</option>
      <option value={"8"}>Level 8</option>
    </select>
  );
};

export default LevelSelector;
