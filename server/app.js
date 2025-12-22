const User = require("./models/User");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://mongoUser:737425503@cluster0.wxwcukg.mongodb.net/MorDB?appName=Cluster0";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to Mongo Atlas ✅"))
  .catch((err) => console.log("Mongo error:", err.message));

app.post("/check-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "חסר שם משתמש או סיסמה" });
    }

    const user = await User.findOne({ username }).select("password");

    if (!user) {
      return res.json({ ok: false, reason: "NO_USER" }); // משתמש לא קיים
    }

    if (user.password !== password) {
      return res.json({ ok: false, reason: "BAD_PASS" }); // סיסמה לא נכונה
    }

    return res.json({ ok: true }); // הצלחה
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// רישום משתמש
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.create({ username, password });
    res.json({ success: true, id: user._id });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
