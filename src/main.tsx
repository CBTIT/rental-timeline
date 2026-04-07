import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

{
  const base = import.meta.env.BASE_URL;
  const href = `${base.endsWith("/") ? base : `${base}/`}context.3dm`;
  // Defer prefetch so it doesn't compete with initial JS parse/execute.
  const w = globalThis as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  const schedule = (cb: () => void): number => {
    if (typeof w.requestIdleCallback === "function") {
      return w.requestIdleCallback(cb, { timeout: 3000 });
    }
    return setTimeout(cb, 1500) as unknown as number;
  };
  schedule(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
