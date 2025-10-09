import { useState } from "react";
import axios from "axios";
import {
    Newspaper,
    Upload,
    X,
    CheckCircle,
    AlertCircle,
    Image as ImageIcon,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadNews() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState(null);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState(""); // success or error
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState("");

    // File input handler
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview("");
        }
    };

    // Remove image
    const removeImage = () => {
        setImage(null);
        setPreview("");
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            if (image) formData.append("image", image);

            await axios.post(`${API_URL}/api/news/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            setMsg("News uploaded successfully!");
            setMsgType("success");
            setTitle("");
            setContent("");
            setImage(null);
            setPreview("");
        } catch (err) {
            setMsg(
                err.response?.data?.error ||
                    "Failed to upload news. Please try again."
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
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-2xl shadow-xl">
                            <Newspaper className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Upload News Article
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Share the latest legal news and updates
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
                            Article Title *
                        </label>
                        <input
                            type="text"
                            placeholder="Enter a compelling headline..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                    </div>

                    {/* Content Textarea */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Article Content *
                        </label>
                        <textarea
                            placeholder="Write your news article content here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={8}
                            className="w-full px-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-vertical"
                        />
                        <p className="text-gray-500 text-xs mt-2">
                            {content.length} characters
                        </p>
                    </div>

                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                            Featured Image
                        </label>

                        {!preview ? (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-900/50 transition-all duration-300 group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-blue-500/10 p-4 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
                                        <ImageIcon className="h-10 w-10 text-blue-400" />
                                    </div>
                                    <p className="mb-2 text-sm text-gray-400">
                                        <span className="font-semibold text-blue-400">
                                            Click to upload
                                        </span>{" "}
                                        or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PNG, JPG, GIF up to 10MB
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="relative group">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-64 object-cover rounded-xl border border-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <p className="text-white text-xs font-medium">
                                        {image?.name}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                <span>Publish News Article</span>
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

                {/* Help Text */}
                <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                        <span className="mr-2">💡</span>
                        Tips for Great News Articles
                    </h3>
                    <ul className="space-y-2 text-gray-400 text-sm">
                        <li className="flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            <span>
                                Use clear, concise headlines that capture the
                                main point
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            <span>
                                Include relevant images to make your article
                                more engaging
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            <span>
                                Write in an objective, professional tone
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            <span>
                                Proofread before publishing to ensure accuracy
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
