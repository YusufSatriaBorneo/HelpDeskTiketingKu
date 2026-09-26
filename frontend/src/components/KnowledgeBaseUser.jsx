import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const KnowledgeBaseUser = () => {
  const { token } = useAuth();
  const [kbList, setKbList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchKnowledgeBase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/knowledge", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKbList(data);
      } else {
        setError("Gagal mengambil data knowledge base.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredKbList = kbList.filter((kb) => {
    const titleMatch = kb.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = kb.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || descMatch;
  });

  return (
    <div>
      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Cari judul atau deskripsi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px", padding: "0.75rem" }}
        />
      </div>

      {isLoading && <p>Memuat data knowledge base...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!isLoading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {filteredKbList.length === 0 ? (
            <p>Belum ada data knowledge base atau pencarian tidak ditemukan.</p>
          ) : (
            filteredKbList.map((kb) => (
              <div
                key={kb.id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0" }}>{kb.title}</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  {kb.description}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <a
                    href={`http://localhost:5000${kb.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#10b981",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    📄 Buka PDF
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseUser;
