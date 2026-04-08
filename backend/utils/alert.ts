import fetch from "node-fetch";

// Send alert to Slack, Discord, or email
export async function sendAlert({
  message,
  type = "error",
  channel = "slack",
  webhookUrl,
}: {
  message: string;
  type?: string;
  channel?: "slack" | "discord" | "email";
  webhookUrl: string;
}) {
  if (!webhookUrl) return;
  const payload =
    channel === "slack"
      ? { text: `[${type.toUpperCase()}] ${message}` }
      : channel === "discord"
        ? { content: `[${type.toUpperCase()}] ${message}` }
        : { subject: `[${type.toUpperCase()}] Alert`, body: message };
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Alert failed", e);
  }
}
