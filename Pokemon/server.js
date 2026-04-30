const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const playerRoutes = require("./src/routes/playerRoutes");
const encounterRoutes = require("./src/routes/encounterRoutes");
const pokemonRoutes = require("./src/routes/pokemonRoutes");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://localhost:5000", "http://127.0.0.1:5500", "file://"],
  credentials: true
}));
app.use(express.json());
app.use(express.static("PAGES"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Pokestar API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/pokemon", pokemonRoutes);

app.use((err, _req, res, _next) => {
  console.error("Error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
