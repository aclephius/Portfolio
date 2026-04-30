const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3
    },
    playerId: {
      type: String,
      unique: true,
      sparse: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      default: 1
    },
    coins: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "Active"
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    hasChosenStarter: {
      type: Boolean,
      default: false
    },
    starterPokemon: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
