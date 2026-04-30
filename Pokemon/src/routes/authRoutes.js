const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

async function generatePlayerId() {
  let playerId = "";
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(100000000 + Math.random() * 900000000);
    playerId = String(randomNumber);
    exists = await User.exists({ playerId });
  }

  return playerId;
}

router.post("/register", async (req, res, next) => {
  try {
    console.log("Register request body:", req.body);
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const exists = await User.findOne({ username: username.trim() });
    if (exists) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const playerId = await generatePlayerId();
    console.log("Creating user with:", { username: username.trim(), playerId });
    const user = await User.create({
      username: username.trim(),
      playerId,
      passwordHash
    });
    console.log("User created:", user);

    res.status(201).json({
      id: user._id,
      playerId: user.playerId,
      username: user.username,
      level: user.level,
      coins: user.coins,
      hasChosenStarter: user.hasChosenStarter || false
    });
  } catch (error) {
    console.error("Register error:", error);
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Support existing users manually inserted in MongoDB Compass with `password`.
    // If found, we validate once and migrate to secure `passwordHash`.
    const legacyPassword = user.get("password");
    const storedPassword = user.passwordHash || legacyPassword;

    if (!storedPassword) {
      return res.status(401).json({ message: "Account not registered correctly. Please register again." });
    }

    let valid = false;
    const looksHashed = typeof storedPassword === "string" && storedPassword.startsWith("$2");

    if (looksHashed) {
      valid = await bcrypt.compare(password, storedPassword);
    } else {
      valid = password === storedPassword;
      if (valid) {
        user.passwordHash = await bcrypt.hash(password, 10);
        user.set("password", undefined);
        await user.save();
      }
    }

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.playerId) {
      user.playerId = await generatePlayerId();
      await user.save();
    }

    res.json({
      id: user._id,
      playerId: user.playerId,
      username: user.username,
      level: user.level,
      coins: user.coins,
      wins: user.wins,
      losses: user.losses,
      hasChosenStarter: user.hasChosenStarter || false
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// Route to choose starter pokemon
router.post("/choose-starter", async (req, res, next) => {
  try {
    const { username, starterPokemon } = req.body;
    
    if (!username || !starterPokemon) {
      return res.status(400).json({ message: "Username and starter Pokemon are required" });
    }
    
    // Valid starter pokemon (Gen 1 starters)
    const validStarters = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee"];
    
    if (!validStarters.includes(starterPokemon.toLowerCase())) {
      return res.status(400).json({ message: "Invalid starter Pokemon" });
    }
    
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user with starter
    user.hasChosenStarter = true;
    user.starterPokemon = starterPokemon.toLowerCase();
    await user.save();
    
    res.json({
      id: user._id,
      playerId: user.playerId,
      username: user.username,
      hasChosenStarter: user.hasChosenStarter,
      starterPokemon: user.starterPokemon
    });
  } catch (error) {
    console.error("Choose starter error:", error);
    next(error);
  }
});
