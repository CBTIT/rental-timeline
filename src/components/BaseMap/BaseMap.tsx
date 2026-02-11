import { useTexture } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Rhino3dmLoader } from "three-stdlib";

type BaseMapProps = {
  level: string;
  viewContext: string;
  mode: string;
};

const BaseMap = ({ level, viewContext, mode }: BaseMapProps) => {
  const baseMap = useLoader(Rhino3dmLoader, "/base_map/base.3dm", (loader) => {
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");
  });
  const tex = useTexture("/textures/satellite.jpg");
  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: true,
    });
  }, [tex]);
  useEffect(() => {
    baseMap.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = mat;
      (o.material as THREE.Material).needsUpdate = true;
    });
  }, [baseMap, mat]);
  const isLevel1 = level === "1";
  const is3D = viewContext === "3D";
  if (mode === "table") return;
  if (is3D && mode === "levels" && !isLevel1) return;
  if (!is3D && mode === "combined") return;
  return <primitive object={baseMap} dispose={null} />;
};

export default BaseMap;
