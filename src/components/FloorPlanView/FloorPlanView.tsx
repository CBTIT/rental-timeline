import { useState, useEffect } from "react";
import type { LeaseData } from "../../types/lease";
import "./FloorPlanView.css";

type FloorPlanViewProps = {
  selectedUnit: string | null;
  unitData: LeaseData | null;
  onClose: () => void;
  base: string;
};

const FloorPlanView = ({
  selectedUnit,
  unitData,
  onClose,
  base,
}: FloorPlanViewProps) => {
  const [imageError, setImageError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const unitRow = selectedUnit ? unitData?.[selectedUnit] : null;
  const unitType = unitRow?.unitType;
  const imageSrc = unitType ? `${base}unit_plans/${unitType}.jpg` : null;

  useEffect(() => {
    setImageError(false);
    setFullscreen(false);
  }, [unitType]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    if (fullscreen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  return (
    <>
      <div className="floor-plan-view">
        <div className="floor-plan-header">
          <span className="floor-plan-title">
            Floor Plan{unitType ? ` — ${unitType}` : ""}
          </span>
          <button
            type="button"
            className="floor-plan-close"
            onClick={onClose}
            aria-label="Close floor plan"
          >
            ✕
          </button>
        </div>
        <div className="floor-plan-image-container">
          {imageSrc && !imageError ? (
            <img
              src={imageSrc}
              alt={`Floor plan for unit type ${unitType}`}
              className="floor-plan-image floor-plan-image-clickable"
              onClick={() => setFullscreen(true)}
              onError={() => setImageError(true)}
              title="Click to expand"
            />
          ) : (
            <div className="floor-plan-unavailable">
              Floor plan unavailable for this unit
            </div>
          )}
        </div>
      </div>

      {fullscreen && imageSrc && !imageError && (
        <div
          className="floor-plan-overlay"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan fullscreen view"
        >
          <button
            type="button"
            className="floor-plan-overlay-close"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
            aria-label="Close fullscreen floor plan"
          >
            ✕
          </button>
          <div
            className="floor-plan-overlay-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageSrc}
              alt={`Floor plan for unit type ${unitType}`}
              className="floor-plan-overlay-image"
            />
            <div className="floor-plan-overlay-details">
              <div className="fp-detail-unit">{selectedUnit}</div>
              <div className="fp-detail-row">
                <span className="fp-detail-label">Type</span>
                <span className="fp-detail-value">{unitRow?.unitType}</span>
              </div>
              <div className="fp-detail-row">
                <span className="fp-detail-label">Description</span>
                <span className="fp-detail-value">{unitRow?.description}</span>
              </div>
              <div className="fp-detail-row">
                <span className="fp-detail-label">Area</span>
                <span className="fp-detail-value">
                  {unitRow?.unitArea
                    ? `${unitRow.unitArea.toLocaleString()} SF`
                    : "—"}
                </span>
              </div>
              <div className="fp-detail-row">
                <span className="fp-detail-label">Rent</span>
                <span className="fp-detail-value fp-detail-accent">
                  {unitRow?.rent ? `$${unitRow.rent.toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloorPlanView;
