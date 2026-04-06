import * as THREE from "three";

export type DevCameraSnapshot = {
  viewContext: "2D" | "3D";
  camera: {
    position: [number, number, number];
    fov?: number;
    near: number;
    far: number;
    zoom: number;
    up?: [number, number, number];
  };
  /** OrbitControls / MapControls target */
  controlsTarget: [number, number, number] | null;
  /** Last computed fit (what the app applies when bounds change) */
  fitFromComputed: {
    perspectivePosition: [number, number, number];
    perspectiveTarget: [number, number, number];
    perspectiveNear: number;
    perspectiveFar: number;
    orthoPosition: [number, number, number];
    orthoTarget: [number, number, number];
    orthoZoom: number;
    floorZ: number;
  };
};

type Listener = (s: DevCameraSnapshot) => void;

let listener: Listener | null = null;

export function isCameraDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has("debugCamera")) return true;
    return localStorage.getItem("debugCamera") === "1";
  } catch {
    return false;
  }
}

export function subscribeDevCamera(cb: Listener): () => void {
  listener = cb;
  return () => {
    listener = null;
  };
}

export function publishDevCamera(snapshot: DevCameraSnapshot): void {
  listener?.(snapshot);
}

export function vec3ToTuple(v: THREE.Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}
