import { useEffect, useState } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setLoading(false);

    axios
      .get(`${API_URL}/api/auth/all-users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUsers(res.data.users || res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);


  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #23243a 70%, #232323 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          padding: "40px 36px",
          borderRadius: 18,
          boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
          background: "#22273b",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: 32, fontWeight: 700 }}>
          All Users
        </h2>
        {loading ? (
          <p style={{ color: "#ccc" }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ color: "#ccc" }}>No users found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#232943",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      color: "#90caf9",
                      padding: 12,
                      borderBottom: "2px solid #32374b",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 17,
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      color: "#90caf9",
                      padding: 12,
                      borderBottom: "2px solid #32374b",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 17,
                    }}
                  >
                    Identifier
                  </th>
                  <th
                    style={{
                      color: "#90caf9",
                      padding: 12,
                      borderBottom: "2px solid #32374b",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 17,
                    }}
                  >
                    User ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td
                      style={{
                        color: "#fff",
                        padding: 10,
                        borderBottom: "1px solid #232943",
                        fontWeight: 500,
                        fontSize: 15,
                      }}
                    >
                      {user.fullName}
                    </td>
                    <td
                      style={{
                        color: "#fff",
                        padding: 10,
                        borderBottom: "1px solid #232943",
                        fontSize: 15,
                      }}
                    >
                      {user.identifier}
                    </td>
                    <td
                      style={{
                        color: "#7aa4ec",
                        padding: 10,
                        borderBottom: "1px solid #232943",
                        fontSize: 14,
                      }}
                    >
                      {user._id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
