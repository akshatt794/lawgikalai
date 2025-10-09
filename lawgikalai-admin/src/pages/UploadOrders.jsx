import React, { useState } from "react";
import axios from "axios";

const UploadOrders = () => {
    const [title, setTitle] = useState("");
    const [pdfFile, setPdfFile] = useState(null);
    const [responseMsg, setResponseMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!pdfFile) {
            setResponseMsg("❌ Please upload a PDF file");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("order", pdfFile);

        try {
            const res = await axios.post(
                "https://lawgikalai-auth-api.onrender.com/api/orders/upload",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            setResponseMsg(`✅ ${res.data.message}`);
            console.log("Uploaded Order:", res.data);
            setTitle("");
            setPdfFile(null);
        } catch (err) {
            console.error("❌ Upload failed:", err);
            setResponseMsg("❌ Upload failed. See console for details.");
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
                    style={{
                        color: "#fff",
                        marginBottom: 32,
                        fontWeight: 700,
                        fontSize: 22,
                    }}
                >
                    Upload Court Order PDF
                </h2>

                {/* Title Input */}
                <input
                    type="text"
                    placeholder="Order Title"
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

                {/* File Input */}
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    required
                    style={{
                        marginBottom: 24,
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
                        marginBottom: 10,
                        transition: "0.15s",
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? "Uploading..." : "Upload Order"}
                </button>

                {/* Response Message */}
                {responseMsg && (
                    <p
                        style={{
                            color: responseMsg.startsWith("✅")
                                ? "#8fffa7"
                                : "#ff7b7b",
                            marginTop: 5,
                            minHeight: 20,
                            textAlign: "center",
                            fontWeight: 500,
                        }}
                    >
                        {responseMsg}
                    </p>
                )}
            </form>
        </div>
    );
};

export default UploadOrders;
