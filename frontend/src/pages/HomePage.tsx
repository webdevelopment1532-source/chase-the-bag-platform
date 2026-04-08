import React from "react";
import { Popup } from "../components/popups";
import { useGlobalPopup } from "../components/popups/GlobalPopupContext";
import { useAnalytics } from "../hooks/useAnalytics";

export default function HomePage() {
  const { showPopup } = useGlobalPopup();
  const { trackEvent } = useAnalytics();

  const handleShowPopup = () => {
    showPopup("Global Popup!", "This popup is managed globally.");
    trackEvent("popup_opened", { page: "HomePage" });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Home Page</h1>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleShowPopup}
      >
        Show Global Popup
      </button>
      <Popup title="Welcome!" message="This is a demo popup." />
    </div>
  );
}
