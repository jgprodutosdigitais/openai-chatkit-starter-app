import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// --- Voomp/iframe recovery: avoid "stuck white screen" ---
// If running embedded in an iframe and the app doesn't render properly,
// force a single reload with a cache-busting param.
(function iframeAutoRecoverOnce() {
  try {
    const isIframe = window.self !== window.top;
    if (!isIframe) return;

    const url = new URL(window.location.href);
    const alreadyRecovered = url.searchParams.get("recovered") === "1";
    if (alreadyRecovered) return;

    setTimeout(() => {
      const root = document.getElementById("root");
      const hasContent = !!root && root.childElementCount > 0;

      // If still white/empty, reload once with cache buster
      if (!hasContent) {
        url.searchParams.set("recovered", "1");
        url.searchParams.set("v", String(Date.now())); // cache-buster
        window.location.replace(url.toString());
      }
    }, 1500);
  } catch {
    // ignore
  }
})();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element with id 'root' not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
