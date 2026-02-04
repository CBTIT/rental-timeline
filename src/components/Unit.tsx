import { useLoader } from "@react-three/fiber";
import { Rhino3dmLoader } from "three-stdlib";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";

type UnitProps = {
  location: string;
  unitId: string;
  isHovered: boolean;
  onHover: (id: string | null) => void;
};

const Unit = ({ location, unitId, isHovered, onHover }: UnitProps) => {
  const baseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f39cc0",
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.FrontSide,
      }),
    [],
  );

  const hoverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd166",
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.FrontSide,
      }),
    [],
  );
  const object = useLoader(Rhino3dmLoader, location, (loader) => {
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");
  }) as THREE.Object3D;
  useEffect(() => {
    object.userData.unitId = unitId;
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;

        o.material = isHovered ? hoverMat : baseMat;
      }
    });
  }, [object, unitId, isHovered, baseMat, hoverMat]);
  return (
    <primitive
      object={object}
      dispose={null}
      onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(unitId);
      }}
      onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        console.log(`${unitId} unit clicked`);
      }}
    />
  );
};

export default Unit;
