export function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function perfLog(label: string, startMs: number, extra?: Record<string, unknown>) {
  const endMs = perfNow();
  const durationMs = Math.round((endMs - startMs) * 100) / 100;
  // Keep logs machine-greppable and short.
  if (extra) {
    // eslint-disable-next-line no-console
    console.info(`[PERF] ${label} ${durationMs}ms`, extra);
  } else {
    // eslint-disable-next-line no-console
    console.info(`[PERF] ${label} ${durationMs}ms`);
  }
  return { endMs, durationMs };
}

