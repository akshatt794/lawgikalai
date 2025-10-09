import { useEffect, useState } from "react";
import axios from "axios";
import {
    Newspaper,
    Calendar,
    Search,
    Filter,
    Loader2,
    FileText,
    Image as ImageIcon,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AllNews() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredNews, setFilteredNews] = useState([]);

    useEffect(() => {
        axios
            .get(`${API_URL}/api/news/all`)
            .then((res) => {
                const newsData = res.data.news || res.data;
                setNews(newsData);
                setFilteredNews(newsData);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Search functionality
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredNews(news);
        } else {
            const filtered = news.filter(
                (item) =>
                    item.title
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    item.content
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
            );
            setFilteredNews(filtered);
        }
    }, [searchTerm, news]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-16 w-16 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">
                        Loading news articles...
                    </p>
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
                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-xl">
                            <Newspaper className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        News Articles
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Browse all legal news and updates
                    </p>
                </div>

                {/* Search and Filter Bar */}
                <div className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search articles by title or content..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                            />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center space-x-2 bg-slate-900 px-4 py-3 rounded-lg border border-gray-700">
                            <FileText className="h-5 w-5 text-purple-400" />
                            <span className="text-white font-semibold">
                                {filteredNews.length}{" "}
                                {filteredNews.length === 1
                                    ? "Article"
                                    : "Articles"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* News Grid */}
                {filteredNews.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 max-w-md mx-auto">
                            <Newspaper className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {searchTerm
                                    ? "No matching articles found"
                                    : "No news available"}
                            </h3>
                            <p className="text-gray-400">
                                {searchTerm
                                    ? "Try adjusting your search terms"
                                    : "Check back later for updates"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNews.map((item) => (
                            <article
                                key={item._id}
                                className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 group"
                            >
                                {/* Image Section */}
                                {item.image ? (
                                    <div className="relative h-48 overflow-hidden bg-slate-900">
                                        <img
                                            src={
                                                item.image.startsWith("http")
                                                    ? item.image
                                                    : `${API_URL}${
                                                          item.image.startsWith(
                                                              "/"
                                                          )
                                                              ? ""
                                                              : "/"
                                                      }${item.image}`
                                            }
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                                    </div>
                                ) : (
                                    <div className="h-48 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                                        <ImageIcon className="h-16 w-16 text-gray-600" />
                                    </div>
                                )}

                                {/* Content Section */}
                                <div className="p-6">
                                    {/* Title */}
                                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-purple-400 transition-colors duration-200">
                                        {item.title}
                                    </h3>

                                    {/* Content */}
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                                        {item.content}
                                    </p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                                        <div className="flex items-center space-x-2 text-gray-500 text-xs">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {new Date(
                                                    item.createdAt
                                                ).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        <button className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center space-x-1 group/btn">
                                            <span>Read More</span>
                                            <svg
                                                className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform"
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
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* Bottom Stats */}
                {filteredNews.length > 0 && (
                    <div className="mt-12 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div>
                                <p className="text-3xl font-bold text-white mb-1">
                                    {filteredNews.length}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Total Articles
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white mb-1">
                                    {filteredNews.filter((n) => n.image).length}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    With Images
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white mb-1">
                                    {filteredNews.length > 0
                                        ? new Date(
                                              filteredNews[0].createdAt
                                          ).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "N/A"}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Latest Update
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
