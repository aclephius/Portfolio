const API_BASE_URL = "http://localhost:5000/api";

// -------- LOCAL STORAGE HELPERS --------
function getAccountUsername() {
  return localStorage.getItem("accountUsername");
}

function setStoredCoins(value) {
  localStorage.setItem("playerCoins", String(value));
}

function getStoredCoins() {
  const raw = localStorage.getItem("playerCoins");
  return raw ? parseInt(raw, 10) : 0;
}

// -------- UI HELPERS --------
function renderCoinsInHeader() {
  const coins = getStoredCoins();
  const els = document.querySelectorAll("[data-coins]");
  els.forEach((el) => {
    el.textContent = `Coins: ${coins}`;
  });
}

// -------- SERVER SYNC --------
async function fetchCoinsFromServer() {
  const username = getAccountUsername();
  if (!username) return getStoredCoins();

  try {
    const res = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(username)}/coins`);
    if (!res.ok) return getStoredCoins();
    const data = await res.json();
    if (typeof data.coins === "number") {
      setStoredCoins(data.coins);
      renderCoinsInHeader();
      return data.coins;
    }
  } catch (_err) {
    // Keep local fallback
  }
  return getStoredCoins();
}

// -------- EARN (server calculates amount) --------
async function earnCoins(action, context = {}) {
  const username = getAccountUsername();
  if (!username) {
    console.warn("earnCoins: no logged-in user");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(username)}/coins/earn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, context })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("earnCoins failed:", err.message || res.status);
      return null;
    }

    const data = await res.json();
    setStoredCoins(data.coins);
    renderCoinsInHeader();
    return data;
  } catch (err) {
    console.error("earnCoins error:", err);
    return null;
  }
}

// -------- SPEND (server validates balance) --------
async function spendCoins(amount) {
  const username = getAccountUsername();
  if (!username) {
    console.warn("spendCoins: no logged-in user");
    return { success: false, reason: "not_logged_in" };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(username)}/coins/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("spendCoins failed:", err.message || res.status);
      return { success: false, reason: err.message || "unknown", coins: getStoredCoins() };
    }

    const data = await res.json();
    setStoredCoins(data.coins);
    renderCoinsInHeader();
    return { success: true, coins: data.coins, spent: data.spent };
  } catch (err) {
    console.error("spendCoins error:", err);
    return { success: false, reason: "network_error", coins: getStoredCoins() };
  }
}

// -------- DAILY LOGIN BONUS --------
async function checkDailyLoginBonus() {
  const username = getAccountUsername();
  if (!username) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastLogin = localStorage.getItem("lastLoginDate");

  if (lastLogin === today) return; // Already claimed today

  const result = await earnCoins("daily_login", {});
  if (result && result.earned > 0) {
    localStorage.setItem("lastLoginDate", today);
    console.log(`Daily login bonus: +${result.earned} coins`);
  }
}

// -------- INIT ON PAGE LOAD --------
document.addEventListener("DOMContentLoaded", () => {
  renderCoinsInHeader();
  fetchCoinsFromServer();
});

