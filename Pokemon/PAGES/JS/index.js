// -------- SEEDED RANDOM FOR ACCOUNT-BASED SPAWNS --------
function getSeededRandom() {
  const username = localStorage.getItem("accountUsername") || localStorage.getItem("playerName") || "guest";
  let seed = 0;
  for (let i = 0; i < username.length; i++) {
    seed = ((seed << 5) - seed) + username.charCodeAt(i);
    seed = seed & seed;
  }
  seed = seed + Date.now();
  
  return function() {
    seed = seed | 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classifyRarity(species) {
  if (species.is_mythical) return "mythical";
  if (species.is_legendary) return "legendary";

  const rate = species.capture_rate;
  if (rate >= 200) return "common";
  if (rate >= 100) return "uncommon";
  if (rate >= 45) return "rare";
  return "ultra-rare";
}

function raritySpawnChance(rarity) {
  return {
    common: 1.0,
    uncommon: 0.6,
    rare: 0.25,
    "ultra-rare": 0.10,
    legendary: 0.03,
    mythical: 0.01
  }[rarity];
}

function getRandomPokemonID() {
  return Math.floor(Math.random() * 1025) + 1;
}

function rarityColor(rarity) {
  return {
    common: "#9e9e9e",
    uncommon: "#4caf50",
    rare: "#2196f3",
    "ultra-rare": "#9c27b0",
    legendary: "#ff9800",
    mythical: "#ff1744"
  }[rarity];
}

// -------- LOAD WILD POKEMON FROM ENCOUNTER --------
function loadWildPokemon() {
  // Check if coming from wild encounter
  const inBattle = localStorage.getItem("inBattle") === "true";
  
  // If in battle mode, check battlePokemon first
  if (inBattle) {
    const battleSaved = localStorage.getItem("battlePokemon");
    if (battleSaved) {
      try {
        return JSON.parse(battleSaved);
      } catch {
        // Fall through to wildPokemon
      }
    }
  }
  
  const saved = localStorage.getItem("wildPokemon");
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// -------- SHOW ENEMY --------
function showEnemy(pokemon, rarity, level) {
  const nameEl = document.getElementById("enemyName");
  if (nameEl) nameEl.innerText = `${pokemon.name.toUpperCase()} Lv.${level}`;

  const spriteEl = document.getElementById("enemySprite");
  if (spriteEl) {
    spriteEl.innerHTML = `<img src="${pokemon.sprites.front_default}" width="150">`;
  }

  const rarityBox = document.getElementById("enemyRarity");
  if (rarityBox) {
    rarityBox.innerText = rarity.toUpperCase();
    rarityBox.style.color = rarityColor(rarity);
  }

  const lvlBox = document.getElementById("enemylvl");
  if (lvlBox) lvlBox.innerText = `Lv.${level}`;
}

// -------- BATTLE STATE --------
let battleState = {
  enemyHp: 100,
  enemyMaxHp: 100,
  won: false
};

function updateEnemyHpBar() {
  const bar = document.querySelector(".hp-fill.enemy");
  if (!bar) return;
  const pct = Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100);
  bar.style.width = `${pct}%`;
}

// -------- COIN REWARD ON VICTORY --------
async function winBattle() {
  if (battleState.won) return;
  battleState.won = true;

  const wild = loadWildPokemon();
  if (wild && typeof earnCoins === "function") {
    const result = await earnCoins("defeated_pokemon", {
      rarity: wild.rarity || "common",
      level: wild.level || 1
    });
    if (result && result.earned) {
      console.log(`Earned ${result.earned} coins for defeating ${wild.pokemon.name}!`);
    }
  }

  // Clear both pokemon storages after battle
  localStorage.removeItem("wildPokemon");
  localStorage.removeItem("battlePokemon");
  localStorage.removeItem("inBattle");
  
  alert("You won the battle! Coins awarded.");
  window.location.href = "Wild-EncounterPage.html";
}

// -------- ATTACK --------
function attack() {
  if (battleState.won) return;

  const damage = Math.floor(Math.random() * 20) + 15;
  battleState.enemyHp = Math.max(0, battleState.enemyHp - damage);
  updateEnemyHpBar();

  if (battleState.enemyHp <= 0) {
    setTimeout(winBattle, 300);
  }
}

// -------- SETUP CONTROLS --------
function setupBattleControls() {
  const attackBtn = document.querySelector(".btn.attack");
  if (attackBtn) attackBtn.addEventListener("click", attack);

  const runBtn = document.querySelector(".btn.run");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      // Clear battle pokemon when running so new one spawns next visit
      localStorage.removeItem("battlePokemon");
      window.location.href = "Wild-EncounterPage.html";
    });
  }
}

// -------- FALLBACK: SPAWN RANDOM ENEMY --------
async function spawnEnemy() {
  const seededRandom = getSeededRandom();
  while (true) {
    const id = Math.floor(seededRandom() * 1025) + 1;
    try {
      const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const species = await speciesRes.json();
      const rarity = classifyRarity(species);
      const chance = raritySpawnChance(rarity);
      if (seededRandom() > chance) continue;

      const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const pokemon = await pokeRes.json();

      showEnemy(pokemon, rarity, 5);
      // Use battlePokemon key so it doesn't interfere with wild encounter
      localStorage.setItem("battlePokemon", JSON.stringify({ pokemon, rarity, level: 5, ivs: {} }));
      break;
    } catch (e) {
      console.error("Spawn error:", e);
    }
  }
}

// -------- LOAD USER DATA --------
function loadUserData() {
  const playerName = localStorage.getItem("playerName") || "Trainer";
  const accountUsername = localStorage.getItem("accountUsername");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  
  // Update player name in header
  const playerNameEls = document.querySelectorAll("[data-player-name]");
  playerNameEls.forEach(el => {
    el.textContent = `Player: ${playerName}`;
  });
  
  // If logged in, fetch coins from server
  if (isLoggedIn && accountUsername) {
    fetchCoinsFromServer();
  }
  
  // Also update level display if available
  const levelEls = document.querySelectorAll("[data-level]");
  levelEls.forEach(el => {
    const storedLevel = localStorage.getItem("playerLevel");
    if (storedLevel) {
      el.textContent = `Level: ${storedLevel}`;
    }
  });
}

// -------- STARTER SELECTION (shown on main menu for new users) --------
const STARTER_POKEMON = [
  { name: "bulbasaur", displayName: "Bulbasaur", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
  { name: "charmander", displayName: "Charmander", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
  { name: "squirtle", displayName: "Squirtle", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" },
  { name: "pikachu", displayName: "Pikachu", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
  { name: "eevee", displayName: "Eevee", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" }
];

const API_BASE_URL = "http://localhost:5000/api";

// Check if user needs to choose starter and show modal
async function checkAndShowStarterModal() {
  const accountUsername = localStorage.getItem("accountUsername");
  if (!accountUsername) return; // Not logged in
  
  try {
    // Fetch user data from server to check hasChosenStarter
    const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(accountUsername)}`);
    
    if (response.ok) {
      const userData = await response.json();
      console.log("User data:", userData);
      
      // If user hasn't chosen a starter, show the modal
      if (!userData.hasChosenStarter) {
        showStarterModal(accountUsername);
      }
    }
  } catch (error) {
    console.log("Could not check starter status:", error);
  }
}

// Show starter selection modal
function showStarterModal(username) {
  // Randomly select 3 starters
  const shuffled = [...STARTER_POKEMON].sort(() => 0.5 - Math.random());
  const options = shuffled.slice(0, 3);
  
  const modalHtml = `
    <div id="starterModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Choose Your Starter!</h2>
        <p>Pick one of these Pokemon to start your journey:</p>
        <div class="starter-options">
          ${options.map(s => `
            <button class="starter-btn" data-starter="${s.name}">
              <img src="${s.img}" alt="${s.displayName}" width="80">
              <span class="starter-name">${s.displayName}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById("starterModal");
  if (existingModal) existingModal.remove();
  
  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  
  // Add click handlers
  document.querySelectorAll(".starter-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const starter = btn.dataset.starter;
      await selectStarter(username, starter);
    });
  });
}

// Send starter choice to server
async function selectStarter(username, starter) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/choose-starter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, starterPokemon: starter })
    });
    
    if (!response.ok) {
      throw new Error("Failed to select starter");
    }
    
    const data = await response.json();
    console.log("Starter selected:", data);
    
    // Close modal and redirect
    const modal = document.getElementById("starterModal");
    if (modal) modal.remove();
    
    // Reload to show the main menu with starter
    window.location.reload();
  } catch (error) {
    console.error("Error selecting starter:", error);
    alert("Failed to select starter. Please try again.");
  }
}

// Add modal styles
const starterModalStyle = document.createElement("style");
starterModalStyle.textContent = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: linear-gradient(145deg, #1a1d24, #252a35);
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 500px;
    border: 2px solid #ffe66d;
    box-shadow: 0 0 40px rgba(255, 230, 109, 0.3);
  }
  .modal-content h2 {
    color: #ffe66d;
    margin: 0 0 10px;
    font-size: 28px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .modal-content p {
    color: #94a3b8;
    margin-bottom: 30px;
    font-size: 16px;
  }
  .starter-options {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .starter-btn {
    background: #0f172a;
    border: 3px solid #2d3748;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .starter-btn:hover {
    border-color: #ffe66d;
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(255, 230, 109, 0.4);
  }
  .starter-btn img {
    filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));
  }
  .starter-name {
    font-weight: 700;
    font-size: 14px;
  }
`;
document.head.appendChild(starterModalStyle);

// -------- INIT --------
document.addEventListener("DOMContentLoaded", () => {
  // Load user data first
  loadUserData();
  
  // Check if user needs to choose starter
  checkAndShowStarterModal();
  
  // Check if coming from wild encounter
  const inBattle = localStorage.getItem("inBattle") === "true";
  localStorage.removeItem("inBattle"); // Clear the flag
  
  const wild = loadWildPokemon();
  if (inBattle && wild && wild.pokemon) {
    // Use the wild pokemon from encounter
    showEnemy(wild.pokemon, wild.rarity, wild.level);
    battleState.enemyHp = (wild.level || 1) * 10 + 50;
    battleState.enemyMaxHp = battleState.enemyHp;
  } else {
    // Check if there's an existing battle pokemon (don't refresh if exists)
    const existingBattle = localStorage.getItem("battlePokemon");
    if (existingBattle) {
      try {
        const battleData = JSON.parse(existingBattle);
        if (battleData && battleData.pokemon) {
          showEnemy(battleData.pokemon, battleData.rarity, battleData.level);
          battleState.enemyHp = (battleData.level || 1) * 10 + 50;
          battleState.enemyMaxHp = battleState.enemyHp;
        } else {
          spawnEnemy();
          battleState.enemyHp = 100;
          battleState.enemyMaxHp = 100;
        }
      } catch {
        spawnEnemy();
        battleState.enemyHp = 100;
        battleState.enemyMaxHp = 100;
      }
    } else {
      // No existing battle pokemon, spawn new one
      spawnEnemy();
      battleState.enemyHp = 100;
      battleState.enemyMaxHp = 100;
    }
  }
  updateEnemyHpBar();
  setupBattleControls();
});
