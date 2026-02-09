import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Rhino3dmLoader } from "three-stdlib";
import * as THREE from "three";
import type { LeaseData } from "../App";

type LevelUnitsProp = {
  level: string;
  leaseData: LeaseData | null;
  currentDate: Date | null;
  setLeasedUnits: React.Dispatch<React.SetStateAction<string[]>>;
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
}: LevelUnitsProp) => {
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
  const texMaterial = useMemo(() => {
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
        o.material = texMaterial;

        // ✅ never catch hover/click rays
        o.raycast = () => null;

        // ✅ draw on top (when depthTest is false)
        o.renderOrder = 999;
      }
    });
  }, [unitText, texMaterial]);
  useEffect(() => {
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = baseMaterial;
      }
    });
  }, [unitGeometry, baseMaterial]);
  useEffect(() => {
    if (!leaseData || !currentDate) return;

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const unitId = o.name;
      const row = leaseData[unitId];
      if (!row) {
        return;
      }
      const start = parseLeaseDate(row.leaseStartDate);
      if (!start) {
        return;
      }
      // console.log(start);
      // console.log(currentDate);
      if (start <= currentDate) {
        o.material = showMaterial;
      } else {
        o.material = baseMaterial;
      }
    });
  }, [unitGeometry, leaseData, currentDate]);
  useEffect(() => {
    if (!leaseData || !currentDate) return;

    const next = new Set<string>();

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;

      const unitId = o.name;
      const row = leaseData[unitId];
      const start = row ? parseLeaseDate(row.leaseStartDate) : null;

      if (start && start <= currentDate) {
        o.material = showMaterial;
        next.add(unitId);
      } else {
        o.material = baseMaterial;
      }
    });

    setLeasedUnits(Array.from(next));
  }, [unitGeometry, leaseData, currentDate, baseMaterial, showMaterial]);

  return (
    <>
      <primitive object={unitGeometry} dispose={null} />
      <primitive object={unitText} dispose={null} />
    </>
  );
};

export default LevelUnits;
