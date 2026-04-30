const express = require("express");

const User = require("../models/User");
const PlayerPokemon = require("../models/PlayerPokemon");

const router = express.Router();

router.post("/capture", async (req, res, next) => {
  try {
    const { username, pokemonId, name, rarity, level, sprite, ivs, stats } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    const savedPokemon = await PlayerPokemon.create({
      userId: user._id,
      pokemonId,
      name,
      rarity,
      level,
      sprite,
      ivs,
      stats
    });

    res.status(201).json(savedPokemon);
  } catch (error) {
    next(error);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    const list = await PlayerPokemon.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
