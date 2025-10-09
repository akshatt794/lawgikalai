import { useState } from "react";
import axios from "axios";
import { FileText, Upload, Send } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AddBareAct() {
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        if (!title || !file) {
            setMsg("⚠️ Please enter a title and select a file.");
            setMsgType("error");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("title", title);
            formData.append("file", file);

            const { data } = await axios.post(
                `${API_URL}/api/bareact/upload`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            setMsg("✅ Bare Act uploaded successfully!");
            setMsgType("success");
            setTitle("");
            setFile(null);
            e.target.reset();
        } catch (err) {
            console.error("❌ Upload failed:", err);
            setMsg(
                err.response?.data?.error ||
                    err.message ||
                    "Failed to upload. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-xl">
                            <FileText className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Upload Bare Act
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Add a new legal act with title and PDF file
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 space-y-6"
                >
                    {/* Title Input */}
                    <div>
                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                            Title of the Act *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter the title (e.g. Indian Penal Code 1860)"
                            required
                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                            Upload PDF File *
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                required
                                className="w-full text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            <Send className="h-5 w-5" />
                            <span>
                                {loading ? "Uploading..." : "Upload Bare Act"}
                            </span>
                        </button>
                    </div>

                    {/* Message */}
                    {msg && (
                        <div
                            className={`mt-6 p-4 rounded-lg border ${
                                msgType === "success"
                                    ? "bg-green-500/10 border-green-500/50 text-green-400"
                                    : "bg-red-500/10 border-red-500/50 text-red-400"
                            }`}
                        >
                            <p className="text-center font-medium">{msg}</p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
