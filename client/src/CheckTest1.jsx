import { useState } from "react";

export default function CheckLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function check() {
    if (username.trim() === "" || password.trim() === "") {
      setMsg("הכנס שם משתמש וסיסמה");
      return;
    }

    setMsg("בודק...");

    try {
      const res = await fetch("http://localhost:3000/check-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "שגיאה");
      } else if (data.ok) {
      setMsg("התחברות הצליחה ✅");
      setTimeout(() => {
       window.location.href = "/home.html";
       }, 800);

      } else if (data.reason === "NO_USER") {
        setMsg("שם משתמש לא קיים ❌");
      } else {
        setMsg("סיסמה לא נכונה ❌");
      }
    } catch {
      setMsg("השרת לא זמין");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>בדיקת התחברות</h2>

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

      <button onClick={check} style={{ padding: "10px 16px" }}>
        בדוק
      </button>

      <p style={{ marginTop: 12 }}>{msg}</p>
    </div>
  );
}
