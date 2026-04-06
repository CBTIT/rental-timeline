import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  isCameraDebugEnabled,
  subscribeDevCamera,
  type DevCameraSnapshot,
} from "../../dev/cameraDebugBridge";

const fmt = (n: number) => n.toFixed(3);
const fmtArr = (a: [number, number, number]) =>
  `[${fmt(a[0])}, ${fmt(a[1])}, ${fmt(a[2])}]`;

function buildSnippet3D(s: DevCameraSnapshot): string {
  const p = s.camera.position;
  const t = s.controlsTarget;
  const fit = s.fitFromComputed;
  const lines: string[] = [
    "// Live values (after orbit / pan). Paste into CamerasAndControls fallbackFit or PerspectiveCamera / OrbitControls defaults.",
    `// camera.position ${fmtArr([p[0], p[1], p[2]])}`,
  ];
  if (t) {
    lines.push(`// orbit / controls target ${fmtArr(t)}`);
    const dx = p[0] - t[0];
    const dy = p[1] - t[1];
    const dz = p[2] - t[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    lines.push(
      `// perspectiveDirection (match computeFit: target → camera) new THREE.Vector3(${fmt(dx / len)}, ${fmt(dy / len)}, ${fmt(dz / len)}).normalize()`,
    );
  }
  lines.push("");
  lines.push(
    `position={[${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])}]}`,
    t
      ? `target={[${fmt(t[0])}, ${fmt(t[1])}, ${fmt(t[2])}]}`
      : "// target: (controls not ready)",
  );
  if (typeof s.camera.fov === "number") {
    lines.push(`near={${fmt(s.camera.near)}}`, `far={${fmt(s.camera.far)}}`);
  }
  lines.push(
    "",
    "// Last auto-fit (computeFit) — compare with live orbit above:",
    `// perspectivePosition ${fmtArr(fit.perspectivePosition)}`,
    `// perspectiveTarget ${fmtArr(fit.perspectiveTarget)}`,
  );
  return lines.join("\n");
}

function buildSnippet2D(s: DevCameraSnapshot): string {
  const p = s.camera.position;
  const t = s.controlsTarget;
  const fit = s.fitFromComputed;
  const lines: string[] = [
    "// Orthographic 2D — live camera + fit",
    `position={[${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])}]}`,
    `zoom={${fmt(s.camera.zoom)}}`,
  ];
  if (t) lines.push(`target={[${fmt(t[0])}, ${fmt(t[1])}, ${fmt(t[2])}]}`);
  lines.push(
    "",
    "// Last auto-fit:",
    `// orthoPosition ${fmtArr(fit.orthoPosition)}`,
    `// orthoTarget ${fmtArr(fit.orthoTarget)}`,
    `// orthoZoom ${fmt(fit.orthoZoom)}`,
  );
  return lines.join("\n");
}

/**
 * Dev-only overlay: enable with ?debugCamera=1 or localStorage.debugCamera = "1" (import.meta.env.DEV only).
 */
export default function DevCameraDebugPanel() {
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState<DevCameraSnapshot | null>(null);

  useEffect(() => {
    if (!isCameraDebugEnabled()) return;
    return subscribeDevCamera(setSnap);
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  if (!import.meta.env.DEV || !isCameraDebugEnabled()) return null;

  const snippet =
    snap == null
      ? "Move the view or wait for the canvas…"
      : snap.viewContext === "3D"
        ? buildSnippet3D(snap)
        : buildSnippet2D(snap);

  return (
    <div
      className="dev-camera-debug-panel"
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 99999,
        maxWidth: 420,
        maxHeight: open ? "min(45vh, 360px)" : "auto",
        overflow: "auto",
        padding: open ? "10px 12px" : "6px 10px",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        color: "#e8eaed",
        background: "rgba(18, 20, 24, 0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: open ? 8 : 0,
        }}
      >
        <span style={{ fontWeight: 600, color: "#a7f3d0" }}>
          Camera debug (dev)
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => void copy(snippet)}
            style={btnStyle}
            disabled={!snap}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={btnStyle}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {open && (
        <>
          <div style={{ color: "#94a3b8", marginBottom: 8, fontSize: 10 }}>
            Enable: <code>?debugCamera=1</code> or{" "}
            <code>localStorage.debugCamera = &quot;1&quot;</code>. Auto-fit may
            re-apply until you change{" "}
            <code>computeFit</code> / <code>fallbackFit</code> in{" "}
            <code>CamerasAndControls.tsx</code>.
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              userSelect: "text",
            }}
          >
            {snippet}
          </pre>
        </>
      )}
    </div>
  );
}

const btnStyle: CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#e8eaed",
  cursor: "pointer",
};
