import React from "react";

const balances = [
  { coin: "USDT", amount: 500 },
  { coin: "BTC", amount: 0.05 },
  { coin: "ETH", amount: 1.2 },
];

export default function Wallet() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Your Wallet</h1>
      <table className="min-w-full border mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Coin</th>
            <th className="px-4 py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((bal, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{bal.coin}</td>
              <td className="px-4 py-2">{bal.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="px-4 py-2 bg-green-600 text-white rounded mr-2">
        Deposit
      </button>
      <button className="px-4 py-2 bg-yellow-500 text-white rounded">
        Withdraw
      </button>
    </div>
  );
}
