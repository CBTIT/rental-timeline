import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 1023px)";

function subscribeCompact(cb: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getCompactSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** Matches `.compact-only` / compact UI breakpoint; safe with SSR. */
export function useCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribeCompact,
    getCompactSnapshot,
    getServerSnapshot,
  );
}
