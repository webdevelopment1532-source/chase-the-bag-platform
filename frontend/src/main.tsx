import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AnalyticsProvider } from "./hooks/useAnalytics";
import { GlobalPopupProvider } from "./components/popups/GlobalPopupContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
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
