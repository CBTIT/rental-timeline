import "./HUD.css";

type HUDProps = {
  date: string;
};

const HUD = ({ date }: HUDProps) => {
  return (
    <div className="HUD">
      <div className="date">{date}</div>
    </div>
  );
};

export default HUD;
