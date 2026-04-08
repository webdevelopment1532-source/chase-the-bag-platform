import React from "react";

interface Offer {
  id: number;
  type: string;
  coin: string;
  amount: number;
  price: number;
  user: string;
}

export const OfferList: React.FC<{ offers: Offer[] }> = ({ offers }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full border">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Coin</th>
          <th className="px-4 py-2">Amount</th>
          <th className="px-4 py-2">Price</th>
          <th className="px-4 py-2">User</th>
          <th className="px-4 py-2">Action</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((offer) => (
          <tr key={offer.id} className="border-t">
            <td className="px-4 py-2">{offer.type}</td>
            <td className="px-4 py-2">{offer.coin}</td>
            <td className="px-4 py-2">{offer.amount}</td>
            <td className="px-4 py-2">{offer.price}</td>
            <td className="px-4 py-2">{offer.user}</td>
            <td className="px-4 py-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded">
                Accept
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
