const express = require("express");

const User = require("../models/User");
const WildEncounter = require("../models/WildEncounter");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { username, pokemonId, name, rarity, level, sprite, ivs, stats } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    await WildEncounter.deleteMany({ userId: user._id });

    const encounter = await WildEncounter.create({
      userId: user._id,
      pokemonId,
      name,
      rarity,
      level,
      sprite,
      ivs,
      stats
    });

    res.status(201).json(encounter);
  } catch (error) {
    next(error);
  }
});

router.get("/latest/:username", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    const encounter = await WildEncounter.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (!encounter) {
      return res.status(404).json({ message: "No encounter found" });
    }

    res.json(encounter);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
