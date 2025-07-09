import { useEffect, useState } from "react";
import axios from "axios";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get JWT token from localStorage
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("https://lawgikalai-auth-api.onrender.com/api/auth/all-users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUsers(res.data.users || res.data); // adapt based on your API response
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading users...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>All Users</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc" }}>Name</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Identifier</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>User ID</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td style={{ borderBottom: "1px solid #eee" }}>{user.fullName}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{user.identifier}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{user._id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
