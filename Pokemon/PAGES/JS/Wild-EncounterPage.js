
// -------- SEEDED RANDOM FOR ACCOUNT-BASED SPAWNS --------
function getSeededRandom() {
  const username = localStorage.getItem("accountUsername") || localStorage.getItem("playerName") || "guest";
  // Simple hash function to create a seed from username
  let seed = 0;
  for (let i = 0; i < username.length; i++) {
    seed = ((seed << 5) - seed) + username.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }
  // Add current time component for variety across encounters
  seed = seed + Date.now();
  
  return function() {
    // Mulberry32 - simple seeded random
    seed = seed | 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------- rarity classification (REAL DATA) --------
function classifyRarity(species){
  if (species.is_mythical) return "mythical";
  if (species.is_legendary) return "legendary";

  const rate = species.capture_rate;
  if (rate >= 200) return "common";
  if (rate >= 100) return "uncommon";
  if (rate >= 45) return "rare";
  return "ultra-rare";
}

// spawn chance filter (makes rare appear less)
function raritySpawnChance(rarity){
  return {
    common: 1.0,
    uncommon: 0.6,
    rare: 0.25,
    "ultra-rare": 0.10,
    legendary: 0.02,
    mythical: 0.005
  }[rarity];
}

// rarity colors
function rarityColor(r){
  return {
    common:"#9e9e9e",
    uncommon:"#4caf50",
    rare:"#2196f3",
    "ultra-rare":"#9c27b0",
    legendary:"#ff9800",
    mythical:"#ff1744"
  }[r];
}

// -------- IV SYSTEM --------
// 0–31 per stat like real Pokémon

function generateIV(){
  return Math.floor(Math.random()*32);
}

function generateIVs(){
  return {
    hp: generateIV(),
    attack: generateIV(),
    defense: generateIV(),
    "special-attack": generateIV(),
    "special-defense": generateIV(),
    speed: generateIV()
  };
}

// Seeded versions for account-based spawns
function generateIVSeeded(randomFn){
  return {
    hp: Math.floor(randomFn() * 32),
    attack: Math.floor(randomFn() * 32),
    defense: Math.floor(randomFn() * 32),
    "special-attack": Math.floor(randomFn() * 32),
    "special-defense": Math.floor(randomFn() * 32),
    speed: Math.floor(randomFn() * 32)
  };
}

// -------- FINAL STAT CALCULATION --------

function calculateFinalStats(baseStats, ivs, level){
  return {
    hp: baseStats.hp + ivs.hp + level * 3,
    attack: baseStats.attack + ivs.attack + level * 2,
    defense: baseStats.defense + ivs.defense + level * 2,
    "special-attack": baseStats["special-attack"] + ivs["special-attack"] + level * 2,
    "special-defense": baseStats["special-defense"] + ivs["special-defense"] + level * 2,
    speed: baseStats.speed + ivs.speed + level * 2
  };
}



// -------- LEVEL + STAT HELPERS --------

// early game level range
function generateLevel(){
  return Math.floor(Math.random()*5) + 3; // level 3–8
}

// Seeded version for account-based spawns
function generateLevelSeeded(randomFn){
  return Math.floor(randomFn() * 5) + 3; // level 3–8
}

function extractStats(pokemon){
  const stats = {};
  pokemon.stats.forEach(s=>{
    stats[s.stat.name] = s.base_stat;
  });
  return stats;
}

function statRow(name,value){
  const width = value / 2; // scale bar
  return `
    <div class="stat">
      <span>${name}</span>
      <span>${value}</span>
    </div>
    <div class="stat-bar" style="width:${width}%"></div>
  `;
}

// -------- SPAWN SYSTEM --------
async function spawnPokemon(){
  const seededRandom = getSeededRandom();
  let attempts = 0;
  const maxAttempts = 20;

  while(attempts < maxAttempts){
    attempts++;
    
    const id = Math.floor(seededRandom() * 1025) + 1;

    try {
      const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const species = await speciesRes.json();

      const rarity = classifyRarity(species);
      console.log(`Attempt ${attempts}: ${species.name} - ${rarity}`);

      if(seededRandom() > raritySpawnChance(rarity)) {
        console.log(`  -> Failed rarity check, retrying...`);
        continue;
      }

      const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const pokemon = await pokeRes.json();

      const level = generateLevelSeeded(seededRandom);
      const ivs = generateIVsSeeded(seededRandom);

      localStorage.setItem(
        "wildPokemon",
        JSON.stringify({pokemon, rarity, level, ivs})
      );

      console.log(`  -> Spawning ${pokemon.name}!`);
      showPokemon(pokemon, rarity, level, ivs);
      return;
    } catch(e) {
      console.error("Error fetching Pokemon:", e);
    }
  }
  
  // Fallback: spawn a random Pokemon if all attempts fail
  console.log("Max attempts reached, spawning fallback Pokemon");
  const id = Math.floor(Math.random()*1025)+1;
  const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const pokemon = await pokeRes.json();
  const level = generateLevel();
  const ivs = generateIVs();
  
  localStorage.setItem(
    "wildPokemon",
    JSON.stringify({pokemon, rarity: "common", level, ivs})
  );
  
  showPokemon(pokemon, "common", level, ivs);
}

// show in UI
function showPokemon(pokemon, rarity, level, ivs){

  const baseStats = extractStats(pokemon);
  const finalStats = calculateFinalStats(baseStats, ivs, level);

  // Update area title
  const areaTitle = document.querySelector(".area-title");
  if(areaTitle) areaTitle.innerText = "A Wild Pokémon Appeared!";

  // Hide searching state, show pokemon
  const searchingState = document.getElementById("searchingState");
  const spawnArea = document.getElementById("spawnArea");
  if(searchingState) searchingState.classList.add("hidden");
  if(spawnArea) spawnArea.classList.remove("hidden");
  
  // Update status
  const statusDot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-text");
  if(statusDot) statusDot.classList.remove("searching");
  if(statusText) statusText.innerText = "Pokemon Found!";

  const pokemonNameEl = document.getElementById("pokemonName");
  if(pokemonNameEl){
    pokemonNameEl.innerText = `${pokemon.name.toUpperCase()}  Lv.${level}`;
  }

  const pokemonSpriteEl = document.getElementById("pokemonSprite");
  if(pokemonSpriteEl){
    pokemonSpriteEl.innerHTML =
      `<img src="${pokemon.sprites.other['official-artwork'].front_default}" width="220">`;
  }

  const rarityBox = document.getElementById("rarity");
  if(rarityBox){
    rarityBox.innerText = rarity.toUpperCase();
    rarityBox.style.color = rarityColor(rarity);
  }

  // ⭐ NEW — render stats
  const pokemonStatsEl = document.getElementById("pokemonStats");
  if(pokemonStatsEl){
    pokemonStatsEl.innerHTML = `
    <h2>Stats</h2>
    ${statRow("HP", finalStats.hp)}
    ${statRow("Attack", finalStats.attack)}
    ${statRow("Defense", finalStats.defense)}
    ${statRow("Sp.Atk", finalStats["special-attack"])}
    ${statRow("Sp.Def", finalStats["special-defense"])}
    ${statRow("Speed", finalStats.speed)}

    <hr>
    <h3>IVs</h3>
    ${statRow("HP IV", ivs.hp)}
    ${statRow("Atk IV", ivs.attack)}
    ${statRow("Def IV", ivs.defense)}
    ${statRow("SpAtk IV", ivs["special-attack"])}
    ${statRow("SpDef IV", ivs["special-defense"])}
    ${statRow("Speed IV", ivs.speed)}
  `;
  }

  if(spawnArea) spawnArea.classList.remove("hidden");
}

// -------- RANDOM TIME ENCOUNTER --------
let searchTimer = null;
let encounterTimeout = null;

function randomBetween(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDuration(ms){
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if(hours > 0){
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function startEncounter(){
  const seededRandom = getSeededRandom();
  const min = 30 * 1000;       // 30 seconds
  const max = 60 * 60 * 1000;  // 1 hour
  // Roll a fresh random delay every encounter cycle (seeded by account)
  const delay = Math.floor(seededRandom() * (max - min + 1)) + min;
  
  // Save timer end time to localStorage
  const endTime = Date.now() + delay;
  localStorage.setItem("encounterEndTime", endTime);
  
  // Update timer countdown
  const timerEl = document.getElementById("timerCount");
  if(timerEl) {
    timerEl.innerText = formatDuration(delay);
    
    // Clear any existing timer
    if(searchTimer) clearInterval(searchTimer);
    if(encounterTimeout) clearTimeout(encounterTimeout);
    
    // Update countdown every second
    let remainingMs = delay;
    searchTimer = setInterval(() => {
      remainingMs = endTime - Date.now();
      if(remainingMs > 0 && timerEl) {
        timerEl.innerText = formatDuration(remainingMs);
      } else if(timerEl) {
        timerEl.innerText = "00:00";
      }
    }, 1000);
  }

  encounterTimeout = setTimeout(() => {
    // Clear timer when search starts
    if(searchTimer) clearInterval(searchTimer);
    searchTimer = null;
    encounterTimeout = null;
    localStorage.removeItem("encounterEndTime");
    spawnPokemon();
  }, delay);
}

// go to battle page
function goToBattle(){
  // Mark that we're going to battle so wild encounter knows to use this pokemon
  localStorage.setItem("inBattle", "true");
  window.location.href = "BattlePage.html";
}

// run from encounter - hide spawn area and start new search
function runFromEncounter(){
  // Clear the saved wild pokemon
  localStorage.removeItem("wildPokemon");
  localStorage.removeItem("encounterEndTime");
  
  // Hide spawn area and show searching state
  const spawnArea = document.getElementById("spawnArea");
  const searchingState = document.getElementById("searchingState");
  
  if(spawnArea) spawnArea.classList.add("hidden");
  if(searchingState) searchingState.classList.remove("hidden");
  
  // Start a new encounter
  startEncounter();
}

function renderSavedWildPokemon(){
  const saved = localStorage.getItem("wildPokemon");
  if(!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if(!parsed || !parsed.pokemon || !parsed.rarity) return;
    showPokemon(parsed.pokemon, parsed.rarity, parsed.level || 1, parsed.ivs || generateIVs());
  } catch(error){
    console.error("Failed to parse saved wild pokemon:", error);
  }
}

function renderPlayerName(){
  const savedPlayerName = localStorage.getItem("playerName");
  const fallbackAccountName = localStorage.getItem("accountUsername");
  const playerName = (savedPlayerName || fallbackAccountName || "Trainer").trim();

  const playerNameEls = document.querySelectorAll("[data-player-name]");
  playerNameEls.forEach((el) => {
    el.textContent = `Player: ${playerName}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const hasSpawnArea = !!document.getElementById("spawnArea");
  const isWildEncounterPage = !!document.getElementById("searchingState") && !!document.getElementById("timerCount");

  renderPlayerName();

  if(hasSpawnArea){
    renderSavedWildPokemon();
  }

  if(isWildEncounterPage){
    // Check for saved timer end time
    const savedEndTime = localStorage.getItem("encounterEndTime");
    if(savedEndTime) {
      const endTime = parseInt(savedEndTime, 10);
      const remainingMs = endTime - Date.now();
      
      // If timer hasn't expired, restore it
      if(remainingMs > 0) {
        const timerEl = document.getElementById("timerCount");
        if(timerEl) {
          timerEl.innerText = formatDuration(remainingMs);
          
          if(searchTimer) clearInterval(searchTimer);
          if(encounterTimeout) clearTimeout(encounterTimeout);
          
          searchTimer = setInterval(() => {
            const remaining = endTime - Date.now();
            if(remaining > 0 && timerEl) {
              timerEl.innerText = formatDuration(remaining);
            } else if(timerEl) {
              timerEl.innerText = "00:00";
            }
          }, 1000);
          
          encounterTimeout = setTimeout(() => {
            if(searchTimer) clearInterval(searchTimer);
            searchTimer = null;
            encounterTimeout = null;
            localStorage.removeItem("encounterEndTime");
            spawnPokemon();
          }, remainingMs);
        }
      } else {
        // Timer expired while away, clear and start new
        localStorage.removeItem("encounterEndTime");
        startEncounter();
      }
    } else {
      startEncounter();
    }
  }
});

// Function to restart search after battle
function restartSearch() {
  if(searchTimer) clearInterval(searchTimer);
  if(encounterTimeout) clearTimeout(encounterTimeout);

  localStorage.removeItem("encounterEndTime");
  
  const spawnArea = document.getElementById("spawnArea");
  const searchingState = document.getElementById("searchingState");
  if(spawnArea) spawnArea.classList.add("hidden");
  if(searchingState) searchingState.classList.remove("hidden");
  
  const statusDot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-text");
  if(statusDot) statusDot.classList.add("searching");
  if(statusText) statusText.innerText = "Auto-searching...";
  
  startEncounter();
}