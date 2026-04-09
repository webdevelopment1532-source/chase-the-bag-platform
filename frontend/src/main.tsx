import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { GlobalPopupProvider } from "./components/popups/GlobalPopupContext";
import { AnalyticsProvider } from "./hooks/useAnalytics";
import "./index.css";

if (typeof document !== "undefined") {
  const root = document.getElementById("root");
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <AnalyticsProvider>
          <BrowserRouter>
            <GlobalPopupProvider>
              <App />
            </GlobalPopupProvider>
          </BrowserRouter>
        </AnalyticsProvider>
      </React.StrictMode>,
    );
  }
}
