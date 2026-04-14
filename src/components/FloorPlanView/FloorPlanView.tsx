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
  const [fullscreen, setFullscreen] = useState(true);

  const unitRow = selectedUnit ? unitData?.[selectedUnit] : null;
  const unitNumber = selectedUnit?.trim() ?? null;
  const imageSrc = unitNumber
    ? `${base}unit_plans/${encodeURIComponent(unitNumber)}.jpg`
    : null;

  useEffect(() => {
    setImageError(false);
    setFullscreen(true);
  }, [unitNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (fullscreen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onClose]);

  return (
    <>
      {fullscreen && imageSrc && !imageError && (
        <div
          className="floor-plan-overlay"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan fullscreen view"
        >
          <button
            type="button"
            className="floor-plan-overlay-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
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
              alt={`Floor plan for unit ${unitNumber}`}
              className="floor-plan-overlay-image"
              onError={() => setImageError(true)}
            />
            <div className="floor-plan-overlay-details">
              <div className="fp-detail-unitheader">
                <div className="fp-detail-unitheader-label">Unit number</div>
                <div className="fp-detail-unitheader-value">{selectedUnit}</div>
              </div>
              <div className="fp-detail-table" role="table" aria-label="Unit details">
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Type
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.unitType ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Description
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.description ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Area
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.unitArea
                      ? `${unitRow.unitArea.toLocaleString()} SF`
                      : "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Lease Start
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.leaseStartDate ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Lease End
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.leaseEndDate ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Rent
                  </span>
                  <span className="fp-detail-value fp-detail-accent" role="cell">
                    {unitRow?.rent != null ? `$${String(unitRow.rent)}` : "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Free Months
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.freeMonths ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Leasing Associate
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.leasingAssociate ?? "—"}
                  </span>
                </div>
                <div className="fp-detail-row" role="row">
                  <span className="fp-detail-label" role="cell">
                    Affordable
                  </span>
                  <span className="fp-detail-value" role="cell">
                    {unitRow?.affordable ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullscreen && (!imageSrc || imageError) && (
        <div
          className="floor-plan-overlay"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan unavailable"
        >
          <button
            type="button"
            className="floor-plan-overlay-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close floor plan"
          >
            ✕
          </button>
          <div
            className="floor-plan-overlay-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="floor-plan-unavailable">
              Floor plan unavailable for this unit
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloorPlanView;
