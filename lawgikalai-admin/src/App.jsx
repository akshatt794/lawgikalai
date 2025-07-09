import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadNews from "./pages/UploadNews";
import AllNews from "./pages/AllNews";
import Users from "./pages/Users";

function Navbar() {
  return (
    <nav style={{ padding: 12, background: "#f8f8f8", marginBottom: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <Link to="/dashboard" style={{ marginRight: 18, textDecoration: "none" }}>Dashboard</Link>
      <Link to="/upload-news" style={{ marginRight: 18, textDecoration: "none" }}>Upload News</Link>
      <Link to="/all-news" style={{ marginRight: 18, textDecoration: "none" }}>All News</Link>
      <Link to="/users" style={{ textDecoration: "none" }}>Users</Link>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      {/* Show Navbar on all pages except Login */}
      {window.location.pathname !== "/" && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload-news" element={<UploadNews />} />
        <Route path="/all-news" element={<AllNews />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </Router>
  );
}
