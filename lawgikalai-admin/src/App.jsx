import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Scale, Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadNews from "./pages/UploadNews";
import AllNews from "./pages/AllNews";
import Users from "./pages/Users";
import ExplorePage from "./pages/ExplorePage";
import UploadOrders from "./pages/UploadOrders";
import AddJudgesList from "./pages/AddJudgesList";
import AddBailRoster from "./pages/AddBailRoster";
import AddGeneralDocument from "./pages/AddGeneralDocument";

function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

    const mainLinks = [
        { path: "/dashboard", label: "Dashboard" },
        { path: "/upload-news", label: "Upload News" },
        // { path: "/all-news", label: "All News" },
        { path: "/users", label: "Users" },
        { path: "/explore", label: "Explore" },
    ];

    const adminLinks = [
        { path: "/admin/upload-orders", label: "Upload Orders" },
        { path: "/admin/add-bail-roster", label: "Add Bail Roster" },
        { path: "/admin/add-judges", label: "Add Judges" },
        { path: "/admin/add-documents", label: "Add Documents" },
    ];

    const isAdminRoute = location.pathname.startsWith("/admin");

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Brand Section */}
                    <div
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center space-x-3 cursor-pointer group"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                                <Scale className="h-7 w-7 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                LawgikalAI
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                Legal Case Management
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {mainLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                                            : "text-gray-700 hover:text-amber-600 hover:bg-amber-50"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* Admin Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setAdminDropdownOpen(!adminDropdownOpen)
                                }
                                className={`flex items-center space-x-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                    isAdminRoute
                                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                                        : "text-gray-700 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                            >
                                <span>Admin</span>
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                        adminDropdownOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {adminDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fadeIn">
                                    {adminLinks.map((link) => {
                                        const isActive =
                                            location.pathname === link.path;
                                        return (
                                            <Link
                                                key={link.path}
                                                to={link.path}
                                                onClick={() =>
                                                    setAdminDropdownOpen(false)
                                                }
                                                className={`block px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                                    isActive
                                                        ? "bg-amber-50 text-amber-600"
                                                        : "text-gray-700 hover:bg-gray-50 hover:text-amber-600"
                                                }`}
                                            >
                                                {link.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg animate-slideDown">
                    <div className="px-4 py-4 space-y-1">
                        {/* Main Links */}
                        {mainLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                                            : "text-gray-700 hover:bg-amber-50 hover:text-amber-600"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* Admin Section */}
                        <div className="pt-2 mt-2 border-t border-gray-200">
                            <p className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Admin
                            </p>
                            {adminLinks.map((link) => {
                                const isActive =
                                    location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            isActive
                                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                                                : "text-gray-700 hover:bg-amber-50 hover:text-amber-600"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Dropdown Overlay */}
            {adminDropdownOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAdminDropdownOpen(false)}
                />
            )}
        </nav>
    );
}

function AppWithNavbar() {
    const location = useLocation();
    const hideNavbar = location.pathname === "/";

    return (
        <>
            {!hideNavbar && <Navbar />}
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload-news" element={<UploadNews />} />
                <Route path="/all-news" element={<AllNews />} />
                <Route path="/users" element={<Users />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/admin/upload-orders" element={<UploadOrders />} />
                <Route
                    path="/admin/add-bail-roster"
                    element={<AddBailRoster />}
                />
                <Route path="/admin/add-judges" element={<AddJudgesList />} />
                <Route
                    path="/admin/add-documents"
                    element={<AddGeneralDocument />}
                />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <Router>
            <AppWithNavbar />
        </Router>
    );
}

// Add these animations to your global CSS or Tailwind config
