import { useState } from "react";
import axios from "axios";

export default function ExplorePage() {
  const [title, setTitle] = useState("");
  const [pdf, setPdf] = useState(null);
  const [msg, setMsg] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg("");
    const formData = new FormData();
    formData.append("title", title);
    formData.append("pdf", pdf);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/explore/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMsg("PDF uploaded successfully!");
      setTitle("");
      setPdf(null);
    } catch (err) {
      setMsg("Upload failed.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(120deg,#272859,#232323 100%)"
    }}>
      <form onSubmit={handleUpload} style={{
        background: "#1b1b2e", padding: 40, borderRadius: 16, width: 400, boxShadow: "0 6px 32px #1e293b99",
        display: "flex", flexDirection: "column", gap: 18
      }}>
        <h2 style={{ color: "#fff" }}>Upload PDF</h2>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: 12, borderRadius: 7, border: "none", background: "#232335", color: "#fff" }}
        />
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setPdf(e.target.files[0])}
          required
          style={{ color: "#fff" }}
        />
        <button type="submit" style={{
          background: "linear-gradient(90deg,#47b7ff,#8d6bff 90%)",
          color: "#fff", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 17, fontWeight: 600, cursor: "pointer"
        }}>Upload</button>
        {msg && <p style={{ color: "#8fffa7" }}>{msg}</p>}
      </form>
    </div>
  );
}
