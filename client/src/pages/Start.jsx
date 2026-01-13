import React, { useEffect, useMemo, useState } from "react";

import API_URL from "../config";

const API = API_URL;

const SILVER = 30;
const GOLD = 60;

function getMedal(value) {
  const v = Number(value || 0);
  if (v >= GOLD) {
    return {
      emoji: "🥇",
      title: "זהב",
      hint: "וואו! מתי החתול אומר: אתה אלוף! 😺✨",
      pill: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }
  if (v >= SILVER) {
    return {
      emoji: "🥈",
      title: "כסף",
      hint: "כל הכבוד! עוד קצת וזה זהב 🐾",
      pill: "bg-slate-100 text-slate-900 border-slate-200",
    };
  }
  return {
    emoji: "🎯",
    title: "בדרך",
    hint: `נשארו עוד ${Math.max(0, SILVER - v)} נק׳ לכסף 😸`,
    pill: "bg-rose-100 text-rose-900 border-rose-200",
  };
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  async function loadStats() {
    setErr("");
    setLoading(true);

    const username = localStorage.getItem("username");

    try {
      const res = await fetch(`${API}/user/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErr(data.error || "שגיאה בטעינת נתונים");
        setLoading(false);
        return;
      }

      setStats(data.user);
      setLoading(false);
    } catch {
      setErr("השרת לא זמין או בעיית רשת");
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      setLoading(true);

      const username = localStorage.getItem("username");

      try {
        const res = await fetch(`${API}/user/stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setErr(data.error || "שגיאה בטעינת נתונים");
          setLoading(false);
          return;
        }

        setStats(data.user);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setErr("השרת לא זמין או בעיית רשת");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ רשימת תחומים מסודרת
  const rows = useMemo(() => {
    const s = stats || {};
    return [
      { key: "addition", label: "חיבור", emoji: "➕", value: s.addition ?? 0 },
      { key: "subtraction", label: "חיסור", emoji: "➖", value: s.subtraction ?? 0 },
      { key: "multiplication", label: "כפל", emoji: "✖️", value: s.multiplication ?? 0 },
      { key: "division", label: "חילוק", emoji: "➗", value: s.division ?? 0 },
      { key: "percent", label: "אחוזים", emoji: "％", value: s.percent ?? 0 },
    ];
  }, [stats]);

  const silverCount = useMemo(
    () => rows.filter((r) => Number(r.value || 0) >= SILVER).length,
    [rows]
  );
  const goldCount = useMemo(
    () => rows.filter((r) => Number(r.value || 0) >= GOLD).length,
    [rows]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              הפרסים של מתי החתול 🐾🏅
            </div>
            <p className="mt-1 text-slate-600">
              בכל תחום בנפרד: 30 נק׳ = כסף 🥈, 60 נק׳ = זהב 🥇
            </p>
          </div>

          <button
            onClick={loadStats}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-white hover:opacity-90"
          >
            רענון
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-slate-600">טוען נתונים...</div>
        ) : stats ? (
          <div className="mt-6 grid gap-4">
            {/* סיכום קצר של מתי */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-lg font-extrabold text-slate-900">מתי מסביר 😺</div>
              <p className="mt-2 text-slate-700 leading-relaxed">
                מתי החתול אוסף מדליות בכל תחום בנפרד.
                השגת עד עכשיו <b>{silverCount}</b> תחומים עם כסף 🥈 ו־<b>{goldCount}</b> תחומים עם זהב 🥇.
                תמשיך לפתור תרגילים — וכל שורה יכולה להפוך לזהב! 🐾 האתגר מתאפס כל שבוע והרמה עולה!
              </p>
            </div>

            {/* טבלת תחומים */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-lg font-extrabold text-slate-900">
                הניקוד והמדליות שלי לפי תחום 🏆
              </div>

              <div className="grid gap-3">
                {rows.map((r) => (
                  <ScoreRow
                    key={r.key}
                    label={r.label}
                    emoji={r.emoji}
                    value={r.value}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-slate-600">אין נתונים להצגה</div>
        )}
      </div>
    </div>
  );
}

function ScoreRow({ label, value, emoji }) {
  const medal = getMedal(value);
  const v = Number(value || 0);

  // פס התקדמות עד היעד הבא (כסף או זהב)
  const nextTarget = v >= GOLD ? GOLD : v >= SILVER ? GOLD : SILVER;
  const max = v >= SILVER ? GOLD : SILVER;
  const progress = Math.min(100, Math.round((v / max) * 100));
  const remaining = Math.max(0, nextTarget - v);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <div className="font-bold text-slate-800">{label}</div>
            <div className="mt-1 text-xs text-slate-600">{medal.hint}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-extrabold text-slate-900">{v}</div>
          <div className={`mt-1 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-bold ${medal.pill}`}>
            <span>{medal.emoji}</span>
            <span>{medal.title}</span>
          </div>
        </div>
      </div>

      {/* progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div>
            {v >= GOLD
              ? "הגעת לזהב! 🥇"
              : v >= SILVER
                ? `יעד הבא: זהב (${GOLD})`
                : `יעד ראשון: כסף (${SILVER})`}
          </div>
          {v >= GOLD ? <div>מושלם 🎉</div> : <div>נשארו {remaining} נק׳</div>}
        </div>

        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white">
          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
