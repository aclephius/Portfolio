const mongoose = require("mongoose");

const ivSchema = new mongoose.Schema(
  {
    hp: Number,
    attack: Number,
    defense: Number,
    "special-attack": Number,
    "special-defense": Number,
    speed: Number
  },
  { _id: false }
);

const statSchema = new mongoose.Schema(
  {
    hp: Number,
    attack: Number,
    defense: Number,
    "special-attack": Number,
    "special-defense": Number,
    speed: Number
  },
  { _id: false }
);

const wildEncounterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    pokemonId: Number,
    name: String,
    rarity: String,
    level: Number,
    sprite: String,
    ivs: ivSchema,
    stats: statSchema,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WildEncounter", wildEncounterSchema);
