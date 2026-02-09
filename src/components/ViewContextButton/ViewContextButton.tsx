import React from "react";
import "./ViewContextButton.css";
type ViewContextButtonProps = {
  text: string;
  onClick: React.Dispatch<React.SetStateAction<string>>;
  isDisabled: boolean;
};
const ViewCotextButton = ({
  text,
  onClick,
  isDisabled,
}: ViewContextButtonProps) => {
  return (
    <button
      className="view-button"
      disabled={isDisabled}
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
};

export default ViewCotextButton;
