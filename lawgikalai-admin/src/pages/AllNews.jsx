import { useEffect, useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export default function AllNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/news/all`)
      .then((res) => {
        setNews(res.data.news || res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={centerStyle}>
        <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
        <style>{spinnerCSS}</style>
      </div>
    );

  return (
    <div style={fullScreenStyle}>
      <h2 style={headingStyle}>All News</h2>
      {news.length === 0 ? (
        <p style={{ color: "#aaa" }}>No news available.</p>
      ) : (
        <div style={newsGridStyle}>
          {news.map((item) => (
            <div key={item._id} style={newsCardStyle}>
              <h3 style={{ color: "#6ad7f9", marginBottom: 12 }}>{item.title}</h3>
              <div style={{ color: "#e2eafc", marginBottom: 16, minHeight: 44 }}>{item.content}</div>
              
              {/* Show image if available, use absolute URL if needed */}
              {item.image && (
                <img
                  src={
                    item.image.startsWith("http")
                      ? item.image
                      : `${API_URL}${item.image.startsWith("/") ? "" : "/"}${item.image}`
                  }
                  alt="news"
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    marginBottom: 14,
                    maxHeight: 180,
                    objectFit: "cover",
                  }}
                />
              )}
              
              <div style={{ fontSize: 12, color: "#a5b9df", textAlign: "right" }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const fullScreenStyle = {
  minHeight: "calc(100vh - 110px)",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "linear-gradient(120deg,#1f232b,#21213b 100%)",
  padding: "40px 5vw 0 5vw",
};
const headingStyle = {
  color: "#fff",
  fontSize: "2.2rem",
  fontWeight: 700,
  marginBottom: 32,
};
const newsGridStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 28,
  justifyContent: "center",
  alignItems: "stretch",
};
const newsCardStyle = {
  background: "rgba(40,56,104,0.97)",
  borderRadius: 14,
  padding: "24px 20px 16px 20px",
  boxShadow: "0 4px 18px #2348b544",
  display: "flex",
  flexDirection: "column",
  minHeight: 180,
};
const centerStyle = {
  minHeight: "80vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const spinnerCSS = `
.lds-ring {
  display: inline-block;
  position: relative;
  width: 60px;
  height: 60px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 44px;
  height: 44px;
  margin: 8px;
  border: 5px solid #4afcda;
  border-radius: 50%;
  animation: lds-ring 1.3s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #4afcda transparent transparent transparent;
}
.lds-ring div:nth-child(1) { animation-delay: -0.45s; }
.lds-ring div:nth-child(2) { animation-delay: -0.3s; }
.lds-ring div:nth-child(3) { animation-delay: -0.15s; }
@keyframes lds-ring {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
`;

