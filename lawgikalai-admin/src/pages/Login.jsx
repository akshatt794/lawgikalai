import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
        "https://lawgikalai-auth-api.onrender.com/api/auth/login",
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
    <form onSubmit={handleLogin} style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Admin Login</h2>
      <input
        placeholder="Email or Username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button type="submit" style={{ width: "100%" }}>Login</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}
