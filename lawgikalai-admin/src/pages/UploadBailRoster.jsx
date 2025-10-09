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
    const [formData, setFormData] = useState({
        judicial_officer: "",
        first_link_officer: "",
        second_link_officer: "",
        police_station: "",
        zone: "",
        file: null,
    });

    const [preview, setPreview] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle file input
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData((prev) => ({ ...prev, file }));
        if (file && file.type.startsWith("image/")) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview("");
        }
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const uploadData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) uploadData.append(key, value);
            });

            await axios.post(`${API_URL}/api/bailroster/upload`, uploadData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            setMsg("✅ Bail Roster uploaded successfully!");
            setFormData({
                judicial_officer: "",
                first_link_officer: "",
                second_link_officer: "",
                police_station: "",
                zone: "",
                file: null,
            });
            setPreview("");
        } catch (err) {
            console.error(err);
            setMsg(
                `❌ Upload failed: ${
                    err.response?.data?.error || err.message || "Unknown error"
                }`
            );
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
                    style={{ color: "#fff", marginBottom: 32, fontWeight: 700 }}
                >
                    Upload Bail Roster
                </h2>

                {/* Judicial Officer */}
                <input
                    placeholder="Name of the Ld. Judicial Officer *"
                    name="judicial_officer"
                    value={formData.judicial_officer}
                    onChange={handleChange}
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

                {/* 1st Link Officer */}
                <input
                    placeholder="Name of the 1st Link Ld. Judicial Officer"
                    name="first_link_officer"
                    value={formData.first_link_officer}
                    onChange={handleChange}
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

                {/* 2nd Link Officer */}
                <input
                    placeholder="Name of the 2nd Link Ld. Judicial Officer"
                    name="second_link_officer"
                    value={formData.second_link_officer}
                    onChange={handleChange}
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

                {/* Police Station */}
                <input
                    placeholder="Police Station"
                    name="police_station"
                    value={formData.police_station}
                    onChange={handleChange}
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

                {/* Zone Selector */}
                <select
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
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
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{
                        marginBottom: 16,
                        color: "#fff",
                    }}
                />

                {/* Preview */}
                {preview && (
                    <img
                        src={preview}
                        alt="Preview"
                        style={{
                            width: "100%",
                            maxHeight: 180,
                            objectFit: "cover",
                            borderRadius: 12,
                            marginBottom: 18,
                            border: "1px solid #23243a",
                        }}
                    />
                )}

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
                        marginBottom: 10,
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
                            marginTop: 5,
                            minHeight: 20,
                        }}
                    >
                        {msg}
                    </p>
                )}
            </form>
        </div>
    );
}
