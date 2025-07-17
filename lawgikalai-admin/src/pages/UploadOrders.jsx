import { useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export default function OrdersUpload() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("order", file);

    try {
      await axios.post(`${API_URL}/api/orders/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setMsg("Order uploaded successfully!");
      setTitle("");
      setFile(null);
    } catch {
      setMsg("Failed to upload order.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(120deg, #23243a 70%, #232323 100%)" }}>
      <form onSubmit={handleUpload} style={{ width: 400, background: "#22273b", padding: 32, borderRadius: 16, boxShadow: "0 6px 24px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }}>
        <h2 style={{ color: "#fff", marginBottom: 24 }}>Upload Order</h2>
        <input
          placeholder="Order Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ marginBottom: 16, padding: 10, borderRadius: 6, border: "none", fontSize: 16, background: "#242943", color: "#fff" }}
        />
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          required
          style={{ marginBottom: 24, color: "#fff" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "linear-gradient(90deg,#47b7ff,#8d6bff 90%)",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0 3px 8px rgba(48,60,130,0.08)",
            marginBottom: 10,
            transition: "0.15s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
        {msg && <p style={{ color: "#e3e3e3", marginTop: 5 }}>{msg}</p>}
      </form>
    </div>
  );
}
