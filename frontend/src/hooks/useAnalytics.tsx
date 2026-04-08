import React, { createContext, useContext } from "react";

interface AnalyticsContextType {
  trackEvent: (name: string, data?: any) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
});

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const trackEvent = (name: string, data?: any) => {
    console.log("Analytics Event:", name, data);
    // TODO: integrate with Google Analytics, Plausible, etc.
  };

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => useContext(AnalyticsContext);
