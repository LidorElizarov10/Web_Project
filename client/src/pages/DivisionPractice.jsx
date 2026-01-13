import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useCatCongrats from "./useCatCongrats.jsx";
import useCatUncongrats from "./useCatUncongrats.jsx";

const DIV_STATE_KEY = "division_practice_state_v1";
import API_URL from "../config";

const API_BASE = API_URL;

/**
 * Hebrew UI text (kid-facing).
 * Developer comments are English only.
 */
const LEVEL_TEXT = {
  beginners: {
    title: "מתחילים 😺",
    body:
      "מתי החתול מסביר שחילוק זה 'לחלק שווה בשווה'.\n" +
      "לוקחים מספר גדול (עוגיות 🍪).\n" +
      "מחלקים לקבוצות שוות.\n" +
      "סופרים כמה יש בכל קבוצה.\n" +
      "דוגמה: 6 ÷ 2 → 3 לכל ילד.\n" +
      "טיפ של מתי: אפשר לצייר עיגולים ולעשות קבוצות 🟣🟣🟣",
  },
  advanced: {
    title: "מתקדמים 🐾",
    body:
      "מתי החתול כבר יודע שחילוק קשור ללוח הכפל.\n" +
      "שואלים: 'איזה מספר כפול המחלק נותן את המחולק?'\n" +
      "דוגמה: 24 ÷ 6 → מי כפול 6 נותן 24? → 4.\n" +
      "אם קשה — נסה כפולות עד שמגיעים למחולק.\n" +
      "טיפ של מתי: לחשוב על כפל עושה חילוק מהיר 🐾",
  },
  champs: {
    title: "אלופים 🐯",
    body:
      "רמה של אלופים אמיתיים.\n" +
      "מתי החתול משתמש בטריקים חכמים ופירוקים.\n" +
      "דוגמה: 96 ÷ 8 → 80 ÷ 8 = 10 וגם 16 ÷ 8 = 2 → ביחד 12.\n" +
      "בודקים עם כפל: 12 × 8 = 96 ✅\n" +
      "טיפ של מתי: בדיקה בכפל שומרת על 0 טעויות 🧠",
  },
};

const LEVELS = {
  beginners: { label: "מתחילים", minDivisor: 2, maxDivisor: 5, maxAnswer: 10 },
  advanced: { label: "מתקדמים", minDivisor: 2, maxDivisor: 10, maxAnswer: 12 },
  champs: { label: "אלופים", minDivisor: 2, maxDivisor: 12, maxAnswer: 15 },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a division question with an integer result (no remainder):
 * Pick divisor (b) and answer (ans), then set a = b * ans.
 */
function makeQuestion(levelKey) {
  const cfg = LEVELS[levelKey] ?? LEVELS.beginners;

  const b = randInt(cfg.minDivisor, cfg.maxDivisor); // divisor
  const ans = randInt(1, cfg.maxAnswer); // keep answer >= 1
  const a = b * ans; // dividend

  return { a, b, ans };
}

/**
 * Map division_f from DB to level key:
 * 1 => beginners, 2 => advanced, 3+ => champs
 */
function levelFromDivisionF(division_f) {
  const n = Number(division_f ?? 1);
  if (!Number.isFinite(n) || n <= 1) return "beginners";
  if (n === 2) return "advanced";
  return "champs";
}

/**
 * Fetch division_f for the current user.
 * Expected API response:
 * { ok: true, division_f: number }
 */
async function fetchDivisionF(username) {
  try {
    const res = await fetch(
      `${API_BASE}/user/division-f?username=${encodeURIComponent(username)}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return null;

    const n = Number(data.division_f);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export default function PracticeDivision() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const { triggerCatFx, CatCongrats } = useCatCongrats(900);
  const { triggerBadCatFx, CatUncongrats } = useCatUncongrats(900);

  const [level, setLevel] = useState("beginners");
  const [q, setQ] = useState(() => makeQuestion("beginners"));
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [story, setStory] = useState("");
  const [noPointsThisQuestion, setNoPointsThisQuestion] = useState(false);

  /**
   * Persist practice state in sessionStorage so navigating to /cat-story
   * does not reset the current exercise.
   */
  function savePracticeState(next = {}) {
    sessionStorage.setItem(
      DIV_STATE_KEY,
      JSON.stringify({ level, q, input, msg, noPointsThisQuestion, ...next })
    );
  }

  /** Clear persisted practice state */
  function clearPracticeState() {
    sessionStorage.removeItem(DIV_STATE_KEY);
  }

  /**
   * On mount:
   * 1) restore the practice state if it exists
   * 2) restore the cat story if it exists
   */
  useEffect(() => {
    const saved = sessionStorage.getItem(DIV_STATE_KEY);
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

  /**
   * Auto-select difficulty level from division_f (DB).
   * Important: if we have saved practice state, do NOT override it.
   */
  useEffect(() => {
    (async () => {
      if (sessionStorage.getItem(DIV_STATE_KEY)) return;

      const username = localStorage.getItem("username");
      if (!username) return;

      const f = await fetchDivisionF(username);
      const newLevel = levelFromDivisionF(f);

      setLevel(newLevel);
      setQ(makeQuestion(newLevel));
      setInput("");
      setMsg("");
      setNoPointsThisQuestion(false);
    })();
  }, []);

  /**
   * Move to next question:
   * - cancel pending timers
   * - clear stored state and story
   * - generate a new question
   */
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

  /**
   * Navigate to the story screen for the current question.
   * We mark this question as "no points" to prevent scoring after story.
   */
  function goStory() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setNoPointsThisQuestion(true);
    savePracticeState({ noPointsThisQuestion: true });

    // Send op "/" so CatStory can narrate division.
    navigate("/cat-story", { state: { a: q.a, b: q.b, op: "/" } });
  }

  /**
   * Optional scoring:
   * Only increase score if user did NOT ask for a story.
   * Keep this stub if you want points later; safe to leave unused.
   */
  async function incDivisionScoreIfAllowed() {
    if (noPointsThisQuestion) return;

    const username = localStorage.getItem("username");
    if (!username) return;

    try {
      await fetch(`${API_BASE}/score/division`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch {
      // no UI interruption if server is down
    }
  }

  /**
   * Validate input and check answer.
   * On correct answer: show success, trigger effects, optionally score, then auto-advance.
   * On wrong answer: show error, trigger bad effects.
   */
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
      incDivisionScoreIfAllowed();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => goNextQuestion(level), 1000);
      return;
    }

    triggerBadCatFx();
    const m = "❌ לא נכון";
    setMsg(m);
    savePracticeState({ msg: m });
  }

  /** Cleanup timer on unmount */
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

      <h2>תרגול חילוק</h2>

      <div className="mt-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="text-xs font-bold text-slate-600">הרמה שלך:</div>
        <div className="text-sm font-extrabold text-slate-900">
          {level === "beginners"
            ? "מתחילים 😺"
            : level === "advanced"
              ? "מתקדמים 🐾"
              : "אלופים 🐯"}
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, margin: "16px 0" }}>
        ?= {q.a} ÷ {q.b}
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
