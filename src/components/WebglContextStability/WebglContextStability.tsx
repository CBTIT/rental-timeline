import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Prevents the default browser behavior on context loss so the tab is less likely
 * to hard-reload; R3F/three may still need a full remount to fully recover.
 */
export default function WebglContextStability() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
    };
    el.addEventListener("webglcontextlost", onLost);
    return () => el.removeEventListener("webglcontextlost", onLost);
  }, [gl]);
  return null;
}
