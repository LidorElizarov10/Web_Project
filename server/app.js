const User = require("./models/User");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Logger middleware
app.use((req, res, next) => {
  console.log(req.method, req.url, req.body);
  next();
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://webDB:Lidor053@cluster0.e9y55hn.mongodb.net/web_project?retryWrites=true&w=majority";

console.log("🔍 MONGO_URI:", MONGO_URI);
console.log("🔍 Environment MONGO_URI:", process.env.MONGO_URI);

mongoose.connection.on("connected", () => console.log("✅ mongoose connected"));
mongoose.connection.on("error", (e) => console.log("❌ mongoose error:", e.message));
mongoose.connection.on("disconnected", () => console.log("⚠️ mongoose disconnected"));

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    socketTimeoutMS: 45000, // 45 seconds socket timeout
  })
  .then(() => console.log("Connected to Mongo Atlas ✅"))
  .catch((err) => console.log("Mongo connect error ❌:", err.message));

function ensureDb(req, res) {
  console.log("🔍 Connection readyState:", mongoose.connection.readyState);
  if (mongoose.connection.readyState !== 1) {
    console.log("❌ DB not ready, readyState:", mongoose.connection.readyState);
    return res.status(503).json({ error: "DB not connected" });
  }
  console.log("✅ DB connection is ready");
  return null;
}

// 🔹 API Router
const api = express.Router();

// 🔹 User Stats (Unified)
api.post("/user/stats", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }
    const user = await User.findOne({ username }).select("-password -__v");
    if (!user) {
      return res.status(404).json({ ok: false, error: "NO_USER" });
    }
    res.json({ ok: true, user });
  } catch (err) {
    console.error("user/stats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// 🔹 Login Check
api.post("/check-login", async (req, res) => {
  try {
    if (ensureDb(req, res)) return;
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "חסר שם משתמש או סיסמה" });
    }
    const user = await User.findOne({ username }).select("password").lean();
    if (!user) return res.json({ ok: false, reason: "NO_USER" });
    if (user.password !== password) return res.json({ ok: false, reason: "BAD_PASS" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 🔹 Register
api.post("/register", async (req, res) => {
  try {
    console.log("📝 Register attempt started");
    if (ensureDb(req, res)) return;
    console.log("✅ DB connection verified");
    
    const { username, password, age } = req.body || {};
    if (!username || !password || age === undefined) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ success: false, error: "חסר שם משתמש / סיסמה / גיל" });
    }
    
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 12) {
      console.log("❌ Invalid age:", ageNum);
      return res.status(400).json({ success: false, error: "גיל חייב להיות בין 1 ל-12" });
    }
    
    console.log("🔍 Checking if user exists:", username);
    const exists = await User.findOne({ username });
    if (exists) {
      console.log("❌ User already exists:", username);
      return res.status(409).json({ success: false, error: "שם משתמש כבר קיים" });
    }
    
    console.log("💾 Creating new user:", username);
    const user = await User.create({ username, password, age: ageNum });
    console.log("✅ User created successfully:", user._id);
    return res.json({ success: true, id: user._id });
  } catch (err) {
    console.log("💥 Register error:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 🔹 Score Updates
const scoreFields = ["addition", "subtraction", "multiplication", "division", "percent"];

scoreFields.forEach(field => {
  api.post(`/score/${field}`, async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

      const update = { $inc: {} };
      update.$inc[field] = 1;

      const user = await User.findOneAndUpdate(
        { username },
        update,
        { new: true, projection: { password: 0 } }
      );

      if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });
      res.json({ ok: true, [field]: user[field] });
    } catch (e) {
      console.log("ERR:", e);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  });

  // 🔹 Get Field Frequency (e.g. addition_f)
  api.get(`/user/${field}-f`, async (req, res) => {
    try {
      const { username } = req.query;
      if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });
      const user = await User.findOne({ username }, { password: 0 });
      if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });
      const key = `${field}_f`;
      return res.json({ ok: true, [key]: user[key] ?? 1 });
    } catch (e) {
      console.log("ERR:", e);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  });
});

// ✅ Mount API Router
app.use("/api", api);

module.exports = app;

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}
