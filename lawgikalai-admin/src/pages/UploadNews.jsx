import { useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export default function UploadNews() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/news/upload`,
        { title, content, image },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg("News uploaded successfully!");
      setTitle("");
      setContent("");
      setImage("");
    } catch {
      setMsg("Failed to upload news.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #23243a 70%, #232323 100%)",
      }}
    >
      <form
        onSubmit={handleUpload}
        style={{
          width: "100%",
          maxWidth: 500,
          padding: "40px 36px",
          borderRadius: 18,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          background: "#22273b",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: 32, fontWeight: 700 }}>
          Upload News
        </h2>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 6,
            border: "none",
            fontSize: 16,
            background: "#242943",
            color: "#fff",
          }}
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 6,
            border: "none",
            fontSize: 16,
            background: "#242943",
            color: "#fff",
            resize: "vertical",
          }}
        />
        <input
          placeholder="Image URL (optional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          style={{
            marginBottom: 24,
            padding: 12,
            borderRadius: 6,
            border: "none",
            fontSize: 16,
            background: "#242943",
            color: "#fff",
          }}
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
        {msg && (
          <p style={{ color: "#e3e3e3", marginTop: 5, minHeight: 20 }}>{msg}</p>
        )}
      </form>
    </div>
  );
}
