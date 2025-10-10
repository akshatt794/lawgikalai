import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

import {
    Scale,
    Lock,
    User,
    LogIn,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
} from "lucide-react";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMsg("");
        setMsgType("");
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                identifier,
                password,
            });
            localStorage.setItem("token", res.data.token);
            setMsg("Login successful! Redirecting...");
            setMsgType("success");

            setTimeout(() => {
                navigate("/dashboard");
            }, 1000);
        } catch (err) {
            console.error(err);
            setMsg(
                err.response?.data?.error ||
                    "Invalid credentials. Please try again."
            );
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-2xl shadow-2xl">
                                <Scale className="h-12 w-12 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        LawgikalAI
                    </h1>
                    <p className="text-gray-400 text-lg">Admin Portal</p>
                </div>

                {/* Login Form */}
                <form
                    onSubmit={handleLogin}
                    className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-700/50 backdrop-blur-sm space-y-6"
                >
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-1">
                            Welcome Back
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {/* Email/Username Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                            Email or Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter your email or username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-11 pr-11 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <LogIn className="h-5 w-5" />
                                <span>Sign In</span>
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

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © 2024 LawgikalAI. All rights reserved.
                    </p>
                </div>

                {/* Security Notice */}
                <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-gray-700/30 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="bg-amber-500/10 p-2 rounded-lg flex-shrink-0">
                            <Lock className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            This is a secure admin portal. All login attempts
                            are monitored and logged for security purposes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
