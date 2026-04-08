import React, { useState } from "react";
import { OfferList } from "../components/offer/OfferList";
import { OfferModal } from "../components/offer/OfferModal";
import { useGlobalPopup } from "../components/popups/GlobalPopupContext";

export default function ExchangeDashboard() {
  const { showPopup } = useGlobalPopup();
  const [modalOpen, setModalOpen] = useState(false);
  const [offers, setOffers] = useState([
    {
      id: 1,
      type: "Buy",
      coin: "USDT",
      amount: 100,
      price: 1.0,
      user: "Alice",
    },
    {
      id: 2,
      type: "Sell",
      coin: "BTC",
      amount: 0.01,
      price: 65000,
      user: "Bob",
    },
    { id: 3, type: "Buy", coin: "ETH", amount: 2, price: 3200, user: "Carol" },
  ]);

  const handleCreateOffer = (offer: any) => {
    setOffers([...offers, { ...offer, id: offers.length + 1, user: "You" }]);
    showPopup("Offer Created!", "Your offer has been added to the list.");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Chase The Bag P2P Coin Exchange
      </h1>
      <button
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded"
        onClick={() => setModalOpen(true)}
      >
        Create Offer
      </button>
      <OfferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateOffer}
      />
      <OfferList offers={offers} />
    </div>
  );
}
