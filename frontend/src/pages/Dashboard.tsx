import React from "react";
import { loginWithDiscord } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {user ? (
        <div className="mt-4">
          <p>Welcome, {user.username}!</p>
          <img
            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
            alt="avatar"
            width={64}
            height={64}
          />
        </div>
      ) : (
        <button
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          onClick={loginWithDiscord}
        >
          Login with Discord
        </button>
      )}
    </div>
  );
}
