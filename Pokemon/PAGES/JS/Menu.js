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

// -------- SPAWN SYSTEM --------
async function spawnPokemon(){

  while(true){

    const id = Math.floor(Math.random()*1025)+1;

    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const species = await speciesRes.json();

    const rarity = classifyRarity(species);
    if(Math.random() > raritySpawnChance(rarity)) continue;

    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const pokemon = await pokeRes.json();

    showPokemon(pokemon, rarity);
    break;
  }
}

// show in UI
function showPokemon(pokemon, rarity){
  document.querySelector(".title").innerText = "A Wild Pokémon Appeared!";

  document.getElementById("pokemonName").innerText =
    pokemon.name.toUpperCase();

  document.getElementById("pokemonSprite").innerHTML =
    `<img src="${pokemon.sprites.front_default}" width="150">`;

  const rarityBox = document.getElementById("rarity");
  rarityBox.innerText = rarity.toUpperCase();
  rarityBox.style.color = rarityColor(rarity);

  document.getElementById("spawnArea").classList.remove("hidden");
}

// -------- RANDOM TIME ENCOUNTER --------
function startEncounter(){
  const min = 3000;   // 3 sec
  const max = 12000;  // 12 sec
  const delay = Math.random()*(max-min)+min;

  setTimeout(spawnPokemon, delay);
}

startEncounter();

// go to battle page
function goToBattle(){
  window.location.href = "BattlePage.html";
}