const express = require("express");

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

// -------- SERVER-SIDE REWARD TABLE --------
// The backend calculates all coin values so clients cannot tamper.
function getReward(action, context = {}) {
  const { rarity = "common", level = 1 } = context;

  const rarityMultipliers = {
    common: 10,
    uncommon: 20,
    rare: 50,
    "ultra-rare": 100,
    legendary: 500,
    mythical: 1000
  };

  const multiplier = rarityMultipliers[rarity] || 10;

  switch (action) {
    case "defeated_pokemon":
      return multiplier * level;
    case "captured_pokemon":
      return multiplier * level * 2;
    case "daily_login":
      return 100;
    default:
      return 0;
  }
}

router.get("/:username", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Backfill old accounts that still have no playerId.
    if (!user.playerId) {
      user.playerId = await generatePlayerId();
      await user.save();
    }

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    delete safeUser.password;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

router.patch("/:username", async (req, res, next) => {
  try {
    const updates = (({ level, coins, wins, losses, status, avatarUrl }) => ({
      level,
      coins,
      wins,
      losses,
      status,
      avatarUrl
    }))(req.body);

    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: updates },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// -------- COIN ENDPOINTS --------

// GET current coin balance
router.get("/:username/coins", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("coins username");
    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.json({ username: user.username, coins: user.coins });
  } catch (error) {
    next(error);
  }
});

// POST earn coins — server calculates the amount based on action + context
router.post("/:username/coins/earn", async (req, res, next) => {
  try {
    const { action, context } = req.body;
    const amount = getReward(action, context);

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid action or no reward for this action" });
    }

    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $inc: { coins: amount } },
      { new: true }
    ).select("coins username");

    if (!user) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json({
      username: user.username,
      coins: user.coins,
      earned: amount,
      action
    });
  } catch (error) {
    next(error);
  }
});

// POST spend coins — server validates balance and deducts atomically
router.post("/:username/coins/spend", async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({ message: "Amount must be a positive integer" });
    }

    // Atomic check-and-deduct: only decrement if coins >= amount
    const user = await User.findOneAndUpdate(
      { username: req.params.username, coins: { $gte: amount } },
      { $inc: { coins: -amount } },
      { new: true }
    ).select("coins username");

    if (!user) {
      // Could be either player not found OR insufficient coins
      const exists = await User.exists({ username: req.params.username });
      if (!exists) {
        return res.status(404).json({ message: "Player not found" });
      }
      return res.status(400).json({ message: "Insufficient coins" });
    }

    res.json({
      username: user.username,
      coins: user.coins,
      spent: amount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
