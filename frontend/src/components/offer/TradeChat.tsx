import React, { useState } from "react";

interface TradeChatProps {
  offerId: number;
}

export const TradeChat: React.FC<TradeChatProps> = ({ offerId }) => {
  const [messages, setMessages] = useState([
    { sender: "System", text: "Trade started. Escrow is active." },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { sender: "You", text: input }]);
      setInput("");
    }
  };

  return (
    <div className="border rounded p-4 mt-4 bg-gray-50">
      <h3 className="font-bold mb-2">Trade Chat (Offer #{offerId})</h3>
      <div className="h-32 overflow-y-auto bg-white border p-2 mb-2">
        {messages.map((msg, i) => (
          <div key={i} className="mb-1">
            <span className="font-semibold">{msg.sender}:</span> {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          className="flex-1 border p-2 rounded mr-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};
