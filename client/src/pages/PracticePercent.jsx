import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useCatCongrats from "./useCatCongrats";
import useCatUncongrats from "./useCatUncongrats";

const PERCENT_STATE_KEY = "percent_practice_state_v1";
import API_URL from "../config";

const API_BASE = API_URL;

const LEVELS = {
  easy: { label: "מתחילים (קל מאוד)", minBase: 10, maxBase: 200 },
  medium: { label: "מתקדמים (קל)", minBase: 10, maxBase: 400 },
  hard: { label: "אלופים (עדיין לילדים)", minBase: 10, maxBase: 600 },
};

const LEVEL_TEXT = {
  easy: {
    title: "אחוזים למתחילים 😺",
    body:
      "אחוזים זה 'כמה מתוך 100'.\n" +
      "חישובים סופר קלים:\n" +
      "50% = חצי, 25% = רבע, 10% = לחלק ב־10.\n" +
      "דוגמה: 25% מ־80 = 20.\n" +
      "טיפ של מתי: קודם עושים 10/25/50 ואז ממשיכים 🐾",
  },
  medium: {
    title: "אחוזים מתקדמים 🐾",
    body:
      "עכשיו מוסיפים עוד אחוזים קלים.\n" +
      "5% זה חצי של 10%.\n" +
      "20% זה כפול מ־10%.\n" +
      "דוגמה: 15% מ־200 = 10% (20) + 5% (10) = 30.\n" +
      "טיפ של מתי: תחשוב בחתיכות קטנות 😺",
  },
  hard: {
    title: "אחוזים לאלופים 🐯",
    body:
      "פה עושים אחוזים קצת יותר 'חכמים', אבל עדיין פשוטים.\n" +
      "1% = לחלק ב־100.\n" +
      "2% = פעמיים 1%.\n" +
      "4% = כפול 2%.\n" +
      "דוגמה: 4% מ־200 = 8.\n" +
      "טיפ של מתי: תמיד אפשר לפרק אחוזים לחלקים 🧱",
  },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 1 => easy, 2 => medium, 3+ => hard
 */
function levelFromPercentF(percent_f) {
  const n = Number(percent_f ?? 1);
  if (!Number.isFinite(n) || n <= 1) return "easy";
  if (n === 2) return "medium";
  return "hard";
}

/**
 * GET /user/percent-f?username=...
 * returns: { ok:true, percent_f:number }
 */
async function fetchPercentF(username) {
  try {
    const res = await fetch(
      `${API_BASE}/user/percent-f?username=${encodeURIComponent(username)}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return null;
    const n = Number(data.percent_f);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Generate kid-friendly percent question with integer answer.
 * We pick percent "p" based on level.
 * Then we create base as (answer * 100) / p so the answer is always whole.
 */
function makeQuestion(levelKey) {
  const lvl = levelKey || "easy";

  const PERCENTS_BY_LEVEL = {
    easy: [10, 25, 50],
    medium: [5, 10, 20, 25, 50],
    hard: [1, 2, 4, 5, 10, 20, 25, 50],
  };

  const p = randChoice(PERCENTS_BY_LEVEL[lvl] || PERCENTS_BY_LEVEL.easy);

  // Choose an answer (result) range per level (keep small)
  const ansRanges = {
    easy: { min: 1, max: 20 },
    medium: { min: 1, max: 40 },
    hard: { min: 1, max: 60 },
  };
  const { min, max } = ansRanges[lvl] || ansRanges.easy;
  const ans = randInt(min, max);

  // base must be integer: base = ans*100 / p
  let base = (ans * 100) / p;

  // Ensure base is integer (it should be given our percent set)
  // But just in case, retry a few times.
  let tries = 0;
  while (!Number.isInteger(base) && tries < 20) {
    const ans2 = randInt(min, max);
    base = (ans2 * 100) / p;
    tries++;
  }

  // Keep base not too huge (kid-friendly). If too big, reduce answer.
  if (base > 600) {
    const ansSmall = Math.max(1, Math.floor((600 * p) / 100));
    base = (ansSmall * 100) / p;
    return { p, base, ans: ansSmall };
  }

  return { p, base, ans };
}

export default function PracticePercent() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const { triggerCatFx, CatCongrats } = useCatCongrats(900);
  const { triggerBadCatFx, CatUncongrats } = useCatUncongrats(900);

  const [level, setLevel] = useState("easy");
  const [q, setQ] = useState(() => makeQuestion("easy"));
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [story, setStory] = useState("");
  const [noPointsThisQuestion, setNoPointsThisQuestion] = useState(false);

  function savePracticeState(next = {}) {
    sessionStorage.setItem(
      PERCENT_STATE_KEY,
      JSON.stringify({ level, q, input, msg, noPointsThisQuestion, ...next })
    );
  }

  function clearPracticeState() {
    sessionStorage.removeItem(PERCENT_STATE_KEY);
  }

  // Restore state + story on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(PERCENT_STATE_KEY);
    if (saved) {
      try {
        const st = JSON.parse(saved);
        if (st?.level) setLevel(st.level);
        if (st?.q) setQ(st.q);
        if (typeof st?.input === "string") setInput(st.input);
        if (typeof st?.msg === "string") setMsg(st.msg);
        if (typeof st?.noPointsThisQuestion === "boolean")
          setNoPointsThisQuestion(st.noPointsThisQuestion);
      } catch {
        // ignore
      }
    }

    const s = sessionStorage.getItem("cat_story_text");
    if (s) {
      setStory(s);
      sessionStorage.removeItem("cat_story_text");
    }
  }, []);

  // Auto-level from percent_f (do not override if saved state exists)
  useEffect(() => {
    (async () => {
      if (sessionStorage.getItem(PERCENT_STATE_KEY)) return;

      const username = localStorage.getItem("username");
      if (!username) return;

      const f = await fetchPercentF(username);
      const newLevel = levelFromPercentF(f);

      setLevel(newLevel);
      setQ(makeQuestion(newLevel));
      setInput("");
      setMsg("");
      setNoPointsThisQuestion(false);
    })();
  }, []);

  function goNextQuestion(nextLevel = level) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearPracticeState();
    setStory("");
    sessionStorage.removeItem("cat_story_text");
    setMsg("");
    setInput("");
    setNoPointsThisQuestion(false);
    setQ(makeQuestion(nextLevel));
  }

  function goStory() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNoPointsThisQuestion(true);
    savePracticeState({ noPointsThisQuestion: true });

    // Story screen should know it's percent question
    navigate("/cat-story", { state: { p: q.p, base: q.base, op: "%" } });
  }

  async function incPercentScoreIfAllowed() {
    if (noPointsThisQuestion) return;

    const username = localStorage.getItem("username");
    if (!username) return;

    try {
      await fetch(`${API_BASE}/score/percent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch {
      // silent fail
    }
  }

  function checkAnswer() {
    const val = Number(input);

    if (input.trim() === "" || !Number.isFinite(val)) {
      const m = "הקלד מספר";
      setMsg(m);
      savePracticeState({ msg: m });
      return;
    }

    if (val === q.ans) {
      const m = noPointsThisQuestion
        ? "✅ נכון (בלי נקודות כי ביקשת סיפור)"
        : "✅ נכון";
      setMsg(m);
      savePracticeState({ msg: m });

      triggerCatFx();
      incPercentScoreIfAllowed();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => goNextQuestion(level), 1000);
      return;
    }

    triggerBadCatFx();
    const m = "❌ לא נכון";
    setMsg(m);
    savePracticeState({ msg: m });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "Arial",
        maxWidth: 420,
        margin: "40px auto",
        direction: "rtl",
        textAlign: "right",
        position: "relative",
      }}
    >
      <CatCongrats />
      <CatUncongrats />

      <h2>תרגול אחוזים</h2>

      <div className="mt-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="text-xs font-bold text-slate-600">הרמה שלך:</div>
        <div className="text-sm font-extrabold text-slate-900">
          {level === "easy"
            ? "מתחילים 😺"
            : level === "medium"
              ? "מתקדמים 🐾"
              : "אלופים 🐯"}
        </div>
      </div>

      {/* Question display */}
      <div style={{ fontSize: 22, fontWeight: 900, margin: "16px 0", lineHeight: 1.4 }}>
        כמה זה {q.p}% מתוך {q.base} ?
      </div>

      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          savePracticeState({ input: e.target.value });
        }}
        placeholder="תשובה"
        style={{ padding: 8, width: "100%", boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={checkAnswer}>בדוק</button>

        <button
          onClick={goStory}
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 10px",
          }}
          title="מתי החתול יספר סיפור על התרגיל הזה"
        >
          ספר סיפור 😺
        </button>

        <button
          onClick={() => goNextQuestion(level)}
          style={{
            background: "#0f172a",
            color: "white",
            border: "1px solid #0f172a",
            borderRadius: 8,
            padding: "6px 10px",
          }}
          title="עובר לתרגיל הבא ומנקה את הקודם"
        >
          תרגיל הבא ➜
        </button>
      </div>

      {msg ? (
        <div style={{ marginTop: 10, fontWeight: 800, color: "#0f172a" }}>
          {msg}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-slate-900">
            {LEVEL_TEXT[level]?.title ?? "הסבר לרמה"}
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {LEVELS[level]?.label}
          </span>
        </div>

        <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-line">
          {LEVEL_TEXT[level]?.body ?? ""}
        </p>
      </div>

      {story ? (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm font-extrabold text-slate-900">
            הסיפור של מתי 😺
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {story}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
