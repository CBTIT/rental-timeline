import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import BaseLayout from "./components/BaseLayout";
import Unit from "./components/Unit";
import HUD from "./components/HUD";

function App() {
  const [units, setUnits] = useState<{ unitId: string; file: string }[]>([]);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/units/manifest.json")
      .then((data) => data.json())
      .then(setUnits);
  }, []);
  return (
    <div className="canvas-container">
      <Canvas
        shadows
        dpr={[1, 2]}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1); // Z-up
        }}
      >
        <Suspense fallback={null}>
          <BaseLayout />
          {units.map((u) => (
            <Unit
              key={u.unitId}
              location={u.file}
              unitId={u.unitId}
              isHovered={hoveredUnitId === u.unitId}
              onHover={(id) => setHoveredUnitId(id)}
            />
          ))}
        </Suspense>
        {/* Soft overall fill */}
        <ambientLight intensity={0.35} />

        {/* Key light */}
        <directionalLight
          castShadow
          position={[300, 400, 700]}
          intensity={1}
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-near={10}
          shadow-camera-far={2000}
          shadow-camera-left={-400}
          shadow-camera-right={400}
          shadow-camera-top={400}
          shadow-camera-bottom={-400}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
        />

        {/* Fill light (opposite side, weaker) */}
        <directionalLight position={[-600, 400, 600]} intensity={0.35} />

        {/* Rim/back light (adds edge separation) */}
        <directionalLight position={[0, -800, 900]} intensity={0.25} />
        <PerspectiveCamera
          makeDefault
          position={[900, 400, 1900]}
          fov={25} // lower = more “axon-like”
          near={10}
          far={10000}
        />
        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
      <HUD hoveredUnitId={hoveredUnitId} />
    </div>
  );
}

export default App;
