import { useState } from "react";
import axios from "axios";
import { Plus, X, Send, Scale, Users } from "lucide-react";

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

export default function AddJudgesList() {
    const emptyJudge = {
        name: "",
        designation_jurisdiction: "",
        court_room: "",
        vc_link: "",
        vc_meeting_id_email: "",
        zone: "",
    };

    const [judges, setJudges] = useState([emptyJudge]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("");

    const addRow = () => setJudges([...judges, { ...emptyJudge }]);

    const removeRow = (index) => {
        if (judges.length === 1) return;
        setJudges(judges.filter((_, i) => i !== index));
    };

    const handleChange = (index, e) => {
        const { name, value } = e.target;
        const updated = [...judges];
        updated[index][name] = value;
        setJudges(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.post(
                `${API_URL}/api/judgeList/add-multiple`,
                { judges },
                {
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            setMsg(data.message || "Judges list uploaded successfully!");
            setMsgType("success");
            setJudges([emptyJudge]);
        } catch (err) {
            console.error("❌ Upload Error:", err);
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-2xl shadow-xl">
                            <Scale className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Add Judges List
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Add and manage multiple judges easily
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50"
                >
                    {/* Judges Count */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2 bg-slate-700/50 px-4 py-2 rounded-lg">
                            <Users className="h-5 w-5 text-amber-400" />
                            <span className="text-white font-semibold">
                                {judges.length}{" "}
                                {judges.length === 1 ? "Judge" : "Judges"}
                            </span>
                        </div>
                    </div>

                    {/* Judges List */}
                    <div className="space-y-6 mb-8">
                        {judges.map((judge, index) => (
                            <div
                                key={index}
                                className="bg-slate-900/50 p-6 rounded-xl border border-gray-700/50 hover:border-amber-500/30 transition-all duration-300"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-amber-400 font-semibold text-sm">
                                        Judge #{index + 1}
                                    </span>
                                    {judges.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            className="flex items-center space-x-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all duration-200"
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="text-sm">
                                                Remove
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        {
                                            name: "name",
                                            label: "Name *",
                                            placeholder: "Enter judge's name",
                                            required: true,
                                        },
                                        {
                                            name: "designation_jurisdiction",
                                            label: "Designation & Jurisdiction *",
                                            placeholder:
                                                "e.g., District Judge, Civil",
                                            required: true,
                                        },
                                        {
                                            name: "court_room",
                                            label: "Court Room *",
                                            placeholder: "e.g., Room 101",
                                            required: true,
                                        },
                                        {
                                            name: "vc_link",
                                            label: "VC Link",
                                            placeholder:
                                                "https://meet.example.com",
                                        },
                                        {
                                            name: "vc_meeting_id_email",
                                            label: "VC Meeting ID / Email",
                                            placeholder: "meeting@example.com",
                                        },
                                    ].map((field) => (
                                        <div key={field.name}>
                                            <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                                {field.label}
                                            </label>
                                            <input
                                                name={field.name}
                                                value={judge[field.name]}
                                                onChange={(e) =>
                                                    handleChange(index, e)
                                                }
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                                            />
                                        </div>
                                    ))}

                                    {/* Zone */}
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                            Zone *
                                        </label>
                                        <select
                                            name="zone"
                                            value={judge.zone}
                                            onChange={(e) =>
                                                handleChange(index, e)
                                            }
                                            required
                                            className="w-full px-4 py-3 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 cursor-pointer"
                                        >
                                            <option value="">
                                                Select Zone
                                            </option>
                                            {zones.map((z) => (
                                                <option key={z} value={z}>
                                                    {z}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-transparent border-2 border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 hover:border-blue-400 transition-all duration-200 font-semibold"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Add Another Judge</span>
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            <Send className="h-5 w-5" />
                            <span>
                                {loading
                                    ? "Submitting..."
                                    : "Submit All Judges"}
                            </span>
                        </button>
                    </div>

                    {/* Status Message */}
                    {msg && (
                        <div
                            className={`mt-6 p-4 rounded-lg border text-center font-medium ${
                                msgType === "success"
                                    ? "bg-green-500/10 border-green-500/50 text-green-400"
                                    : "bg-red-500/10 border-red-500/50 text-red-400"
                            }`}
                        >
                            {msg}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
