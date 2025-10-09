import { useState } from "react";
import axios from "axios";
import { Plus, X, Send, FileText, MapPin } from "lucide-react";

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

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        if (!zone || !file) {
            setMsg("⚠️ Please select a zone and upload a PDF file.");
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

            setMsg("✅ Bail Roster uploaded successfully!");
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
            e.target.reset();
        } catch (err) {
            console.error(err);
            setMsg(
                err.response?.data?.error ||
                    err.message ||
                    "❌ Upload failed. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-2xl shadow-xl">
                            <FileText className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Add Bail Roster
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Upload bail roster file and add multiple officers for
                        the zone
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50"
                >
                    {/* Zone Selector */}
                    <div className="mb-6">
                        <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wide">
                            Select Zone *
                        </label>
                        <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-amber-400" />
                            <select
                                value={zone}
                                onChange={(e) => setZone(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 cursor-pointer"
                            >
                                <option value="">Select Zone</option>
                                {zones.map((z) => (
                                    <option key={z} value={z}>
                                        {z}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="mb-8">
                        <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wide">
                            Upload PDF File *
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            required
                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700"
                        />
                    </div>

                    {/* Officers Section */}
                    <div className="space-y-4 mb-6">
                        {officers.map((officer, index) => (
                            <div
                                key={index}
                                className="bg-slate-900/50 p-6 rounded-xl border border-gray-700/50 hover:border-amber-500/30 transition-all duration-300"
                            >
                                {/* Row Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-amber-400 font-semibold text-sm">
                                        Officer #{index + 1}
                                    </span>
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
                                            placeholder="Enter name of Ld. Judicial Officer"
                                            required
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
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
                                            placeholder="Enter name of 1st Link Officer"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
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
                                            placeholder="Enter name of 2nd Link Officer"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
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
                                            placeholder="Enter police station name"
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
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
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            <Send className="h-5 w-5" />
                            <span>
                                {loading
                                    ? "Uploading..."
                                    : "Submit Bail Roster"}
                            </span>
                        </button>
                    </div>

                    {/* Status Message */}
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
