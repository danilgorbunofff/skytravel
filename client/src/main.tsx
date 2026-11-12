import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import { readSsrPayload } from "./ssr/SsrDataContext";
import { captureUtm } from "./lib/utm";
import { initAnalytics } from "./lib/analytics";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

captureUtm();

const ssrData = readSsrPayload();
const app = (
  <React.StrictMode>
    <App ssrData={ssrData} />
  </React.StrictMode>
);

// Server-rendered pages (/cs/…, /ru/…) are hydrated; everything else
// (/search, /admin…) is served as a plain SPA shell and rendered from scratch.
if (ssrData && rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, app);
} else {
  ReactDOM.createRoot(rootElement).render(app);
}

// Analytics loads after the page is interactive so it never competes with LCP.
if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => initAnalytics());
} else {
  setTimeout(initAnalytics, 2000);
}

// Report Core Web Vitals in production (non-blocking)
if (import.meta.env.PROD) {
  const reportMetric = (metric: { name: string; value: number; rating: string }) => {
    // Log to console for now; can be extended to send to analytics endpoint
    if (metric.rating !== "good") {
      console.info(`[WebVitals] ${metric.name}: ${metric.value.toFixed(1)} (${metric.rating})`);
    }
  };
  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
}
