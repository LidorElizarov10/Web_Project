import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import catWelcomeGif from "./assets/CatWelcome.gif";

import API_URL from "./config";

export default function CheckTest1() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showGif, setShowGif] = useState(false);
  const timerRef = useRef(null);


  useEffect(() => {
    if (showGif) return;
    if (localStorage.getItem("isLoggedIn") === "1") {
      navigate("/addition", { replace: true });
    }
  }, [navigate, showGif]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function check(e) {
    if (e?.preventDefault) e.preventDefault();
    if (loading) return;

    if (username.trim() === "" || password.trim() === "") {
      setMsg("הכנס שם משתמש וסיסמה");
      return;
    }

    setLoading(true);
    setMsg("בודק...");

    try {
      const res = await fetch(`${API_URL}/check-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }

      if (data.ok) {
        setMsg("התחברות הצליחה ✅");

        // gif first
        setShowGif(true);

        // ✅ show gif 0.8s then navigate
        timerRef.current = setTimeout(() => {
          localStorage.setItem("isLoggedIn", "1");
          localStorage.setItem("username", username);
          window.dispatchEvent(new Event("auth-changed"));
          navigate("/addition", { replace: true });
        }, 800);

        return;
      }

      setMsg(data.reason === "NO_USER" ? "שם משתמש לא קיים ❌" : "סיסמה לא נכונה ❌");
    } catch {
      setMsg("השרת לא זמין");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>בדיקת התחברות</h2>

      <form onSubmit={check}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="שם משתמש"
          style={{ padding: "10px", width: "100%", marginBottom: 10 }}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          type="password"
          style={{ padding: "10px", width: "100%", marginBottom: 10 }}
        />

        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading ? "בודק..." : "בדוק"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>

      {/* ✅ Overlay עם GIF */}
      {showGif && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 22,
              padding: 18,
              textAlign: "center",
              width: 340,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <img
              src={catWelcomeGif}
              alt="Cat Welcome"
              width={260}
              height={240}
              style={{ borderRadius: 18, display: "block", margin: "0 auto" }}
            />
            <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>
              התחברת בהצלחה! 🐱✨
            </div>
            <div style={{ color: "#555", marginTop: 4 }}>עוד רגע מתחילים…</div>
          </div>
        </div>
      )}
    </div>
  );
}
