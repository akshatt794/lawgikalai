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
    CalendarDays,
    Info,
    ClipboardList,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AddGeneralDocument() {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("BareAct");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("");

    const handleFileChange = (e) => setFile(e.target.files[0]);
    const removeFile = () => setFile(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        if (!title || !file || !category) {
            setMsg("Please fill all required fields.");
            setMsgType("error");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("title", title);
            formData.append("category", category);
            formData.append("pdf", file);

            const { data } = await axios.post(
                `${API_URL}/api/general-document/upload`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            setMsg(data.message || "Document uploaded successfully!");
            setMsgType("success");
            setTitle("");
            setCategory("BareAct");
            setFile(null);
        } catch (err) {
            console.error("Upload failed:", err);
            setMsg(
                err.response?.data?.message ||
                    err.message ||
                    "Failed to upload. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Dynamic UI based on category
    const categoryStyles = {
        BareAct: {
            color: "from-indigo-500 to-purple-600",
            bgColor: "bg-indigo-500/10",
            textColor: "text-indigo-400",
            icon: <BookOpen className="h-10 w-10 text-white" />,
            smallIcon: <BookOpen className="h-8 w-8 text-indigo-400" />,
            label: "Bare Act",
            description: "Legal statutes and acts in their original form",
            examples: [
                "Indian Penal Code, 1860",
                "Code of Criminal Procedure, 1973",
                "Indian Evidence Act, 1872",
            ],
        },
        CriminalLaw: {
            color: "from-red-500 to-pink-600",
            bgColor: "bg-red-500/10",
            textColor: "text-red-400",
            icon: <Scale className="h-10 w-10 text-white" />,
            smallIcon: <Scale className="h-8 w-8 text-red-400" />,
            label: "Criminal Law",
            description:
                "Criminal law documents, judgments, and reference materials",
            examples: [
                "Supreme Court Judgments",
                "Criminal Law Amendments",
                "Case Studies",
            ],
        },
        Event: {
            color: "from-amber-500 to-orange-600",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-400",
            icon: <CalendarDays className="h-10 w-10 text-white" />,
            smallIcon: <CalendarDays className="h-8 w-8 text-amber-400" />,
            label: "Event",
            description: "Legal events, seminars, and conference materials",
            examples: [
                "Legal Workshop Materials",
                "Seminar Proceedings",
                "Conference Papers",
            ],
        },
        Forms: {
            color: "from-green-500 to-emerald-600",
            bgColor: "bg-green-500/10",
            textColor: "text-green-400",
            icon: <ClipboardList className="h-10 w-10 text-white" />,
            smallIcon: <ClipboardList className="h-8 w-8 text-green-400" />,
            label: "Forms",
            description:
                "Court, legal, or administrative forms for legal processes",
            examples: [
                "Bail Application Form",
                "Affidavit Template",
                "Filing Form for Civil Case",
            ],
        },
    };

    const {
        color,
        bgColor,
        textColor,
        icon,
        smallIcon,
        label,
        description,
        examples,
    } = categoryStyles[category];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div
                            className={`bg-gradient-to-br ${color} p-4 rounded-2xl shadow-xl transition-all duration-300`}
                        >
                            {icon}
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Upload {label}
                    </h1>
                    <p className="text-gray-400 text-lg">{description}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Document Type
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {label}
                                </p>
                            </div>
                            <div
                                className={`${bgColor} p-3 rounded-lg transition-all duration-300`}
                            >
                                {smallIcon}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Title Status
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {title ? "Entered" : "Pending"}
                                </p>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <FileText className="h-8 w-8 text-blue-400" />
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
                                <Upload className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 space-y-6"
                >
                    {/* Category Selector */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Select Document Type *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 cursor-pointer"
                        >
                            <option value="BareAct">Bare Act</option>
                            <option value="CriminalLaw">Criminal Law</option>
                            <option value="Event">Event</option>
                            <option value="Forms">Forms</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-2">
                            Choose the appropriate category for your document
                        </p>
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Document Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={`e.g., ${examples[0]}`}
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                        />
                        <p className="text-gray-500 text-xs mt-2">
                            Enter the complete official title
                        </p>
                    </div>

                    {/* File Upload */}
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
                                    Max file size: 50MB
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
                                            {(file.size / 1024 / 1024).toFixed(
                                                2
                                            )}{" "}
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

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r ${color} text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-5 w-5" />
                                <span>Upload {label}</span>
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

                {/* Example Titles Section */}
                <div
                    className={`mt-8 bg-gradient-to-r ${color} bg-opacity-10 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6`}
                >
                    <div className="flex items-start space-x-3">
                        <div
                            className={`${bgColor} p-2 rounded-lg flex-shrink-0`}
                        >
                            <Info className={`h-6 w-6 ${textColor}`} />
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-3">
                                Example {label} Titles
                            </h4>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {examples.map((example, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start"
                                    >
                                        <span className={`${textColor} mr-2`}>
                                            •
                                        </span>
                                        <span>{example}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
