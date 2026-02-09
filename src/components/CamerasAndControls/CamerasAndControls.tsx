import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import React from "react";
import * as THREE from "three";

type CameraAndControlsProps = {
  viewContext: string;
  level: string;
};

const CamerasAndControls = ({ viewContext, level }: CameraAndControlsProps) => {
  if (viewContext == "2D") {
    return (
      <OrthographicCamera
        makeDefault
        position={[0, 0, 200000]}
        near={1000}
        far={200000}
        zoom={1}
      ></OrthographicCamera>
    );
  } else {
    return (
      <>
        <PerspectiveCamera
          position={[40000, -60000, 160000]}
          up={[0, 0, 1]}
          zoom={0.5}
          near={1000}
          far={2000000}
          makeDefault
          fov={25}
        ></PerspectiveCamera>
        <OrbitControls target={new THREE.Vector3(0, 0, 0)}></OrbitControls>
      </>
    );
  }
};

export default CamerasAndControls;
