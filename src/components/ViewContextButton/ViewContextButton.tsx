import React from "react";
import "./ViewContextButton.css";
type ViewContextButtonProps = {
  text: string;
  onClick: React.Dispatch<React.SetStateAction<string>>;
  isDisabled: boolean;
  isActive: boolean;
};
const ViewCotextButton = ({
  text,
  onClick,
  isDisabled,
  isActive,
}: ViewContextButtonProps) => {
  return (
    <button
      className={`view-button ${isActive ? "active" : ""}`}
      disabled={isDisabled}
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
};

export default ViewCotextButton;
