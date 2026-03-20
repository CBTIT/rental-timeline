import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Rhino3dmLoader } from "three-stdlib";
import * as THREE from "three";
import type {} from "../../App";
import type { LeaseData } from "../../types/lease";
import { createUnitMaterials, disposeUnitMaterials } from "./materials";
import { getUnitMaterial, getUnitVisualState } from "./leaseUtils";

type LevelUnitsProp = {
  level: string;
  leaseData: LeaseData | null;
  currentDate: Date | null;
  setLeasedUnits: React.Dispatch<React.SetStateAction<string[]>>;
  selectedUnit: string | null;
  setSelectedUnit: React.Dispatch<React.SetStateAction<string | null>>;
  mode: string;
  viewContext: string;
  selectedLeasedColor: string;
  firstLeaseDate: Date | null;
  totalDays: number;
  bucketCount: number;
};

const LevelUnits = ({
  level,
  leaseData,
  currentDate,
  setLeasedUnits,
  setSelectedUnit,
  selectedUnit,
  mode,
  viewContext,
  selectedLeasedColor,
  firstLeaseDate,
  totalDays,
  bucketCount,
}: LevelUnitsProp) => {
  //getting material set and disposing older material
  const materials = useMemo(
    () => createUnitMaterials(selectedLeasedColor, bucketCount),
    [selectedLeasedColor, bucketCount],
  );
  useEffect(() => {
    return () => disposeUnitMaterials(materials);
  }, [materials]);

  //loading base path for asset path creation
  const base = import.meta.env.BASE_URL;

  //unit selection logic
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const maxPointerDelta = 6;
  
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  }, []);
  
  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxPointerDelta) return;
      const name = e.object.name;
      setSelectedUnit(name);
    },
    [setSelectedUnit],
  );

  //loading unit geometries
  const unitGeometry = useLoader(
    Rhino3dmLoader,
    base + `floor_units/allUnits.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );

  //loading unit texts
  const unitText = useLoader(
    Rhino3dmLoader,
    base + `unit_texts/level_${level}.3dm`,
    (loader) => {
      loader.setLibraryPath(
        "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/",
      );
    },
  );
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

      const lines = new THREE.LineSegments(edges, materials.outline);
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
  }, [unitGeometry, materials]);

  useEffect(() => {
    unitText.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = materials.text;

        // ✅ never catch hover/click rays
        o.raycast = () => null;

        // ✅ draw on top (when depthTest is false)
        o.renderOrder = 999;
      }
    });
  }, [unitText, materials]);
  useEffect(() => {
    const in2D = viewContext === "2D";
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = materials.base;
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
  }, [unitGeometry, materials.base, level, mode, viewContext]);
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

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (!o.visible) return;

      const unitId = o.name;
      const { isLeased, isSelected, isAffordable, bucketIndex } =
        getUnitVisualState({
          unitId,
          leaseData,
          currentDate,
          selectedUnit,
          firstLeaseDate,
          totalDays,
          bucketCount,
        });

      if (isLeased) next.add(unitId);

      o.material = getUnitMaterial({
        mode,
        viewContext,
        isSelected,
        isLeased,
        isAffordable,
        bucketIndex,
        materials,
      });
    });

    setLeasedUnits(Array.from(next));
  }, [
    unitGeometry,
    leaseData,
    currentDate,
    selectedUnit,
    materials,
    setLeasedUnits,
    level,
    mode,
    viewContext,
    firstLeaseDate,
    totalDays,
    bucketCount,
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
