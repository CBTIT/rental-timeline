import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  MapControls,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  memo,
  useState,
} from "react";
import * as THREE from "three";
import type { MapControls as ThreeMapControls } from "three-stdlib";
import {
  isCameraDebugEnabled,
  publishDevCamera,
  vec3ToTuple,
} from "../../dev/cameraDebugBridge";

type CameraAndControlsProps = {
  viewContext: string;
};

type CameraFit = {
  key: string;
  floorZ: number;
  orthoPosition: THREE.Vector3;
  orthoTarget: THREE.Vector3;
  orthoZoom: number;
  perspectivePosition: THREE.Vector3;
  perspectiveTarget: THREE.Vector3;
  perspectiveNear: number;
  perspectiveFar: number;
};

const ORTHO_FIT_PADDING = 1.06;
const PERSPECTIVE_FIT_PADDING = 0.5;
const PERSPECTIVE_FOV = 25;

/** Tuned view direction (target → camera) used by computeFit; position = target + dir * distance. */
const DEFAULT_PERSPECTIVE_DIRECTION = new THREE.Vector3(
  -0.2,
  -0.524,
  0.828,
).normalize();

const CamerasAndControls = ({ viewContext }: CameraAndControlsProps) => {
  const [fit, setFit] = useState<CameraFit | null>(null);

  const boundsKeyRef = useRef<string>("");
  const applied2DFitKeyRef = useRef<string>("");
  const lastDevPublishRef = useRef(0);
  const frameCountRef = useRef(0);
  const floorPadding = 1;

  /** Only snap perspective camera when 2D↔3D changes or first real bounds — not on level or levels↔combined (same 3D orbit). */
  const lastPerspectiveSnapReasonRef = useRef<string>("");
  const prevHadRealPerspectiveFitRef = useRef(false);

  const orbitRef = useRef<any>(null);
  const perspectiveCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);
  const mapRef = useRef<ThreeMapControls | null>(null);

  const { camera, scene, size } = useThree();
  /** MapControls must bind after OrthographicCamera becomes default; otherwise it can attach to the old camera. */
  const orthoCameraReady =
    viewContext === "2D" && camera instanceof THREE.OrthographicCamera;

  const fallbackFit = useMemo<CameraFit>(
    () => ({
      key: "fallback",
      floorZ: 0,
      // Near origin so pre-fit frames are not aimed at empty space (legacy Y=30000 was wrong for most scenes).
      orthoPosition: new THREE.Vector3(0, 0, 100000),
      orthoTarget: new THREE.Vector3(0, 0, 0),
      orthoZoom: 0.008,
      perspectivePosition: new THREE.Vector3(-182.897, -338.591, 607.218),
      perspectiveTarget: new THREE.Vector3(-39.198, 37.929, 11.757),
      perspectiveNear: 6.535,
      perspectiveFar: 40841.704,
    }),
    [],
  );

  const activeFit = fit ?? fallbackFit;

  useEffect(() => {
    if (viewContext === "2D") {
      lastPerspectiveSnapReasonRef.current = "";
    }
  }, [viewContext]);

  const computeFit = useMemo(
    () =>
      (
        bounds: THREE.Box3,
        canvasWidth: number,
        canvasHeight: number,
      ): CameraFit => {
        const center = bounds.getCenter(new THREE.Vector3());
        const size3 = bounds.getSize(new THREE.Vector3());

        const width = Math.max(size3.x, 1);
        const depth = Math.max(size3.y, 1);
        const height = Math.max(size3.z, 1);
        const maxDim = Math.max(width, depth, height);
        const radius = Math.max(size3.length() * 0.5, 1);

        const orthoZoomX = canvasWidth / (width * ORTHO_FIT_PADDING);
        const orthoZoomY = canvasHeight / (depth * ORTHO_FIT_PADDING);
        const orthoZoom = THREE.MathUtils.clamp(
          Math.min(orthoZoomX, orthoZoomY),
          0.001,
          2,
        );

        const orthoTarget = new THREE.Vector3(center.x, center.y, bounds.min.z);
        const orthoPosition = new THREE.Vector3(
          center.x,
          center.y,
          bounds.max.z + maxDim * 2.5,
        );

        const fovRad = THREE.MathUtils.degToRad(PERSPECTIVE_FOV);
        const hFovRad =
          2 * Math.atan(Math.tan(fovRad / 2) * (canvasWidth / canvasHeight));
        const limitingFov = Math.min(fovRad, hFovRad);
        const perspectiveDistance =
          (radius * PERSPECTIVE_FIT_PADDING) / Math.sin(limitingFov / 2);
        const perspectiveTarget = new THREE.Vector3(
          center.x,
          center.y,
          center.z,
        );
        const perspectivePosition = perspectiveTarget
          .clone()
          .add(
            DEFAULT_PERSPECTIVE_DIRECTION.clone().multiplyScalar(
              perspectiveDistance,
            ),
          );

        const perspectiveNear = Math.max(0.1, perspectiveDistance / 250);
        const perspectiveFar = Math.max(
          perspectiveDistance + maxDim * 10,
          perspectiveDistance * 25,
        );

        const key = [
          bounds.min.x,
          bounds.min.y,
          bounds.min.z,
          bounds.max.x,
          bounds.max.y,
          bounds.max.z,
          canvasWidth,
          canvasHeight,
        ]
          .map((v) => v.toFixed(2))
          .join("|");

        return {
          key,
          floorZ: bounds.min.z,
          orthoPosition,
          orthoTarget,
          orthoZoom,
          perspectivePosition,
          perspectiveTarget,
          perspectiveNear,
          perspectiveFar,
        };
      },
    [],
  );

  useFrame(() => {
    // Recompute framing every ~10 frames to catch async model loads and visibility changes.
    frameCountRef.current += 1;
    if (frameCountRef.current % 10 !== 0) return;

    let hasMesh = false;
    const nextBounds = new THREE.Box3();
    scene.updateMatrixWorld(true);

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.userData.excludeFromCameraFit) return;
      const geo = object.geometry;
      if (!geo) return;
      if (!geo.boundingBox) {
        geo.computeBoundingBox();
      }
      if (!geo.boundingBox) return;
      const worldBox = geo.boundingBox.clone().applyMatrix4(object.matrixWorld);
      if (!hasMesh) {
        nextBounds.copy(worldBox);
        hasMesh = true;
      } else {
        nextBounds.union(worldBox);
      }
    });

    if (!hasMesh) return;

    const nextFit = computeFit(nextBounds, size.width, size.height);
    if (nextFit.key === boundsKeyRef.current) return;
    boundsKeyRef.current = nextFit.key;
    setFit(nextFit);
  });

  // Top-down ortho looks along −Z; up must lie in the XY plane (default Y-up). Do NOT use up=(0,0,1) — it is parallel to the view axis and breaks lookAt.
  useLayoutEffect(() => {
    if (viewContext !== "2D") return;
    applied2DFitKeyRef.current = "";
  }, [viewContext]);

  useLayoutEffect(() => {
    if (viewContext !== "2D") return;

    const cam = orthoCamRef.current;
    if (!cam) return;

    cam.position.copy(activeFit.orthoPosition);
    cam.zoom = activeFit.orthoZoom;
    cam.lookAt(activeFit.orthoTarget);
    cam.updateProjectionMatrix();

    const ctrls = mapRef.current;
    if (ctrls) {
      ctrls.target.copy(activeFit.orthoTarget);
      ctrls.update();
    }

    applied2DFitKeyRef.current = activeFit.key;
  }, [viewContext, activeFit, orthoCameraReady]);

  useEffect(() => {
    if (viewContext !== "3D") return;

    const cam = perspectiveCamRef.current;
    const ctrls = orbitRef.current;
    if (!cam || !ctrls) return;

    const reason = viewContext;
    const reasonChanged = lastPerspectiveSnapReasonRef.current !== reason;
    if (reasonChanged) {
      lastPerspectiveSnapReasonRef.current = reason;
    }

    const hasRealFit = !!(fit && fit.key !== "fallback");
    const fitJustRealized =
      hasRealFit && !prevHadRealPerspectiveFitRef.current;
    prevHadRealPerspectiveFitRef.current = hasRealFit;

    if (!reasonChanged && !fitJustRealized) return;

    cam.position.copy(activeFit.perspectivePosition);
    cam.near = activeFit.perspectiveNear;
    cam.far = activeFit.perspectiveFar;
    cam.lookAt(activeFit.perspectiveTarget);
    cam.updateProjectionMatrix();

    ctrls.target.copy(activeFit.perspectiveTarget);
    ctrls.update();
  }, [viewContext, fit, activeFit]);

  // ✅ Clamp only in 3D (OrbitControls active)
  useFrame(() => {
    if (viewContext !== "2D") return;

    // Retry once ortho ref is mounted so first 2D switch never stays unframed.
    if (applied2DFitKeyRef.current === activeFit.key) return;

    const cam = orthoCamRef.current;
    if (!cam) return;

    cam.position.copy(activeFit.orthoPosition);
    cam.zoom = activeFit.orthoZoom;
    cam.lookAt(activeFit.orthoTarget);
    cam.updateProjectionMatrix();

    const ctrls = mapRef.current;
    if (ctrls) {
      ctrls.target.copy(activeFit.orthoTarget);
      ctrls.update();
    }

    applied2DFitKeyRef.current = activeFit.key;
  });

  useFrame(() => {
    if (viewContext !== "3D") return;

    // keep camera above floor
    if (camera.position.z < activeFit.floorZ + floorPadding) {
      camera.position.z = activeFit.floorZ + floorPadding;
    }

    // keep orbit target above floor
    if (orbitRef.current) {
      const t = orbitRef.current.target as THREE.Vector3;
      if (t.z < activeFit.floorZ) t.z = activeFit.floorZ;
      orbitRef.current.update();
    }
  });

  useFrame(() => {
    if (!isCameraDebugEnabled()) return;
    const now = performance.now();
    if (now - lastDevPublishRef.current < 120) return;
    lastDevPublishRef.current = now;

    const cam = camera;
    let controlsTarget: [number, number, number] | null = null;
    if (viewContext === "3D" && orbitRef.current) {
      const t = orbitRef.current.target as THREE.Vector3;
      controlsTarget = [t.x, t.y, t.z];
    } else if (viewContext === "2D" && mapRef.current) {
      const t = mapRef.current.target as THREE.Vector3;
      controlsTarget = [t.x, t.y, t.z];
    }

    const fov =
      cam instanceof THREE.PerspectiveCamera ? cam.fov : undefined;

    publishDevCamera({
      viewContext: viewContext === "2D" ? "2D" : "3D",
      camera: {
        position: [cam.position.x, cam.position.y, cam.position.z],
        fov,
        near: cam.near,
        far: cam.far,
        zoom: cam.zoom,
        up: [cam.up.x, cam.up.y, cam.up.z],
      },
      controlsTarget,
      fitFromComputed: {
        perspectivePosition: vec3ToTuple(activeFit.perspectivePosition),
        perspectiveTarget: vec3ToTuple(activeFit.perspectiveTarget),
        perspectiveNear: activeFit.perspectiveNear,
        perspectiveFar: activeFit.perspectiveFar,
        orthoPosition: vec3ToTuple(activeFit.orthoPosition),
        orthoTarget: vec3ToTuple(activeFit.orthoTarget),
        orthoZoom: activeFit.orthoZoom,
        floorZ: activeFit.floorZ,
      },
    });
  });

  if (viewContext === "2D") {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 0, 100000]}
          near={0.1}
          far={500000}
          zoom={0.008}
          ref={orthoCamRef}
        />
        {orthoCameraReady && (
          <MapControls
            camera={camera}
            enableRotate={false}
            enablePan={true}
            enableZoom={true}
            screenSpacePanning
            panSpeed={1}
            zoomSpeed={1}
            target={[0, 0, 0]}
            ref={mapRef}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveCamRef}
        position={[-182.897, -338.591, 607.218]}
        up={[0, 0, 1]}
        zoom={0.5}
        near={6.535}
        far={40841.704}
        makeDefault
        fov={PERSPECTIVE_FOV}
      />
      <OrbitControls
        ref={orbitRef}
        target={[-39.198, 37.929, 11.757]}
        enableDamping
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
};

export default memo(CamerasAndControls);
