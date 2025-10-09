import { useState } from "react";
import axios from "axios";
import {
    Plus,
    X,
    Send,
    FileText,
    MapPin,
    Shield,
    Users,
    Upload as UploadIcon,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

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

export default function AddBailRoster() {
    const [zone, setZone] = useState("");
    const [file, setFile] = useState(null);
    const [officers, setOfficers] = useState([
        {
            judicial_officer: "",
            first_link_officer: "",
            second_link_officer: "",
            police_station: "",
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("");

    // Add another officer row
    const addOfficerRow = () => {
        setOfficers([
            ...officers,
            {
                judicial_officer: "",
                first_link_officer: "",
                second_link_officer: "",
                police_station: "",
            },
        ]);
    };

    // Remove officer row
    const removeOfficerRow = (index) => {
        if (officers.length === 1) return;
        setOfficers(officers.filter((_, i) => i !== index));
    };

    // Handle input changes
    const handleChange = (index, e) => {
        const { name, value } = e.target;
        const updated = [...officers];
        updated[index][name] = value;
        setOfficers(updated);
    };

    // Handle file selection
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    // Remove file
    const removeFile = () => {
        setFile(null);
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        if (!zone || !file) {
            setMsg("Please select a zone and upload a PDF file.");
            setMsgType("error");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("zone", zone);
            formData.append("file", file);
            formData.append("officers", JSON.stringify(officers));

            await axios.post(`${API_URL}/api/bailroster/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            setMsg("Bail Roster uploaded successfully!");
            setMsgType("success");
            setZone("");
            setFile(null);
            setOfficers([
                {
                    judicial_officer: "",
                    first_link_officer: "",
                    second_link_officer: "",
                    police_station: "",
                },
            ]);
        } catch (err) {
            console.error(err);
            setMsg(
                err.response?.data?.error ||
                    err.message ||
                    "Upload failed. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-xl">
                            <Shield className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Add Bail Roster
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Upload bail roster file and manage officers for the zone
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Selected Zone
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {zone || "Not Selected"}
                                </p>
                            </div>
                            <div className="bg-purple-500/10 p-3 rounded-lg">
                                <MapPin className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Officers Added
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {officers.length}
                                </p>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <Users className="h-6 w-6 text-blue-400" />
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
                                    {file ? "Uploaded" : "Pending"}
                                </p>
                            </div>
                            <div className="bg-amber-500/10 p-3 rounded-lg">
                                <FileText className="h-6 w-6 text-amber-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50"
                >
                    {/* Zone and File Upload Section */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Zone Selector */}
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                                Select Zone *
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                                <select
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 cursor-pointer"
                                >
                                    <option value="">Choose a zone...</option>
                                    {zones.map((z) => (
                                        <option key={z} value={z}>
                                            {z}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">
                                Upload PDF File *
                            </label>
                            {!file ? (
                                <label className="flex items-center justify-center w-full h-[50px] border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-slate-900/50 transition-all duration-300 group">
                                    <div className="flex items-center space-x-2">
                                        <UploadIcon className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-gray-400 text-sm group-hover:text-purple-400 transition-colors">
                                            Click to upload PDF
                                        </span>
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
                                <div className="flex items-center justify-between bg-slate-900 border border-gray-700 rounded-lg p-3 hover:border-purple-500/50 transition-all duration-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-purple-500/10 p-2 rounded-lg">
                                            <FileText className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">
                                                {file.name}
                                            </p>
                                            <p className="text-gray-400 text-xs">
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
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Officers Section Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                            <div className="bg-blue-500/10 p-2 rounded-lg">
                                <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">
                                Officer Details
                            </h2>
                        </div>
                        <span className="text-gray-400 text-sm">
                            {officers.length}{" "}
                            {officers.length === 1 ? "Officer" : "Officers"}
                        </span>
                    </div>

                    {/* Officers List */}
                    <div className="space-y-4 mb-6">
                        {officers.map((officer, index) => (
                            <div
                                key={index}
                                className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
                            >
                                {/* Row Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="bg-purple-500/20 w-8 h-8 rounded-lg flex items-center justify-center">
                                            <span className="text-purple-400 font-bold text-sm">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <span className="text-white font-semibold">
                                            Officer #{index + 1}
                                        </span>
                                    </div>
                                    {officers.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeOfficerRow(index)
                                            }
                                            className="flex items-center space-x-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all duration-200"
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="text-sm">
                                                Remove
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Officer Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Judicial Officer */}
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                            Judicial Officer *
                                        </label>
                                        <input
                                            name="judicial_officer"
                                            value={officer.judicial_officer}
                                            onChange={(e) =>
                                                handleChange(index, e)
                                            }
                                            placeholder="Ld. Judicial Officer name"
                                            required
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    {/* 1st Link Officer */}
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                            1st Link Officer
                                        </label>
                                        <input
                                            name="first_link_officer"
                                            value={officer.first_link_officer}
                                            onChange={(e) =>
                                                handleChange(index, e)
                                            }
                                            placeholder="1st Link Officer name"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    {/* 2nd Link Officer */}
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                            2nd Link Officer
                                        </label>
                                        <input
                                            name="second_link_officer"
                                            value={officer.second_link_officer}
                                            onChange={(e) =>
                                                handleChange(index, e)
                                            }
                                            placeholder="2nd Link Officer name"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    {/* Police Station */}
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                            Police Station
                                        </label>
                                        <input
                                            name="police_station"
                                            value={officer.police_station}
                                            onChange={(e) =>
                                                handleChange(index, e)
                                            }
                                            placeholder="Police station name"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={addOfficerRow}
                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-transparent border-2 border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 hover:border-blue-400 transition-all duration-200 font-semibold"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Add Another Officer</span>
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    <span>Submit Bail Roster</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Status Message */}
                    {msg && (
                        <div
                            className={`mt-6 flex items-start space-x-3 p-4 rounded-lg border ${
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
            </div>
        </div>
    );
}
