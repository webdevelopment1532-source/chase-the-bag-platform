import React, { useState } from "react";

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (offer: any) => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState("Buy");
  const [coin, setCoin] = useState("USDT");
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Offer</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ type, coin, amount, price });
            onClose();
          }}
        >
          <div className="mb-2">
            <label className="block mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option>Buy</option>
              <option>Sell</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Coin</label>
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option>USDT</option>
              <option>BTC</option>
              <option>ETH</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="mr-2 px-4 py-2 bg-gray-300 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
