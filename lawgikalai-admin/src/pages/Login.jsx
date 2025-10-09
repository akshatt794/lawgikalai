import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMsg("");
        setLoading(true);
        try {
            const res = await axios.post(
                `http://13.126.80.135:3000/api/auth/login`,
                { identifier, password }
            );
            localStorage.setItem("token", res.data.token);
            setMsg("✅ Login successful!");
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            setMsg("❌ Invalid credentials.");
        }
        setLoading(false);
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                background:
                    "linear-gradient(120deg, #23243a 70%, #232323 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
            }}
        >
            <form
                onSubmit={handleLogin}
                style={{
                    width: "100%",
                    maxWidth: 420,
                    padding: "40px 36px",
                    borderRadius: 18,
                    background: "#22273b",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <h2
                    style={{
                        color: "#fff",
                        textAlign: "center",
                        marginBottom: 32,
                        fontSize: 26,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                    }}
                >
                    Admin Login
                </h2>

                {/* Email or Username */}
                <input
                    placeholder="Email or Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={{
                        marginBottom: 18,
                        padding: 12,
                        borderRadius: 6,
                        border: "none",
                        fontSize: 16,
                        background: "#242943",
                        color: "#fff",
                        outline: "none",
                    }}
                />

                {/* Password */}
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                        marginBottom: 26,
                        padding: 12,
                        borderRadius: 6,
                        border: "none",
                        fontSize: 16,
                        background: "#242943",
                        color: "#fff",
                        outline: "none",
                    }}
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        background:
                            "linear-gradient(90deg, #47b7ff, #8d6bff 90%)",
                        color: "#fff",
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 8,
                        padding: "12px 0",
                        fontSize: 18,
                        cursor: "pointer",
                        boxShadow: "0 3px 8px rgba(48,60,130,0.08)",
                        marginBottom: 10,
                        transition: "0.2s",
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>

                {/* Message */}
                {msg && (
                    <p
                        style={{
                            color: msg.startsWith("✅") ? "#8fffa7" : "#ff7b7b",
                            marginTop: 16,
                            textAlign: "center",
                            fontWeight: 500,
                        }}
                    >
                        {msg}
                    </p>
                )}
            </form>
        </div>
    );
}
