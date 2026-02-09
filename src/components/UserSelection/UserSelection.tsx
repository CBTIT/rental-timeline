import TimeSlider from "../TimeSlider/TimeSlider";
import LevelSelector from "../LevelSelector/LevelSelector";
import ViewCotextButton from "../ViewContextButton/ViewContextButton";
import "./UserSelection.css";
type UserSelectionTypes = {
  setViewContext: React.Dispatch<React.SetStateAction<string>>;
  viewContext: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  days: number;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
};
const UserSelection = ({
  setViewContext,
  viewContext,
  setLevel,
  days,
  currentDay,
  setCurrentDay,
}: UserSelectionTypes) => {
  return (
    <div className="user-selection">
      <div className="views">
        <ViewCotextButton
          text={"2D"}
          onClick={setViewContext}
          isDisabled={viewContext == "2D"}
        />
        <ViewCotextButton
          text={"3D"}
          onClick={setViewContext}
          isDisabled={viewContext == "3D"}
        />
      </div>

      <LevelSelector setLevel={setLevel} />
      <TimeSlider
        days={days}
        currentDay={currentDay}
        setCurrentDay={setCurrentDay}
      />
    </div>
  );
};

export default UserSelection;
