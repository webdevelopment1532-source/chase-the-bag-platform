import { useState, useEffect } from "react";

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = new URLSearchParams(
      window.location.hash.replace("#", "?"),
    ).get("access_token");
    if (token) {
      // fetch user data from Discord API
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setUser(data));
    }
  }, []);

  return { user };
};
