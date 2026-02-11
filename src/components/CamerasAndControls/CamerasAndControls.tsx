import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  MapControls,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MapControls as ThreeMapControls } from "three-stdlib";

type CameraAndControlsProps = {
  viewContext: string;
  level: string;
};

const CamerasAndControls = ({ viewContext, level }: CameraAndControlsProps) => {
  // ✅ set this to your basemap plane Z
  const floorZ = 0;
  const floorPadding = 1;

  const orbitRef = useRef<any>(null);
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);
  const mapRef = useRef<ThreeMapControls | null>(null);

  const { camera } = useThree();

  // Your 2D fixed setup
  const orthoPos = useMemo(() => new THREE.Vector3(0, 30000, 100000), []);
  const orthoTarget = useMemo(() => new THREE.Vector3(0, 30000, 0), []);

  useEffect(() => {
    if (viewContext !== "2D") return;

    const cam = orthoCamRef.current;
    const ctrls = mapRef.current;
    if (!cam || !ctrls) return;

    cam.position.copy(orthoPos);
    ctrls.target.copy(orthoTarget);

    ctrls.update();
    cam.lookAt(orthoTarget);
    cam.updateProjectionMatrix();
  }, [viewContext, orthoPos, orthoTarget, level]);

  // ✅ Clamp only in 3D (OrbitControls active)
  useFrame(() => {
    if (viewContext !== "3D") return;

    // keep camera above floor
    if (camera.position.z < floorZ + floorPadding) {
      camera.position.z = floorZ + floorPadding;
    }

    // keep orbit target above floor
    if (orbitRef.current) {
      const t = orbitRef.current.target as THREE.Vector3;
      if (t.z < floorZ) t.z = floorZ;
      orbitRef.current.update();
    }
  });

  if (viewContext === "2D") {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 30000, 100000]}
          near={0.1}
          far={500000}
          zoom={0.008}
          ref={orthoCamRef}
        />
        <MapControls
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          screenSpacePanning
          panSpeed={1}
          zoomSpeed={1}
          target={[0, 30000, 0]}
          ref={mapRef}
        />
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera
        position={[0, -80000, 200000]}
        up={[0, 0, 1]}
        zoom={0.5}
        near={1000}
        far={2000000}
        makeDefault
        fov={25}
      />
      <OrbitControls
        ref={orbitRef}
        target={[0, 30000, 0]}
        enableDamping
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
};

export default CamerasAndControls;
