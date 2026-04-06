import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

{
  const base = import.meta.env.BASE_URL;
  const href = `${base.endsWith("/") ? base : `${base}/`}context.3dm`;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
