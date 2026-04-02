// @ts-nocheck
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

startBtn?.addEventListener("click", () => {
  statusEl.textContent = "Build started. Next: choose framework and backend.";
});
