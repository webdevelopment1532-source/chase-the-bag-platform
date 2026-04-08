import React, { createContext, useContext, useState, ReactNode } from "react";

interface PopupState {
  open: boolean;
  title?: string;
  message?: string;
}

interface PopupContextType {
  showPopup: (title: string, message: string) => void;
  closePopup: () => void;
  popup: PopupState;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const GlobalPopupProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [popup, setPopup] = useState<PopupState>({ open: false });

  const showPopup = (title: string, message: string) =>
    setPopup({ open: true, title, message });
  const closePopup = () => setPopup({ open: false });

  return (
    <PopupContext.Provider value={{ showPopup, closePopup, popup }}>
      {children}
      {popup.open && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-white border p-6 shadow-lg rounded-lg z-50">
          <h2 className="text-xl font-bold">{popup.title}</h2>
          <p className="mt-2">{popup.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={closePopup}
          >
            Close
          </button>
        </div>
      )}
    </PopupContext.Provider>
  );
};

export const useGlobalPopup = () => {
  const ctx = useContext(PopupContext);
  if (!ctx)
    throw new Error("useGlobalPopup must be used within GlobalPopupProvider");
  return ctx;
};
