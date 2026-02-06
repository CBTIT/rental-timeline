import "./TimeSlider.css";

type TimeSliderProps = {
  days: number;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
};

const TimeSlider = ({ days, currentDay, setCurrentDay }: TimeSliderProps) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let selectedDay = e.target.value;
    setCurrentDay(Number(selectedDay));
  };
  return (
    <div className="slider-container">
      <input
        type="range"
        id="time-slider"
        min="1"
        max={`${days}`}
        value={currentDay}
        onChange={handleSliderChange}
      />
    </div>
  );
};

export default TimeSlider;
