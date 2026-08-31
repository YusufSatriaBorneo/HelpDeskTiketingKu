import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const { token, user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Yakin ingin mengubah role menjadi ${newRole}?`))
      return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (response.ok) {
        alert("Role berhasil diubah!");
        fetchUsers(); // Refresh data
      } else {
        const errData = await response.json();
        alert(`Gagal: ${errData.message}`);
      }
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  if (currentUser?.role !== "HELPDESK") {
    return (
      <div style={{ padding: "2rem" }}>Akses Ditolak. Khusus Helpdesk.</div>
    );
  }

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <h2>Manajemen Akun</h2>
      <div className="card" style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            textAlign: "left",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #eee" }}>
              <th style={{ padding: "12px" }}>Nama</th>
              <th style={{ padding: "12px" }}>Email</th>
              <th style={{ padding: "12px" }}>Role Saat Ini</th>
              <th style={{ padding: "12px" }}>Aksi (Ubah Role)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{u.name}</td>
                <td style={{ padding: "12px" }}>{u.email}</td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      backgroundColor:
                        u.role === "HELPDESK"
                          ? "#e3f2fd"
                          : u.role === "ENGINEER"
                            ? "#fff3e0"
                            : "#f5f5f5",
                      color:
                        u.role === "HELPDESK"
                          ? "#1976d2"
                          : u.role === "ENGINEER"
                            ? "#f57c00"
                            : "#616161",
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === currentUser.id} // Cegah akun mengubah role-nya sendiri
                    style={{ padding: "6px", borderRadius: "4px" }}
                  >
                    <option value="USER">USER</option>
                    <option value="ENGINEER">ENGINEER</option>
                    <option value="HELPDESK">HELPDESK</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
