import { useLoader } from "@react-three/fiber";
import { useEffect } from "react";
import { Rhino3dmLoader } from "three-stdlib";
import * as THREE from "three";

const BaseLayout = ({}) => {
  const object = useLoader(Rhino3dmLoader, "/base_layout.3dm", (loader) => {
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");
  });
  useEffect(() => {
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = new THREE.MeshStandardMaterial({
          color: "#dadada",
          roughness: 0.95,
          metalness: 0.0,
          side: THREE.FrontSide, // important
        });
      }
    });
  }, [object]);
  return <primitive object={object} dispose={null} />;
};

export default BaseLayout;
