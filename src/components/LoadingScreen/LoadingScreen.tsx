import { useEffect, useState } from "react";
import "./LoadingScreen.css";

interface LoadingScreenProps {
  onDone: () => void;
}

const LoadingScreen = ({ onDone }: LoadingScreenProps) => {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setOut(true), 1000);
    const doneTimer = setTimeout(onDone, 1330);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`ls-screen${out ? " ls-screen--out" : ""}`}>
      <div className="ls-content">
        <h1 className="ls-title">Lease Visualizer</h1>
        <p className="ls-subtitle">Fenway Kilmarnock</p>
        <div className="ls-bar-track">
          <div className="ls-bar-fill" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
