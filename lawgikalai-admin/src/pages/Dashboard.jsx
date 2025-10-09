import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Newspaper,
    Users,
    Eye,
    FileText,
    Scale,
    Upload,
    TrendingUp,
    Shield,
} from "lucide-react";

export default function Dashboard() {
    const navigate = useNavigate();

    const mainCards = [
        {
            title: "Upload News",
            description: "Add new legal news and updates",
            icon: Upload,
            path: "/upload-news",
            gradient: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-500/10 to-cyan-500/10",
        },
        {
            title: "View All News",
            description: "Browse and manage all news articles",
            icon: Eye,
            path: "/all-news",
            gradient: "from-purple-500 to-pink-500",
            bgGradient: "from-purple-500/10 to-pink-500/10",
        },
        {
            title: "Manage Users",
            description: "User administration and permissions",
            icon: Users,
            path: "/users",
            gradient: "from-emerald-500 to-teal-500",
            bgGradient: "from-emerald-500/10 to-teal-500/10",
        },
    ];

    const quickLinks = [
        {
            title: "Explore",
            icon: TrendingUp,
            path: "/explore",
            color: "text-amber-400",
        },
        {
            title: "Upload Orders",
            icon: FileText,
            path: "/admin/upload-orders",
            color: "text-blue-400",
        },
        {
            title: "Bail Roster",
            icon: Shield,
            path: "/admin/add-bail-roster",
            color: "text-purple-400",
        },
        {
            title: "Judges List",
            icon: Scale,
            path: "/admin/add-judges",
            color: "text-green-400",
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
            },
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12"
                >
                    <div className="flex justify-center items-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-700 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-amber-500 to-amber-700 p-5 rounded-2xl shadow-2xl">
                                <Scale className="h-12 w-12 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                        Admin Dashboard
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Manage your legal case management system with ease
                    </p>
                </motion.div>

                {/* Main Action Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-3 gap-6 mb-12"
                >
                    {mainCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(card.path)}
                                className="cursor-pointer group"
                            >
                                <div
                                    className={`relative bg-gradient-to-br ${card.bgGradient} backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden`}
                                >
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16"></div>

                                    {/* Icon */}
                                    <div
                                        className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${card.gradient} mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                                    >
                                        <Icon className="h-8 w-8 text-white" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-white mb-2">
                                        {card.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        {card.description}
                                    </p>

                                    {/* Hover arrow */}
                                    <div className="mt-4 flex items-center text-gray-400 group-hover:text-white transition-colors">
                                        <span className="text-sm font-semibold mr-2">
                                            Access Now
                                        </span>
                                        <svg
                                            className="w-4 h-4 transform group-hover:translate-x-2 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Quick Links Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-xl"
                >
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <span className="mr-3">⚡</span>
                        Quick Access
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickLinks.map((link, index) => {
                            const Icon = link.icon;
                            return (
                                <motion.button
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate(link.path)}
                                    className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-gray-700/50 hover:border-gray-600 hover:bg-slate-900/80 transition-all duration-300 group"
                                >
                                    <Icon
                                        className={`h-8 w-8 ${link.color} mb-3 group-hover:scale-110 transition-transform duration-300`}
                                    />
                                    <span className="text-white font-semibold text-sm text-center">
                                        {link.title}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Stats Section */}
                {/* <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {[
                        { label: "Active Users", value: "1,234", icon: Users },
                        {
                            label: "News Articles",
                            value: "567",
                            icon: Newspaper,
                        },
                        { label: "Case Files", value: "890", icon: FileText },
                    ].map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-lg"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm font-medium mb-1">
                                            {stat.label}
                                        </p>
                                        <p className="text-3xl font-bold text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className="bg-amber-500/10 p-3 rounded-lg">
                                        <Icon className="h-8 w-8 text-amber-400" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </motion.div> */}
            </div>
        </div>
    );
}
