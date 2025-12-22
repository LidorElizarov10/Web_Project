import { Routes, Route, Link } from "react-router-dom";
import CheckTest1 from "./CheckTest1.jsx";
import Register from "./pages/Register.jsx";
import About from "./pages/About.jsx";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <nav style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Link to="/">התחברות</Link>
        <Link to="/register">הרשמה</Link>
        <Link to="/about">אודות</Link>
      </nav>

      <Routes>
        <Route path="/" element={<CheckTest1 />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}