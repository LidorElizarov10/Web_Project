import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// דרך הכי יציבה ב-Vite לקבצים:
const catWelcomeGif = new URL("../assets/CatWelcome.gif", import.meta.url).href;

import API_URL from "../config";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showGif, setShowGif] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // ✅ if singuped in already, go to addition
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

  async function register(e) {
    if (e?.preventDefault) e.preventDefault();
    if (loading) return;

    if (username.trim() === "" || password.trim() === "" || String(age).trim() === "") {
      setMsg("הכנס שם משתמש, סיסמה וגיל");
      return;
    }

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 6 || ageNum > 12) {
      setMsg("גיל חייב להיות בין 6 ל-12");
      return;
    }

    setLoading(true);
    setMsg("נרשם...");

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, age: ageNum }),
      });

      const data = await res.json().catch(() => ({}));

      console.log("REGISTER RESPONSE:", res.status, data);

      if (!res.ok || !data.success) {
        setMsg(data.error || "הרשמה נכשלה");
        return;
      }

      // ✅ show gif first
      console.log("SHOW GIF NOW");
      setMsg("נרשמת בהצלחה ✅");
      setShowGif(true);

      // ✅after 0.8s save login and navigate
      timerRef.current = setTimeout(() => {
        console.log("NOW SAVE LOGIN + NAVIGATE");
        localStorage.setItem("isLoggedIn", "1");
        localStorage.setItem("username", username);
        localStorage.setItem("age", String(ageNum));
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/addition", { replace: true });
      }, 800);
    } catch (err) {
      console.log("REGISTER ERROR:", err);
      setMsg("השרת לא זמין");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>הרשמה</h2>

      <form onSubmit={register}>
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

        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="גיל (6-12)"
          type="number"
          min="6"
          max="12"
          style={{ padding: "10px", width: "100%", marginBottom: 10 }}
        />

        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading ? "נרשם..." : "הירשם"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>

      {/* ✅ Overlay GIF */}
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
              width: 320,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <img
              src={catWelcomeGif}
              alt="Cat Welcome"
              width={240}
              height={240}
              style={{ borderRadius: 18, display: "block", margin: "0 auto" }}
              onError={() => console.log("GIF FAILED TO LOAD:", catWelcomeGif)}
              onLoad={() => console.log("GIF LOADED OK")}
            />
            <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>
              נרשמת בהצלחה! 🐱✨
            </div>
            <div style={{ color: "#555", marginTop: 4 }}>עוד רגע מתחילים…</div>
          </div>
        </div>
      )}
    </div>
  );
}


