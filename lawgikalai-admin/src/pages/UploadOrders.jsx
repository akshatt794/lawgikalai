import { useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export default function UploadOrder() {
  const [title, setTitle] = useState("");
  const [orderPdf, setOrderPdf] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("order", orderPdf);

      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/orders/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      setMsg("Order uploaded successfully!");
      setTitle("");
      setOrderPdf(null);
    } catch {
      setMsg("Failed to upload order.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleUpload} style={{ maxWidth: 400, background: "#21213b", padding: 32, borderRadius: 12 }}>
        <h2 style={{ color: "#fff", marginBottom: 18 }}>Upload Court Order</h2>
        <input
          type="text"
          placeholder="Order Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={{ marginBottom: 18, padding: 10, borderRadius: 6, width: "100%" }}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setOrderPdf(e.target.files[0])}
          required
          style={{ marginBottom: 24, padding: 8, borderRadius: 6, width: "100%" }}
        />
        <button type="submit" disabled={loading}
          style={{ background: "#47b7ff", color: "#fff", border: "none", padding: "12px 0", borderRadius: 8, width: "100%" }}>
          {loading ? "Uploading..." : "Upload"}
        </button>
        {msg && <p style={{ color: "#e3e3e3", marginTop: 14 }}>{msg}</p>}
      </form>
    </div>
  );
}
