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

const playerPokemonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    pokemonId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rarity: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    sprite: String,
    ivs: ivSchema,
    stats: statSchema,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerPokemon", playerPokemonSchema);
