import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  MapControls,
} from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MapControls as ThreeMapControls } from "three-stdlib";

type CameraAndControlsProps = {
  viewContext: string;
  level: string;
};

const CamerasAndControls = ({ viewContext, level }: CameraAndControlsProps) => {
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);
  const mapRef = useRef<ThreeMapControls | null>(null);
  const orthoPos = useMemo(() => new THREE.Vector3(0, 30000, 100000), []);
  const orthoTarget = useMemo(() => new THREE.Vector3(0, 30000, 0), []);
  useEffect(() => {
    if (viewContext !== "2D") return;

    const cam = orthoCamRef.current;
    const ctrls = mapRef.current;
    if (!cam || !ctrls) return;

    // 1) reset camera to your fixed position
    cam.position.copy(orthoPos);

    // 2) reset controls target to your fixed target
    ctrls.target.copy(orthoTarget);

    // 3) IMPORTANT: reset internal control state + apply immediately
    ctrls.update();
    cam.lookAt(orthoTarget);
    cam.updateProjectionMatrix();
  }, [viewContext, orthoPos, orthoTarget, level]);
  if (viewContext == "2D") {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 30000, 100000]}
          near={0.1}
          far={500000}
          zoom={0.008}
          ref={orthoCamRef}
        ></OrthographicCamera>
        <MapControls
          enableRotate={false} // keep it flat
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
  } else {
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
        ></PerspectiveCamera>
        <OrbitControls target={[0, 30000, 0]}></OrbitControls>
      </>
    );
  }
};

export default CamerasAndControls;
