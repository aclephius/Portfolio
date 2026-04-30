const API_BASE_URL = "http://localhost:5000/api";

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function renderLocalProfile() {
  const playerName = localStorage.getItem("playerName") || localStorage.getItem("accountUsername") || "Trainer";
  const playerId = localStorage.getItem("playerId") || "N/A";

  setText("profilePlayerName", playerName);
  setText("profilePlayerId", playerId);
}

function setAvatar(url) {
  const avatarEl = document.querySelector(".avatar");
  if (!avatarEl) return;

  if (url) {
    avatarEl.innerHTML = `<img src="${url}" alt="Avatar">`;
  } else {
    avatarEl.innerHTML = "👤";
  }
}

async function renderServerProfile() {
  const accountUsername = localStorage.getItem("accountUsername");
  if (!accountUsername) return;

  try {
    const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(accountUsername)}`);
    if (!response.ok) return;

    const data = await response.json();
    setText("profileLevel", data.level ?? 0);
    setText("profileCoins", data.coins ?? 0);
    setText("profileWins", data.wins ?? 0);
    setText("profileLosses", data.losses ?? 0);
    setText("profileStatus", data.status || "Active");
    if (data.playerId) {
      setText("profilePlayerId", data.playerId);
      localStorage.setItem("playerId", data.playerId);
    }
    if (data.avatarUrl) {
      localStorage.setItem("avatarUrl", data.avatarUrl);
      setAvatar(data.avatarUrl);
    }
  } catch (_error) {
    // Keep local fallback values if API is unavailable.
  }
}

async function renderPokedexCount() {
  const accountUsername = localStorage.getItem("accountUsername");
  if (!accountUsername) return;

  try {
    const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(accountUsername)}`);
    if (!response.ok) return;

    const pokemonList = await response.json();
    setText("profilePokedex", Array.isArray(pokemonList) ? pokemonList.length : 0);
  } catch (_error) {
    setText("profilePokedex", 0);
  }
}

async function renderAvatar() {
  const savedAvatarUrl = localStorage.getItem("avatarUrl");
  if (savedAvatarUrl) {
    setAvatar(savedAvatarUrl);
    return;
  }

  setAvatar("");
}

async function saveProfileChanges(nextPlayerName, nextStatus, nextAvatarUrl) {
  const accountUsername = localStorage.getItem("accountUsername");
  if (!accountUsername) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(accountUsername)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, avatarUrl: nextAvatarUrl })
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

function setupEditProfile() {
  const editButton = document.querySelector(".edit-btn");
  if (!editButton) return;

  editButton.addEventListener("click", async () => {
    const currentPlayerName = localStorage.getItem("playerName") || "Trainer";
    const currentStatus = document.getElementById("profileStatus")?.textContent?.trim() || "Active";

    const playerNameInput = window.prompt("Set your player display name:", currentPlayerName);
    if (playerNameInput === null) return;

    const nextPlayerName = playerNameInput.trim();
    if (nextPlayerName.length < 3) {
      window.alert("Player name must be at least 3 characters.");
      return;
    }

    const statusInput = window.prompt("Set your profile status:", currentStatus);
    if (statusInput === null) return;

    const nextStatus = statusInput.trim() || "Active";
    const currentAvatarUrl = localStorage.getItem("avatarUrl") || "";
    const avatarInput = window.prompt("Set your profile image URL:", currentAvatarUrl);
    if (avatarInput === null) return;
    const nextAvatarUrl = avatarInput.trim();

    localStorage.setItem("playerName", nextPlayerName);
    setText("profilePlayerName", nextPlayerName);
    localStorage.setItem("avatarUrl", nextAvatarUrl);
    setAvatar(nextAvatarUrl);

    const savedToDb = await saveProfileChanges(nextPlayerName, nextStatus, nextAvatarUrl);
    if (savedToDb) {
      setText("profileStatus", nextStatus);
      window.alert("Profile updated.");
    } else {
      window.alert("Saved display name locally, but DB update failed.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLocalProfile();
  renderServerProfile();
  renderPokedexCount();
  renderAvatar();
  setupEditProfile();
});
