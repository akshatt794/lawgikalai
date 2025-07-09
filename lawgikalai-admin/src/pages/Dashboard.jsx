import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        width: "100vw",
        background: "linear-gradient(120deg, #17173A 0%, #183153 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          fontSize: "2.8rem",
          fontWeight: "bold",
          letterSpacing: 1.2,
          marginBottom: 30,
          textShadow: "0 6px 28px rgba(0,0,0,0.2)"
        }}
      >
        Welcome to the Admin Dashboard
      </motion.h1>

      <div
        style={{
          display: "flex",
          gap: 36,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.08, boxShadow: "0 4px 24px #47c7ff44" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/upload-news")}
          style={btnStyle}
        >
          <span style={{ fontWeight: 600 }}>Upload News</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08, boxShadow: "0 4px 24px #6f92ff44" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/all-news")}
          style={btnStyle}
        >
          <span style={{ fontWeight: 600 }}>View All News</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08, boxShadow: "0 4px 24px #51ffb844" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/users")}
          style={btnStyle}
        >
          <span style={{ fontWeight: 600 }}>Manage Users</span>
        </motion.button>
      </div>
    </div>
  );
}

const btnStyle = {
  minWidth: 180,
  height: 70,
  fontSize: "1.2rem",
  border: "none",
  borderRadius: 20,
  background: "linear-gradient(90deg, #5AD1FF 0%, #446DFF 100%)",
  color: "#fff",
  margin: "0 10px",
  cursor: "pointer",
  boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
  transition: "all 0.22s cubic-bezier(.43,1.37,.62,1.2)",
  outline: "none"
};
