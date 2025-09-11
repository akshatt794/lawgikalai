import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await axios.post(
        `http://13.126.80.135:3000/api/auth/login`,
        { identifier, password }
      );
      localStorage.setItem("token", res.data.token);
      setMsg("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      setMsg("Invalid credentials.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg, #2b2d42 0%, #575ecf 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          background: "#232323",
          padding: "40px 32px 28px",
          borderRadius: 16,
          boxShadow: "0 8px 32px 0 rgba(31,38,135,0.2)",
          width: 350,
          display: "flex",
          flexDirection: "column",
        }}>
        <h2 style={{
          color: "#fff",
          marginBottom: 28,
          textAlign: "center",
          letterSpacing: 1
        }}>
          Admin Login
        </h2>
        <input
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={{
            padding: "12px",
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #444",
            background: "#191923",
            color: "#fff",
            fontSize: "1rem"
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "12px",
            marginBottom: 20,
            borderRadius: 8,
            border: "1px solid #444",
            background: "#191923",
            color: "#fff",
            fontSize: "1rem"
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px",
            background: "linear-gradient(90deg, #575ecf 20%, #6e8efb 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "1rem",
            fontWeight: 600,
            boxShadow: "0 2px 8px 0 rgba(87,94,207,0.13)",
            cursor: "pointer",
            transition: "0.2s"
          }}
        >
          Login
        </button>
        {msg && (
          <p style={{ color: msg === "Login successful!" ? "#00D98C" : "#ff4e4e", marginTop: 20, textAlign: "center" }}>
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}
