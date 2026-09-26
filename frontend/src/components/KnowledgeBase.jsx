import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const KnowledgeBase = () => {
  const { token } = useAuth();
  const [kbList, setKbList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [selectedFile, setSelectedFile] = useState(null);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ title: "", description: "" });
    setSelectedFile(null);
    setShowModal(true);
  };

  const openEditModal = (kb) => {
    setIsEditing(true);
    setCurrentId(kb.id);
    setFormData({ title: kb.title, description: kb.description || "" });
    setSelectedFile(null); // Optional to change file
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ title: "", description: "" });
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);

    if (selectedFile) {
      data.append("file", selectedFile);
    }

    try {
      let url = "http://localhost:5000/api/knowledge";
      let method = "POST";

      if (isEditing) {
        url = `http://localhost:5000/api/knowledge/${currentId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          // Jangan set Content-Type, biarkan browser yang atur boundary untuk FormData
        },
        body: data,
      });

      if (res.ok) {
        alert(`Knowledge base berhasil ${isEditing ? "diperbarui" : "ditambahkan"}!`);
        closeModal();
        fetchKnowledgeBase();
      } else {
        const errData = await res.json();
        alert(`Gagal menyimpan: ${errData.message}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan saat menyimpan data.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus knowledge base ini?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/knowledge/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("Knowledge base berhasil dihapus!");
        fetchKnowledgeBase();
      } else {
        alert("Gagal menghapus knowledge base.");
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const filteredKbList = kbList.filter((kb) => {
    const titleMatch = kb.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = kb.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || descMatch;
  });

  return (
    <div>
      {/* Search & Tombol - Layout konsisten dengan IT Action */}
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
        <button
          onClick={openAddModal}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          + Tambah PDF
        </button>
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
                    }}
                  >
                    Buka PDF
                  </a>
                  <button
                    onClick={() => openEditModal(kb)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "500px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Knowledge Base" : "Tambah Knowledge Base"}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Judul</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", color: "black" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Deskripsi</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", color: "black" }}
                ></textarea>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                  File PDF <span style={{ fontWeight: "normal", fontSize: "0.85rem", color: "#6b7280" }}>(Maksimal 10MB)</span> {isEditing && <span style={{ fontWeight: "normal", fontSize: "0.85rem", color: "#6b7280" }}><br />(Biarkan kosong jika tidak ingin mengubah file)</span>}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required={!isEditing}
                  style={{ width: "100%", color: "black", marginTop: "4px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
