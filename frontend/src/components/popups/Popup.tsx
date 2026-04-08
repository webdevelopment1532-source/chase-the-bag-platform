import React, { useState } from "react";

interface PopupProps {
  title: string;
  message: string;
}

export const Popup: React.FC<PopupProps> = ({ title, message }) => {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-white border p-6 shadow-lg rounded-lg z-50">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2">{message}</p>
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setOpen(false)}
      >
        Close
      </button>
    </div>
  );
};
