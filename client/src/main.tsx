import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

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
