import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const zones = [
    "NORTH",
    "NORTH WEST",
    "SHAHDARA",
    "EAST",
    "NORTH EAST",
    "WEST",
    "CENTRAL",
    "SOUTH WEST",
    "SOUTH",
    "SOUTH EAST",
    "NEW DELHI",
    "CBI",
];

export default function UploadBailRoster() {
    const [zone, setZone] = useState("");
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setLoading(true);

        if (!zone || !file) {
            setMsg("⚠️ Please select a zone and upload a file.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("zone", zone);
            formData.append("file", file);

            await axios.post(`${API_URL}/api/bailroster/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            setMsg("✅ Bail roster uploaded successfully!");
            setZone("");
            setFile(null);
            e.target.reset(); // reset file input
        } catch (err) {
            console.error(err);
            setMsg(
                `❌ Upload failed: ${
                    err.response?.data?.error || err.message || "Unknown error"
                }`
            );
        } finally {
            setLoading(false);
        }
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
                onSubmit={handleSubmit}
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
                        textAlign: "center",
                    }}
                >
                    Upload Bail Roster
                </h2>

                {/* Zone Selector */}
                <select
                    name="zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    required
                    style={{
                        marginBottom: 20,
                        padding: 12,
                        borderRadius: 6,
                        border: "none",
                        fontSize: 16,
                        background: "#242943",
                        color: "#fff",
                    }}
                >
                    <option value="">Select Zone *</option>
                    {zones.map((z) => (
                        <option key={z} value={z}>
                            {z}
                        </option>
                    ))}
                </select>

                {/* File Upload */}
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                    style={{
                        marginBottom: 20,
                        color: "#fff",
                    }}
                />

                {/* Submit Button */}
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
                        transition: "0.15s",
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? "Uploading..." : "Upload Bail Roster"}
                </button>

                {/* Message */}
                {msg && (
                    <p
                        style={{
                            color: "#e3e3e3",
                            marginTop: 10,
                            minHeight: 20,
                            textAlign: "center",
                        }}
                    >
                        {msg}
                    </p>
                )}
            </form>
        </div>
    );
}
