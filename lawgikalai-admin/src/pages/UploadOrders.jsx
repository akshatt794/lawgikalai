import React, { useState } from "react";
import axios from "axios";
import {
    FileText,
    Upload,
    X,
    CheckCircle,
    AlertCircle,
    Scale,
    Gavel,
} from "lucide-react";

const UploadOrders = () => {
    const [title, setTitle] = useState("");
    const [pdfFile, setPdfFile] = useState(null);
    const [responseMsg, setResponseMsg] = useState("");
    const [msgType, setMsgType] = useState(""); // success or error
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setPdfFile(file);
    };

    const removePdf = () => {
        setPdfFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!pdfFile) {
            setResponseMsg("Please upload a PDF file");
            setMsgType("error");
            return;
        }

        setLoading(true);
        setResponseMsg("");
        setMsgType("");

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

            setResponseMsg(
                res.data.message || "Court order uploaded successfully!"
            );
            setMsgType("success");
            console.log("Uploaded Order:", res.data);
            setTitle("");
            setPdfFile(null);
        } catch (err) {
            console.error("Upload failed:", err);
            setResponseMsg(
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
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-xl">
                            <Gavel className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Upload Court Orders
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Submit official court order documents for processing
                    </p>
                </div>

                {/* Form Container */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 space-y-6"
                >
                    {/* Title Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Order Title *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., High Court Order - Case No. 123/2024"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                    </div>

                    {/* PDF Upload Section */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Court Order PDF *
                        </label>

                        {!pdfFile ? (
                            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-900/50 transition-all duration-300 group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-blue-500/10 p-5 rounded-full mb-4 group-hover:bg-blue-500/20 transition-colors">
                                        <FileText className="h-12 w-12 text-blue-400" />
                                    </div>
                                    <p className="mb-2 text-base text-gray-400">
                                        <span className="font-semibold text-blue-400">
                                            Click to upload
                                        </span>{" "}
                                        or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-500 mb-1">
                                        PDF documents only
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Maximum file size: 50MB
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    required
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="relative group">
                                <div className="flex items-center justify-between bg-slate-900 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-200">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-blue-500/10 p-3 rounded-lg">
                                            <FileText className="h-8 w-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">
                                                {pdfFile.name}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                {(
                                                    pdfFile.size /
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
                        className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                <span>Upload Court Order</span>
                            </>
                        )}
                    </button>

                    {/* Status Message */}
                    {responseMsg && (
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
                                {responseMsg}
                            </p>
                        </div>
                    )}
                </form>

                {/* Info Cards Grid */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                    {/* Document Requirements */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">📄</span>
                            Document Requirements
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Official court orders only</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>PDF format required</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Clear and legible scans</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Complete document pages</span>
                            </li>
                        </ul>
                    </div>

                    {/* Best Practices */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="mr-2">✅</span>
                            Best Practices
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Include case number in title</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Use descriptive file names</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Verify document before upload</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">•</span>
                                <span>Keep original documents secure</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Important Notice */}
                <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
                    <div className="flex items-start space-x-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg flex-shrink-0">
                            <Scale className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-2">
                                Important Notice
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                All uploaded court orders are securely stored
                                and processed in compliance with legal document
                                handling standards. Ensure you have proper
                                authorization before uploading any court
                                documents.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadOrders;
