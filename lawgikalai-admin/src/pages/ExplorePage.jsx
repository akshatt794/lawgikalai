import { useState } from "react";
import axios from "axios";

export default function ExplorePage() {
    const [title, setTitle] = useState("");
    const [pdf, setPdf] = useState(null);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        setMsg("");
        setLoading(true);

        const formData = new FormData();
        formData.append("title", title);
        formData.append("pdf", pdf);

        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/explore/upload`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setMsg("✅ PDF uploaded successfully!");
            setTitle("");
            setPdf(null);
        } catch (err) {
            console.error(err);
            setMsg("❌ Upload failed.");
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
                background:
                    "linear-gradient(120deg, #23243a 70%, #232323 100%)",
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
                <h2
                    style={{
                        color: "#fff",
                        marginBottom: 32,
                        fontWeight: 700,
                        fontSize: 22,
                    }}
                >
                    Upload PDF to Explore
                </h2>

                {/* Title input */}
                <input
                    placeholder="Enter PDF Title"
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

                {/* File input */}
                <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdf(e.target.files[0])}
                    required
                    style={{
                        marginBottom: 24,
                        color: "#fff",
                    }}
                />

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        background:
                            "linear-gradient(90deg,#47b7ff,#8d6bff 90%)",
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
                    {loading ? "Uploading..." : "Upload PDF"}
                </button>

                {/* Message */}
                {msg && (
                    <p
                        style={{
                            color: msg.startsWith("✅") ? "#8fffa7" : "#ff7b7b",
                            marginTop: 5,
                            minHeight: 20,
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
