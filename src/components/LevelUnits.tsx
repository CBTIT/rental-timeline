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
  viewContext: string;
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
  viewContext,
}: LevelUnitsProp) => {
  const base = import.meta.env.BASE_URL;
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
    base + `floor_units/allUnits.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );
  const unitText = useLoader(
    Rhino3dmLoader,
    base + `unit_texts/level_${level}.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );
  const outlineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.35,
      depthTest: true,
      depthWrite: false,
    });
  }, []);
  useEffect(() => {
    if (viewContext === "2D" && mode === "combined") return;
    // add outlines once
    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;

      // avoid duplicating if effect reruns
      const already = o.children.find((c) => c.name === "__outline__");
      if (already) return;

      const edges = new THREE.EdgesGeometry(o.geometry, 25);
      // ↑ thresholdAngle: bigger => fewer edges (try 5–30)

      const lines = new THREE.LineSegments(edges, outlineMat);
      lines.name = "__outline__";

      // keep outlines visible
      lines.renderOrder = (o.renderOrder ?? 0) + 1;

      // IMPORTANT for your translucent combined mode:
      // don't let outline write depth or it will kill stacking
      lines.material.depthWrite = false;

      o.add(lines);
    });

    return () => {
      // cleanup if component unmounts
      unitGeometry.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const lines = o.children.find((c) => c.name === "__outline__");
        if (lines) o.remove(lines);
      });
    };
  }, [unitGeometry, outlineMat]);
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
  const combinedBaseMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, // pick your base heat color
      transparent: true,
      opacity: 0.1, // low per-layer opacity so stacking accumulates
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false, // IMPORTANT: don't write depth or you'll block layers behind
    });
    return m;
  }, []);
  const combinedLeasedMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x2e6f40,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return m;
  }, []);

  const combinedSelectedMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffc107,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return m;
  }, []);
  const baseMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, // very light
      roughness: 1.0,
      metalness: 0.0,
    });
    // Helps with transparent surfaces not “blocking” others
    m.depthWrite = true;
    return m;
  }, []);
  const leasedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x56ae57, // bold (maroon-ish). change to whatever.
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
    const in2D = viewContext === "2D";
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = baseMaterial;
        if (mode == "levels") {
          if (o.name.startsWith(level)) {
            o.visible = true;

            o.raycast = THREE.Mesh.prototype.raycast;
          } else {
            o.visible = false;
            o.raycast = () => null;
          }
        } else if (mode == "combined") {
          o.visible = true;

          o.raycast = in2D
            ? (o.raycast = () => null)
            : THREE.Mesh.prototype.raycast;
        }
      }
    });
  }, [unitGeometry, baseMaterial, level, mode, viewContext]);
  useEffect(() => {
    if (mode !== "combined") return;

    let i = 0;
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.renderOrder = i++; // deterministic order
      }
    });
  }, [unitGeometry, mode]);

  useEffect(() => {
    if (!leaseData || !currentDate) return;

    const next = new Set<string>();
    const inCombined = mode === "combined";
    const in2D = viewContext === "2D";
    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (!o.visible) return;

      const unitId = o.name;
      const row = leaseData[unitId];
      const start = row ? parseLeaseDate(row.leaseStartDate) : null;

      const isLeased = !!(start && start <= currentDate);
      const isSelected = !!(selectedUnit && unitId === selectedUnit);

      if (isLeased) next.add(unitId);

      if (isSelected) {
        o.material = inCombined
          ? in2D
            ? combinedSelectedMaterial
            : selectedMaterial
          : selectedMaterial;
      } else if (isLeased) {
        o.material = inCombined
          ? in2D
            ? combinedLeasedMaterial
            : leasedMaterial
          : leasedMaterial;
      } else {
        o.material = inCombined
          ? in2D
            ? combinedBaseMaterial
            : baseMaterial
          : baseMaterial;
      }
    });

    setLeasedUnits(Array.from(next));
  }, [
    unitGeometry,
    leaseData,
    currentDate,
    selectedUnit,
    baseMaterial,
    leasedMaterial,
    selectedMaterial,
    setLeasedUnits,
    level,
    mode,
    viewContext,
  ]);

  return (
    <>
      <primitive
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        object={unitGeometry}
        dispose={null}
      />
      {mode === "levels" && <primitive object={unitText} dispose={null} />}
    </>
  );
};

export default LevelUnits;
