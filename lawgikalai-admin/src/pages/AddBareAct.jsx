import { useState } from "react";
import axios from "axios";
import {
    FileText,
    Upload,
    Send,
    X,
    CheckCircle,
    AlertCircle,
    BookOpen,
    Scale,
} from "lucide-react";

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

    const removeFile = () => {
        setFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        if (!title || !file) {
            setMsg("Please enter a title and select a file.");
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

            setMsg(data.message || "Bare Act uploaded successfully!");
            setMsgType("success");
            setTitle("");
            setFile(null);
        } catch (err) {
            console.error("Upload failed:", err);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-xl">
                            <BookOpen className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Upload Bare Act
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Add legal acts to the database for reference
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Document Type
                                </p>
                                <p className="text-xl font-bold text-white">
                                    Bare Act
                                </p>
                            </div>
                            <div className="bg-indigo-500/10 p-3 rounded-lg">
                                <Scale className="h-8 w-8 text-indigo-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    File Status
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {file ? "Ready" : "Pending"}
                                </p>
                            </div>
                            <div className="bg-purple-500/10 p-3 rounded-lg">
                                <FileText className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 space-y-6"
                >
                    {/* Title Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Title of the Act *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Indian Penal Code, 1860"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                        />
                        <p className="text-gray-500 text-xs mt-2">
                            Enter the complete official title of the legal act
                        </p>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            PDF Document *
                        </label>

                        {!file ? (
                            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-slate-900/50 transition-all duration-300 group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-indigo-500/10 p-5 rounded-full mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                        <Upload className="h-12 w-12 text-indigo-400" />
                                    </div>
                                    <p className="mb-2 text-base text-gray-400">
                                        <span className="font-semibold text-indigo-400">
                                            Click to upload
                                        </span>{" "}
                                        or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-500 mb-1">
                                        PDF files only
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Maximum file size: 50MB
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    required
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="relative group">
                                <div className="flex items-center justify-between bg-slate-900 border border-gray-700 rounded-xl p-6 hover:border-indigo-500/50 transition-all duration-200">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-indigo-500/10 p-3 rounded-lg">
                                            <FileText className="h-8 w-8 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">
                                                {file.name}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                {(
                                                    file.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-all duration-200"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-5 w-5" />
                                <span>Upload Bare Act</span>
                            </>
                        )}
                    </button>

                    {/* Status Message */}
                    {msg && (
                        <div
                            className={`flex items-start space-x-3 p-4 rounded-lg border ${
                                msgType === "success"
                                    ? "bg-green-500/10 border-green-500/50"
                                    : "bg-red-500/10 border-red-500/50"
                            }`}
                        >
                            {msgType === "success" ? (
                                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            )}
                            <p
                                className={`text-sm font-medium ${
                                    msgType === "success"
                                        ? "text-green-400"
                                        : "text-red-400"
                                }`}
                            >
                                {msg}
                            </p>
                        </div>
                    )}
                </form>

                {/* Info Section */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                    {/* What are Bare Acts */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">📚</span>
                            What are Bare Acts?
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Bare Acts are legal statutes or laws in their
                            original form without any commentary or
                            interpretation. They contain the exact text as
                            enacted by the legislature.
                        </p>
                    </div>

                    {/* Guidelines */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">✓</span>
                            Upload Guidelines
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-start">
                                <span className="text-indigo-400 mr-2">•</span>
                                <span>Use official act titles</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-indigo-400 mr-2">•</span>
                                <span>PDF must be searchable text</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-indigo-400 mr-2">•</span>
                                <span>Include year if applicable</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Example Banner */}
                <div className="mt-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl border border-indigo-500/20 p-6">
                    <div className="flex items-start space-x-3">
                        <div className="bg-indigo-500/20 p-2 rounded-lg flex-shrink-0">
                            <BookOpen className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-2">
                                Example Titles
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                • Indian Penal Code, 1860
                                <br />
                                • Code of Criminal Procedure, 1973
                                <br />
                                • Indian Evidence Act, 1872
                                <br />• Constitution of India
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
