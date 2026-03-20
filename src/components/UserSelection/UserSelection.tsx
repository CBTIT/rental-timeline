import TimeSlider from "../TimeSlider/TimeSlider";
import ViewContextButton from "../ViewContextButton/ViewContextButton";
import { memo } from "react";
import "./UserSelection.css";
type UserSelectionTypes = {
  setViewContext: React.Dispatch<React.SetStateAction<string>>;
  viewContext: string;
  days: number;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
};
const UserSelection = ({
  setViewContext,
  viewContext,
  days,
  currentDay,
  setCurrentDay,
}: UserSelectionTypes) => {
  return (
    <div className="user-selection">
      <div className="views">
        <ViewContextButton
          text={"2D"}
          onClick={setViewContext}
          isDisabled={viewContext == "2D"}
          isActive={viewContext == "2D"}
        />
        <ViewContextButton
          text={"3D"}
          onClick={setViewContext}
          isDisabled={viewContext == "3D"}
          isActive={viewContext == "3D"}
        />
      </div>
      <TimeSlider
        days={days}
        currentDay={currentDay}
        setCurrentDay={setCurrentDay}
      />
    </div>
  );
};

export default memo(UserSelection);
