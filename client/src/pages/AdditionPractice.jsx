// src/pages/PracticeAddition.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCatCongrats from "./useCatCongrats";
import useCatUncongrats from "./useCatUncongrats";

const ADD_STATE_KEY = "addition_practice_state_v1";
import API_URL from "../config";

const API_BASE = API_URL;

const LEVELS = {
  easy: { label: "מתחילים (0–10)", min: 0, max: 10 },
  medium: { label: "מתקדמים (0–50)", min: 0, max: 50 },
  hard: { label: "אלופים (0–200)", min: 0, max: 200 },
};

const LEVEL_TEXT = {
  easy: {
    title: "רמה קלה 😺",
    body:
      "פה אנחנו עושים חיבור כמו שהחתול אוהב: רגוע וברור.\n" +
      "מתחילים מהמספר הראשון.\n" +
      "את המספר השני הופכים לצעדים קדימה וסופרים לאט.\n" +
      "דוגמה: 3 + 2 → 4, 5.\n" +
      "טיפ של חתול: אם יש 0 — לא מוסיפים כלום 😸",
  },
  medium: {
    title: "רמה בינונית 🐾",
    body:
      "כאן החתול כבר משתמש בטריק קטן וחכם.\n" +
      "במקום לספור הרבה צעדים, מגיעים למספר עגול.\n" +
      "קודם משלימים לעשר או לעשרות.\n" +
      "ואז מוסיפים את מה שנשאר.\n" +
      "דוגמה: 28 + 7 → 30 ואז 35.\n" +
      "טיפ של חתול: מספרים עגולים הם הכי נוחים 🐾",
  },
  hard: {
    title: "רמה קשה 🐯",
    body:
      "זו רמה לחתולים רציניים במיוחד.\n" +
      "כדי לא להתבלבל, מפרקים את המספרים לחלקים.\n" +
      "קודם מחברים עשרות או מאות.\n" +
      "אחר כך מחברים יחידות.\n" +
      "בסוף מחברים את הכל יחד.\n" +
      "דוגמה: 146 + 37 → 176 ואז 183.\n" +
      "טיפ של חתול: לפרק לחלקים זה כמו לגו 🧱",
  },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create an addition question for the given level.
 */

function makeQuestion(levelKey) {
  const { min, max } = LEVELS[levelKey] ?? LEVELS.easy;
  const a = randInt(min, max);
  const b = randInt(min, max);
  return { a, b, ans: a + b };
}

/**
 * Map addition_f from DB to level key:
 * 1 => easy, 2 => medium, 3+ => hard
 */

function levelFromAdditionF(addition_f) {
  const n = Number(addition_f ?? 1);
  if (!Number.isFinite(n) || n <= 1) return "easy";
  if (n === 2) return "medium";
  return "hard";
}

/**
 * Fetch addition_f for the current user.
 * Expected API response:
 * { ok: true, addition_f: number }
 */
async function fetchAdditionF(username) {
  try {
    const res = await fetch(
      `${API_BASE}/user/addition-f?username=${encodeURIComponent(username)}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return null;
    const n = Number(data.addition_f);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export default function PracticeAddition() {
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

  /**
   * Persist practice state in sessionStorage so navigating to /cat-story
   * does not reset the current exercise.
   */
  function savePracticeState(next = {}) {
    sessionStorage.setItem(
      ADD_STATE_KEY,
      JSON.stringify({ level, q, input, msg, noPointsThisQuestion, ...next })
    );
  }

  /** Clear persisted practice state */
  function clearPracticeState() {
    sessionStorage.removeItem(ADD_STATE_KEY);
  }

  /**
   * On mount:
   * 1) restore the practice state if it exists
   * 2) restore the cat story if it exists
   */
  useEffect(() => {
    const saved = sessionStorage.getItem(ADD_STATE_KEY);
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
   * Auto-select difficulty level from addition_f (DB).
   * Important: if we have saved practice state, do NOT override it.
   */
  useEffect(() => {
    (async () => {
      if (sessionStorage.getItem(ADD_STATE_KEY)) return;

      const username = localStorage.getItem("username");
      if (!username) return;

      const f = await fetchAdditionF(username);
      const newLevel = levelFromAdditionF(f);

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

    navigate("/cat-story", { state: { a: q.a, b: q.b, op: "+" } });
  }

  /**
   * Optional scoring:
   * Only increase score if user did NOT ask for a story.
   */
  async function incAdditionScoreIfAllowed() {
    if (noPointsThisQuestion) return;

    const username = localStorage.getItem("username");
    if (!username) return;

    try {
      await fetch(`${API_BASE}/score/addition`, {
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
      incAdditionScoreIfAllowed();

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

      <h2>תרגול חיבור</h2>

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

      {/* Correct display: a + b = ? */}
      <div style={{ fontSize: 28, fontWeight: 800, margin: "16px 0" }}>
        =-.,mnbvcxz{q.b} + {q.a}
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
