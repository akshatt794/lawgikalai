import { useEffect, useState } from "react";
import axios from "axios";
import {
    Users as UsersIcon,
    Search,
    Loader2,
    User,
    Mail,
    Hash,
    UserCircle,
    Filter,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return setLoading(false);

        axios
            .get(`${API_URL}/api/auth/all-users`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const userData = res.data.users || res.data;
                setUsers(userData);
                setFilteredUsers(userData);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Search functionality
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(
                (user) =>
                    user.fullName
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    user.identifier
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    user._id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-16 w-16 text-emerald-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-xl">
                            <UsersIcon className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        User Management
                    </h1>
                    <p className="text-gray-400 text-lg">
                        View and manage all registered users
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 content-center">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-gray-700/50 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Total Users
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {users.length}
                                </p>
                            </div>
                            <div className="bg-emerald-500/10 p-3 rounded-lg">
                                <UsersIcon className="h-8 w-8 text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    {/* <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-gray-700/50 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Active Now
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {filteredUsers.length}
                                </p>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <UserCircle className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                    </div> */}

                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-gray-700/50 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">
                                    Showing Results
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {filteredUsers.length}
                                </p>
                            </div>
                            <div className="bg-purple-500/10 p-3 rounded-lg">
                                <Filter className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, identifier, or user ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Users Table/Cards */}
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 max-w-md mx-auto">
                            <UsersIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {searchTerm
                                    ? "No users found"
                                    : "No users available"}
                            </h3>
                            <p className="text-gray-400">
                                {searchTerm
                                    ? "Try adjusting your search terms"
                                    : "Users will appear here once registered"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/80">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                                <div className="flex items-center space-x-2">
                                                    <User className="h-4 w-4" />
                                                    <span>Name</span>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="h-4 w-4" />
                                                    <span>Identifier</span>
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                                <div className="flex items-center space-x-2">
                                                    <Hash className="h-4 w-4" />
                                                    <span>User ID</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {filteredUsers.map((user, index) => (
                                            <tr
                                                key={user._id}
                                                className="hover:bg-slate-900/50 transition-colors duration-200"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold">
                                                            {user.fullName
                                                                ?.charAt(0)
                                                                .toUpperCase() ||
                                                                "U"}
                                                        </div>
                                                        <span className="text-white font-semibold">
                                                            {user.fullName ||
                                                                "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                    {user.identifier || "N/A"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-xs bg-slate-900 text-blue-400 px-3 py-1.5 rounded-md font-mono">
                                                        {user._id}
                                                    </code>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user._id}
                                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg"
                                >
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                            {user.fullName
                                                ?.charAt(0)
                                                .toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-lg">
                                                {user.fullName || "N/A"}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {user.identifier || "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-700/50">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            User ID
                                        </p>
                                        <code className="text-xs bg-slate-900 text-blue-400 px-3 py-1.5 rounded-md font-mono inline-block">
                                            {user._id}
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
