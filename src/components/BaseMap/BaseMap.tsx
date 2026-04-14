import { useEffect, memo, useState } from "react";
import * as THREE from "three";
import { perfLog, perfNow } from "../../utils/perf";
import { getSharedRhino3dmLoader } from "../../utils/rhino3dm";
import { useCompactViewport } from "../../hooks/useCompactViewport";

type BaseMapProps = {
  viewContext: string;
  mode: string;
};

function ensureOpaqueMaterial(m: THREE.Material): void {
  m.transparent = false;
  m.opacity = 1;
  m.depthWrite = true;
  m.depthTest = true;
  // Lets both faces participate in shadow map / self-shadowing for thick shells.
  if (
    m instanceof THREE.MeshStandardMaterial ||
    m instanceof THREE.MeshPhysicalMaterial ||
    m instanceof THREE.MeshLambertMaterial ||
    m instanceof THREE.MeshPhongMaterial
  ) {
    m.shadowSide = THREE.DoubleSide;
  }
  m.needsUpdate = true;
}

function setShadowFlags(o: THREE.Mesh | THREE.InstancedMesh): void {
  o.castShadow = true;
  o.receiveShadow = true;
  o.renderOrder = -1;
}

function prepareContextObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    child.userData.excludeFromCameraFit = true;
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      setShadowFlags(child);
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        ensureOpaqueMaterial(mat);
      }
    }
  });
}

const BaseMap = ({ viewContext, mode }: BaseMapProps) => {
  const base = import.meta.env.BASE_URL;
  const [contextModel, setContextModel] = useState<THREE.Object3D | null>(null);
  const compactViewport = useCompactViewport();

  useEffect(() => {
    // Mobile/compact: skip loading the heavy context model to reduce GPU memory
    // pressure and avoid WebGL context loss/reloads.
    if (compactViewport) {
      setContextModel(null);
      return;
    }

    let cancelled = false;
    const loader = getSharedRhino3dmLoader();

    const loadStart = perfNow();
    loader.load(
      base + "context.3dm",
      (obj) => {
        if (cancelled) return;
        perfLog("context.3dm loader.load (download+parse)", loadStart);

        const prepareStart = perfNow();
        prepareContextObject(obj);
        perfLog("context.3dm prepareContextObject (traverse/material)", prepareStart);
        setContextModel(obj);
      },
      undefined,
      (err) => {
        console.error("Failed to load context.3dm", err);
        if (cancelled) return;
        perfLog("context.3dm loader.load (failed)", loadStart);
        setContextModel(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [base, compactViewport]);

  const is3D = viewContext === "3D";
  const showContext = !compactViewport && is3D && mode !== "table";

  return (
    <>
      {showContext && contextModel && (
        <primitive object={contextModel} dispose={null} />
      )}
    </>
  );
};

export default memo(BaseMap);
