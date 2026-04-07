import type { ThreeEvent } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import * as THREE from "three";
import type {} from "../../App";
import type { LeaseData } from "../../types/lease";
import { createUnitMaterials, disposeUnitMaterials } from "./materials";
import { getUnitMaterial, getUnitVisualState } from "./leaseUtils";
import { perfLog, perfNow } from "../../utils/perf";
import { getRhino3dmLibPath, getSharedRhino3dmLoader } from "../../utils/rhino3dm";
import type {
  ColorMode,
  UnitTypeCategory,
  UnitTypeLegendCategory,
} from "../../types/coloring";

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
  colorMode: ColorMode;
  unitTypeColors: Record<UnitTypeCategory, string>;
  affordableColor: string;
  unitTypeFilter: UnitTypeLegendCategory | null;
  firstLeaseDate: Date | null;
  totalDays: number;
  bucketCount: number;
};

const getNumericUnitToken = (name: string) => {
  const token = name.match(/\d+/)?.[0];
  return token ?? null;
};

const resolveUnitId = (name: string, leaseData: LeaseData | null) => {
  if (!leaseData) return null;
  if (Object.hasOwn(leaseData, name)) return name;
  const numericToken = getNumericUnitToken(name);
  if (!numericToken) return null;
  if (Object.hasOwn(leaseData, numericToken)) return numericToken;
  return null;
};

const isUnitOnLevel = (
  name: string,
  level: string,
  leaseData: LeaseData | null,
) => {
  const resolved = resolveUnitId(name, leaseData);
  if (resolved) return resolved.startsWith(level);
  if (name.startsWith(level)) return true;
  const numericToken = getNumericUnitToken(name);
  return !!numericToken && numericToken.startsWith(level);
};

/** Matches HUD level buttons — used to prefetch all unit-number layers. */
const LEVEL_UNIT_TEXT_IDS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

const unitTextLevelCache = new Map<string, THREE.Object3D>();
const unitTextLevelInflight = new Map<string, Promise<THREE.Object3D>>();

let allUnitsCache: THREE.Object3D | null = null;
let allUnitsInflight: Promise<THREE.Object3D> | null = null;

function loadAllUnits(base: string): Promise<THREE.Object3D> {
  if (allUnitsCache) return Promise.resolve(allUnitsCache);
  if (allUnitsInflight) return allUnitsInflight;

  const loader = getSharedRhino3dmLoader();
  loader.setLibraryPath(getRhino3dmLibPath());
  const start = perfNow();

  allUnitsInflight = new Promise<THREE.Object3D>((resolve, reject) => {
    loader.load(
      base + "floor_units/allUnits.3dm",
      (obj) => {
        allUnitsCache = obj;
        allUnitsInflight = null;
        perfLog("floor_units/allUnits.3dm loader.load (download+parse)", start);
        resolve(obj);
      },
      undefined,
      (err) => {
        allUnitsInflight = null;
        perfLog("floor_units/allUnits.3dm loader.load (failed)", start);
        reject(err);
      },
    );
  });

  return allUnitsInflight;
}

function loadUnitTextForLevel(levelKey: string, base: string): Promise<THREE.Object3D> {
  const cached = unitTextLevelCache.get(levelKey);
  if (cached) return Promise.resolve(cached);

  const inflight = unitTextLevelInflight.get(levelKey);
  if (inflight) return inflight;

  const p = new Promise<THREE.Object3D>((resolve, reject) => {
    const loader = getSharedRhino3dmLoader();
    const start = perfNow();
    loader.load(
      base + `unit_texts/level_${levelKey}.3dm`,
      (obj) => {
        unitTextLevelCache.set(levelKey, obj);
        unitTextLevelInflight.delete(levelKey);
        perfLog(`unit_texts/level_${levelKey}.3dm loader.load (download+parse)`, start);
        resolve(obj);
      },
      undefined,
      (err) => {
        unitTextLevelInflight.delete(levelKey);
        console.error(`Failed to load unit text for level ${levelKey}`, err);
        perfLog(`unit_texts/level_${levelKey}.3dm loader.load (failed)`, start);
        reject(err);
      },
    );
  });
  unitTextLevelInflight.set(levelKey, p);
  return p;
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
  selectedLeasedColor,
  colorMode,
  unitTypeColors,
  affordableColor,
  unitTypeFilter,
  firstLeaseDate,
  totalDays,
  bucketCount,
}: LevelUnitsProp) => {
  // Stable key so materials useMemo does not invalidate when parent passes a new object ref with same contents (prevents lease effect ↔ setLeasedUnits loops).
  const unitTypeColorsKey = useMemo(
    () => JSON.stringify(unitTypeColors),
    [unitTypeColors],
  );

  //getting material set and disposing older material
  const materials = useMemo(
    () =>
      createUnitMaterials(
        selectedLeasedColor,
        unitTypeColors,
        affordableColor,
        bucketCount,
      ),
    [selectedLeasedColor, unitTypeColorsKey, affordableColor, bucketCount],
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

  // loading unit geometries (shared loader + shared cache to avoid duplicate rhino3dm runtime fetches)
  const [unitGeometry, setUnitGeometry] = useState<THREE.Object3D | null>(() => allUnitsCache);

  useEffect(() => {
    let cancelled = false;
    if (unitGeometry) return;

    loadAllUnits(base)
      .then((obj) => {
        if (cancelled) return;
        setUnitGeometry(obj);
      })
      .catch(() => {
        if (cancelled) return;
        setUnitGeometry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [base, unitGeometry]);

  //loading unit texts (cached + prefetched so level switches align with geometry)
  const [unitText, setUnitText] = useState<THREE.Object3D | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  useLayoutEffect(() => {
    if (mode !== "levels") {
      setUnitText(null);
      return;
    }
    const cached = unitTextLevelCache.get(level);
    if (cached) {
      setUnitText(cached);
    } else {
      setUnitText(null);
    }
  }, [mode, level]);

  useEffect(() => {
    if (mode !== "levels") return;

    const levelForRequest = level;
    let cancelled = false;

    loadUnitTextForLevel(levelForRequest, base)
      .then((obj) => {
        if (cancelled) return;
        if (levelRef.current !== levelForRequest) return;
        setUnitText(obj);
      })
      .catch(() => {
        if (cancelled) return;
        if (levelRef.current !== levelForRequest) return;
        setUnitText(null);
      });

    return () => {
      cancelled = true;
    };
  }, [base, level, mode]);

  useEffect(() => {
    if (mode !== "levels") return;
    // Startup optimization: don't immediately fetch+parse all unit text layers on first paint.
    // Prefetch in idle time so initial load prioritizes core geometry + UI.
    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      for (const levelId of LEVEL_UNIT_TEXT_IDS) {
        if (levelId === level) continue; // current level is fetched on-demand by the other effect
        loadUnitTextForLevel(levelId, base).catch(() => {});
      }
    }, 10000) as unknown as number;

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [mode, base, level]);

  // Add outlines only for the active level in Levels mode 2D view.
  useEffect(() => {
    if (mode !== "levels" || viewContext !== "2D") return;

    let levelMatchCount = 0;
    if (!unitGeometry) return;

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (isUnitOnLevel(o.name, level, leaseData)) levelMatchCount += 1;
    });

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const strictMatch = isUnitOnLevel(o.name, level, leaseData);
      const shouldOutline = levelMatchCount > 0 ? strictMatch : true;
      const existing = o.children.find((c) => c.name === "__outline__");

      if (!shouldOutline) {
        if (existing) {
          o.remove(existing);
        }
        return;
      }

      // avoid duplicating if effect reruns
      if (existing) return;

      const edges = new THREE.EdgesGeometry(o.geometry, 15);

      const lines = new THREE.LineSegments(edges, materials.outline);
      lines.name = "__outline__";

      // keep outlines visible
      lines.renderOrder = (o.renderOrder ?? 0) + 1;
      lines.material.depthWrite = false;

      o.add(lines);
    });

    return () => {
      // cleanup when switching modes/views
      unitGeometry.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const lines = o.children.find((c) => c.name === "__outline__");
        if (lines) o.remove(lines);
      });
    };
  }, [unitGeometry, materials, viewContext, mode, level, leaseData]);

  useEffect(() => {
    if (!unitText) return;

    const in2DLevels = viewContext === "2D" && mode === "levels";
    const textMat = in2DLevels
      ? (() => {
          const m = materials.text.clone();
          m.depthTest = false;
          m.depthWrite = false;
          m.needsUpdate = true;
          return m;
        })()
      : materials.text;

    unitText.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = textMat;

        // ✅ never catch hover/click rays
        o.raycast = () => null;

        // ✅ draw on top (when depthTest is false)
        o.renderOrder = 999;
      }
    });

    return () => {
      if (textMat !== materials.text) textMat.dispose();
    };
  }, [unitText, materials, viewContext, mode]);
  useEffect(() => {
    const in2D = viewContext === "2D";
    let levelMatchCount = 0;

    if (!unitGeometry) return;
    if (mode === "levels") {
      unitGeometry.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        if (isUnitOnLevel(o.name, level, leaseData)) levelMatchCount += 1;
      });
    }

    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (mode == "levels") {
          const strictMatch = isUnitOnLevel(o.name, level, leaseData);
          const shouldShow = levelMatchCount > 0 ? strictMatch : true;
          if (shouldShow) {
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
  }, [unitGeometry, level, mode, viewContext, leaseData]);

  useEffect(() => {
    if (mode !== "combined") return;

    if (!unitGeometry) return;
    let i = 0;
    unitGeometry.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.renderOrder = i++; // deterministic order
      }
    });
  }, [unitGeometry, mode]);

  useEffect(() => {
    if (!leaseData || !currentDate) return;
    if (!unitGeometry) return;

    const next = new Set<string>();

    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (!o.visible) return;

      const unitId = resolveUnitId(o.name, leaseData) ?? o.name;
      const {
        isLeased,
        isSelected,
        isAffordable,
        bucketIndex,
        unitTypeCategory,
      } = getUnitVisualState({
        unitId,
        leaseData,
        currentDate,
        selectedUnit,
        firstLeaseDate,
        totalDays,
        bucketCount,
      });

      if (isLeased) next.add(unitId);

      const matchesTypeFilter =
        !unitTypeFilter || unitTypeCategory === unitTypeFilter;
      const isLeasedInFilteredView = isLeased && matchesTypeFilter;

      o.material = getUnitMaterial({
        mode,
        viewContext,
        colorMode,
        isSelected,
        isLeased: isLeasedInFilteredView,
        isAffordable: isAffordable && isLeasedInFilteredView,
        bucketIndex,
        unitTypeCategory,
        materials,
      });
    });

    const nextArr = Array.from(next);
    setLeasedUnits((prev) => {
      if (
        prev.length === nextArr.length &&
        prev.every((u, i) => u === nextArr[i])
      ) {
        return prev;
      }
      const prevSet = new Set(prev);
      if (
        prevSet.size === next.size &&
        nextArr.every((u) => prevSet.has(u))
      ) {
        return prev;
      }
      return nextArr;
    });
  }, [
    unitGeometry,
    leaseData,
    currentDate,
    selectedUnit,
    materials,
    mode,
    viewContext,
    colorMode,
    unitTypeFilter,
    firstLeaseDate,
    totalDays,
    bucketCount,
    level,
  ]);

  return (
    <>
      {unitGeometry && (
        <primitive
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          object={unitGeometry}
          dispose={null}
        />
      )}
      {mode === "levels" && unitText && (
        <primitive object={unitText} dispose={null} />
      )}
    </>
  );
};

export default LevelUnits;
