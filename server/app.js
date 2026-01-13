const User = require("./models/User");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ לוג לכל בקשה (רק בשרת!)
app.use((req, res, next) => {
  console.log(req.method, req.url, req.body);
  next();
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mongoUser:mati1@cluster0.wxwcukg.mongodb.net/MorDB?retryWrites=true&w=majority";

// ✅ לוגים ברורים לחיבור
mongoose.connection.on("connected", () => console.log("✅ mongoose connected"));
mongoose.connection.on("error", (e) => console.log("❌ mongoose error:", e.message));
mongoose.connection.on("disconnected", () => console.log("⚠️ mongoose disconnected"));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to Mongo Atlas ✅"))
  .catch((err) => console.log("Mongo connect error ❌:", err.message));


// 🔹 החזרת סטטיסטיקות משתמש (לדף הבית)
app.post("/user/stats", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    const user = await User.findOne({ username }).select(
      "-password -__v"
    );

    if (!user) {
      return res.status(404).json({ ok: false, error: "NO_USER" });
    }

    res.json({
      ok: true,
      user,
    });
  } catch (err) {
    console.error("user/stats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


function ensureDb(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "DB not connected" });
  }
  return null;
}

// login check
app.post("/check-login", async (req, res) => {
  try {
    const gate = ensureDb(req, res);
    if (gate) return;

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


// מחזיר את הערכים 
app.post("/user/stats", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOne({ username }).select(
      "username addition subtraction multiplication division percent -_id"
    );

    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, user });
  } catch (err) {
    console.error("user/stats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// register
app.post("/register", async (req, res) => {
  try {
    const gate = ensureDb(req, res);
    if (gate) return;

    // ✅ age
    const { username, password, age } = req.body || {};

    if (!username || !password || age === undefined) {
      return res.status(400).json({ success: false, error: "חסר שם משתמש / סיסמה / גיל" });
    }

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 12) {
      return res.status(400).json({ success: false, error: "גיל חייב להיות בין 1 ל-12" });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ success: false, error: "שם משתמש כבר קיים" });
    }

    // ✅ save age
    const user = await User.create({ username, password, age: ageNum });

    return res.json({ success: true, id: user._id });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});


// addition
app.post("/score/addition", async (req, res) => {
  try {
    console.log("BODY:", req.body); // ✅ כאן

    const { username } = req.body;
    if (!username) {
      console.log("NO_USERNAME");
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    console.log("INC FIELD:", "addition"); // ✅

    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { addition: 1 } },
      { new: true, projection: { password: 0 } }
    );

    console.log("UPDATED USER:", user); // ✅ 

    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, addition: user.addition });
  } catch (e) {
    console.log("ERR:", e);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


// GET /user/addition-f?username=...
app.get("/user/addition-f", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOne({ username }, { password: 0 });
    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    return res.json({ ok: true, addition_f: user.addition_f ?? 1 });
  } catch (e) {
    console.log("ERR:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


// GET /user/subtraction?username=...
app.get("/user/subtraction-f", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOne({ username }, { password: 0 });
    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    return res.json({ ok: true, subtraction_f: user.subtraction_f ?? 1 });
  } catch (e) {
    console.log("ERR:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// GET /user/multiplication-f?username=...
app.get("/user/multiplication-f", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOne({ username }, { password: 0 });
    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    return res.json({ ok: true, multiplication_f: user.multiplication_f ?? 1 });
  } catch (e) {
    console.log("ERR:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


app.post("/score/multiplication", async (req, res) => {
  try {
    console.log("BODY:", req.body); // ✅ כאן

    const { username } = req.body;
    if (!username) {
      console.log("NO_USERNAME");
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    console.log("INC FIELD:", "multiplication"); // ✅ כאן (לא חובה)

    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { multiplication: 1 } },
      { new: true, projection: { password: 0 } }
    );

    // GET /user/division-f?username=...
    app.get("/user/division-f", async (req, res) => {
      try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

        const user = await User.findOne({ username }, { password: 0 });
        if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

        return res.json({ ok: true, division_f: user.division_f ?? 1 });
      } catch (e) {
        console.log("ERR:", e);
        return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
      }
    });

    console.log("UPDATED USER:", user); // ✅ גם זה עוזר מאוד

    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, multiplication: user.multiplication });
  } catch (e) {
    console.log("ERR:", e);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});



//subtraction
app.post("/score/subtraction", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { username } = req.body;
    if (!username) {
      console.log("NO_USERNAME");
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    console.log("INC FIELD:", "subtraction");

    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { subtraction: 1 } },
      { new: true, projection: { password: 0 } }
    );

    console.log("UPDATED USER:", user);

    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, subtraction: user.subtraction });
  } catch (e) {
    console.log("ERR:", e);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});




//devision
app.post("/score/division", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { username } = req.body;
    if (!username) {
      console.log("NO_USERNAME");
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    console.log("INC FIELD:", "division");

    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { division: 1 } },
      { new: true, projection: { password: 0 } }
    );

    console.log("UPDATED USER:", user);

    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, division: user.division });
  } catch (e) {
    console.log("ERR:", e);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

app.post("/score/percent", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { percent: 1 } },
      { new: true, projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, percent: user.percent });
  } catch (e) {
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

app.get("/user/percent-f", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    if (!username) return res.status(400).json({ ok: false, error: "NO_USERNAME" });

    const user = await User.findOne({ username }, { percent_f: 1 });
    if (!user) return res.status(404).json({ ok: false, error: "NO_USER" });

    res.json({ ok: true, percent_f: Number(user.percent_f || 1) });
  } catch (e) {
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// 🔹 return stetistics
app.post("/user/stats", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ ok: false, error: "NO_USERNAME" });
    }

    const user = await User.findOne({ username }).select(
      "-password -__v"
    );

    if (!user) {
      return res.status(404).json({ ok: false, error: "NO_USER" });
    }

    res.json({
      ok: true,
      user,
    });
  } catch (err) {
    console.error("user/stats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});


// Export the app for Vercel (or tests)
module.exports = app;

// Only listen if this file is run directly (not imported)
if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}
