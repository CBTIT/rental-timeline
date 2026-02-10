import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Rhino3dmLoader } from "three-stdlib";
import * as THREE from "three";
import type { LeaseData } from "../App";

type LevelUnitsProp = {
  level: string;
  leaseData: LeaseData | null;
  currentDate: Date | null;
  setLeasedUnits: React.Dispatch<React.SetStateAction<string[]>>;
  selectedUnit: string | null;
  setSelectedUnit: React.Dispatch<React.SetStateAction<string | null>>;
  mode: string;
};

function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

const LevelUnits = ({
  level,
  leaseData,
  currentDate,
  setLeasedUnits,
  setSelectedUnit,
  selectedUnit,
  mode,
}: LevelUnitsProp) => {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const maxPointerDelta = 6;
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxPointerDelta) return;
    const name = e.object.name;
    setSelectedUnit(name);
  };
  const unitGeometry = useLoader(
    Rhino3dmLoader,
    `/floor_units/level_${level}.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );
  const unitText = useLoader(
    Rhino3dmLoader,
    `/unit_texts/level_${level}.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );
  const textMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x2a2a2a, // dark gray/black
      transparent: true,
      opacity: 1,
    });

    // Optional: keep labels always visible over units
    m.depthTest = true;
    m.depthWrite = true;

    return m;
  }, []);
  const selectedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffc107, // yellow-ish highlight
        roughness: 0.35,
        metalness: 0.1,
        emissive: new THREE.Color(0x332200), // subtle glow
        emissiveIntensity: 0.6,
      }),
    [],
  );

  const baseMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xd2d2d2, // very light
      roughness: 1.0,
      metalness: 0.0,
    });
    // Helps with transparent surfaces not “blocking” others
    m.depthWrite = true;
    return m;
  }, []);
  const showMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x59a310, // bold (maroon-ish). change to whatever.
        roughness: 0.4,
        metalness: 0.05,
      }),
    [],
  );

  useEffect(() => {
    unitText.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = textMaterial;

        // ✅ never catch hover/click rays
        o.raycast = () => null;

        // ✅ draw on top (when depthTest is false)
        o.renderOrder = 999;
      }
    });
  }, [unitText, textMaterial]);
  useEffect(() => {
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.raycast = THREE.Mesh.prototype.raycast;
        o.material = baseMaterial;
      }
    });
  }, [unitGeometry, baseMaterial]);
  useEffect(() => {
    if (!leaseData || !currentDate) return;

    const next = new Set<string>();

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;

      const unitId = o.name;
      const row = leaseData[unitId];
      const start = row ? parseLeaseDate(row.leaseStartDate) : null;

      const isLeased = !!(start && start <= currentDate);
      const isSelected = !!(selectedUnit && unitId === selectedUnit);

      if (isLeased) next.add(unitId);

      if (isSelected) {
        o.material = selectedMaterial;
      } else if (isLeased) {
        o.material = showMaterial;
      } else {
        o.material = baseMaterial;
      }
    });

    setLeasedUnits(Array.from(next));
  }, [
    unitGeometry,
    leaseData,
    currentDate,
    selectedUnit,
    baseMaterial,
    showMaterial,
    selectedMaterial,
    setLeasedUnits,
  ]);

  return (
    <>
      <primitive
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        object={unitGeometry}
        dispose={null}
      />
      <primitive object={unitText} dispose={null} />
    </>
  );
};

export default LevelUnits;
