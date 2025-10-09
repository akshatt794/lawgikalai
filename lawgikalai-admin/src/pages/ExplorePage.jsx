import { useState } from "react";
import axios from "axios";
import {
    FileText,
    Upload,
    X,
    CheckCircle,
    AlertCircle,
    TrendingUp,
} from "lucide-react";

export default function ExplorePage() {
    const [title, setTitle] = useState("");
    const [pdf, setPdf] = useState(null);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState(""); // success or error
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setPdf(file);
    };

    const removePdf = () => {
        setPdf(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
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
            setMsg("PDF uploaded successfully!");
            setMsgType("success");
            setTitle("");
            setPdf(null);
        } catch (err) {
            console.error(err);
            setMsg(
                err.response?.data?.error || "Upload failed. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-xl">
                            <TrendingUp className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Explore Documents
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Upload PDF documents for analysis and exploration
                    </p>
                </div>

                {/* Form Container */}
                <form
                    onSubmit={handleUpload}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 space-y-6"
                >
                    {/* Title Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Document Title *
                        </label>
                        <input
                            type="text"
                            placeholder="Enter a descriptive title for your PDF..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                        />
                    </div>

                    {/* PDF Upload Section */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            PDF Document *
                        </label>

                        {!pdf ? (
                            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-slate-900/50 transition-all duration-300 group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-amber-500/10 p-5 rounded-full mb-4 group-hover:bg-amber-500/20 transition-colors">
                                        <FileText className="h-12 w-12 text-amber-400" />
                                    </div>
                                    <p className="mb-2 text-base text-gray-400">
                                        <span className="font-semibold text-amber-400">
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
                                <div className="flex items-center justify-between bg-slate-900 border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all duration-200">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-amber-500/10 p-3 rounded-lg">
                                            <FileText className="h-8 w-8 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">
                                                {pdf.name}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                {(
                                                    pdf.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removePdf}
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
                        className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                <span>Upload PDF Document</span>
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

                {/* Info Cards Grid */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                    {/* Supported Features */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">✨</span>
                            Supported Features
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Advanced PDF text extraction</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Document search and indexing</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Content analysis and insights</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Secure document storage</span>
                            </li>
                        </ul>
                    </div>

                    {/* Upload Guidelines */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">📋</span>
                            Upload Guidelines
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Only PDF files are accepted</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Maximum file size is 50MB</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>
                                    Ensure PDFs are not password-protected
                                </span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-amber-400 mr-2">•</span>
                                <span>Use clear, descriptive titles</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Stats */}
                <div className="mt-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl border border-amber-500/20 p-6">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                            <FileText className="h-6 w-6 text-amber-400" />
                        </div>
                        <p className="text-gray-300 text-center">
                            <span className="font-semibold text-white">
                                Pro Tip:
                            </span>{" "}
                            Documents are processed automatically for quick
                            searching and analysis
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
