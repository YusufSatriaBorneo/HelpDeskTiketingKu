import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const EngineerDashboard = () => {
  const { token } = useAuth(); // logout tidak lagi dipanggil di sini
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk mengontrol toggle log history per tiket
  const [showLogs, setShowLogs] = useState({});

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      } else {
        setError("Gagal mengambil data tiket.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const usersArray = Array.isArray(data)
          ? data
          : data.users || data.data || [];

        const engineerList = usersArray.filter(
          (u) => u.role && u.role.toLowerCase() === "engineer",
        );
        setEngineers(engineerList);
      }
    } catch (err) {
      console.error("Gagal memuat list engineer", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchEngineers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUpdateTicket = async (e, ticketId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updateData = {
      status: formData.get("status"),
      notes: formData.get("notes"),
      engineerId: formData.get("engineerId"),
    };

    try {
      const res = await fetch(
        `http://localhost:5000/api/tickets/${ticketId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        },
      );

      if (res.ok) {
        alert("Data tiket berhasil diperbarui!");
        fetchTickets();
      } else {
        const errorData = await res.json();
        alert(`Gagal memperbarui tiket: ${errorData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const toggleLogs = (ticketId) => {
    setShowLogs((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString; // Jika bukan format date, return raw string
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Utility untuk memformat dan mencari nilai SLA dari API
  // Utility untuk memformat dan mencari nilai SLA dari API
  const getFormattedSLA = (ticket) => {
    // Sebaiknya prioritaskan property yang bertipe tanggal (deadline/due date)
    // sebelum property yang bertipe durasi angka (sla / slaTime)
    const rawSLA =
      ticket.slaDeadline ||
      ticket.sla_due_date ||
      ticket.dueDate ||
      ticket.slaTime ||
      ticket.sla;

    if (!rawSLA) return ""; // Default jika tidak ada nilai

    // 1. CEK ANGKA: Jika nilai rawSLA adalah angka murni atau string angka (misal: 60, "120")
    // Ini mencegah durasi angka diproses menjadi tanggal tahun 1970
    if (!isNaN(rawSLA) && rawSLA !== null && rawSLA !== "") {
      return `${rawSLA} Menit`; // Ubah "Menit" menjadi "Jam" jika backend mengirim satuan jam
    }

    // 2. CEK TANGGAL: Jika bukan angka, coba ubah menggunakan fungsi formatDate Anda
    const formattedDate = formatDate(rawSLA);
    if (formattedDate !== rawSLA) {
      return `${formattedDate} ${formatTime(rawSLA)}`;
    }

    // 3. TEKS BIASA: Kembalikan string asli jika bukan tanggal & bukan angka murni (misal: "2 Jam", "1 Hari")
    return rawSLA;
  };

  const actionTickets = tickets.filter((t) => t.status !== "RESOLVED");
  const historyTickets = tickets.filter((t) => t.status === "RESOLVED");

  const openCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "ASSIGNED",
  ).length;
  const holdCount = tickets.filter(
    (t) => t.status === "HOLD" || t.status === "PENDING",
  ).length;
  const completedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  const currentTabTickets =
    activeTab === "it-action"
      ? actionTickets
      : activeTab === "history"
        ? historyTickets
        : [];

  const filteredTickets = currentTabTickets.filter((ticket) => {
    const searchLower = searchQuery.toLowerCase();
    const ticketNo = ticket.ticketNumber
      ? ticket.ticketNumber.toLowerCase()
      : "";
    const titleLower = ticket.title ? ticket.title.toLowerCase() : "";
    return ticketNo.includes(searchLower) || titleLower.includes(searchLower);
  });

  const getMenuItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "12px 18px 12px 28px",
    borderRadius: "0 50px 50px 0",
    border: "none",
    cursor: "pointer",
    backgroundColor: isActive ? "#e8f0fe" : "transparent",
    color: isActive ? "#1a73e8" : "var(--text-primary)",
    fontWeight: isActive ? "600" : "500",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    textAlign: "left",
  });

  const getBadgeStyle = (isActive) => ({
    backgroundColor: isActive ? "#1a73e8" : "#e0e0e0",
    color: isActive ? "#fff" : "#555",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "700",
  });

  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", minHeight: "100vh" }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "280px",
          height: "100vh",
          position: "sticky",
          top: 0,
          padding: "24px 16px 24px 0",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          overflowY: "auto",
        }}
      >
        <div>
          <div style={{ padding: "0 10px 0 28px", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
              Menu Engineer
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
              }}
            >
              Manajemen Tiket IT
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              style={getMenuItemStyle(activeTab === "home")}
              onClick={() => setActiveTab("home")}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span>🏠</span>
                <span>Home</span>
              </div>
            </button>

            <button
              style={getMenuItemStyle(activeTab === "it-action")}
              onClick={() => setActiveTab("it-action")}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span>📥</span>
                <span>IT Action</span>
              </div>
              <span style={getBadgeStyle(activeTab === "it-action")}>
                {actionTickets.length}
              </span>
            </button>

            <button
              style={getMenuItemStyle(activeTab === "history")}
              onClick={() => setActiveTab("history")}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span>📜</span>
                <span>History</span>
              </div>
              <span style={getBadgeStyle(activeTab === "history")}>
                {historyTickets.length}
              </span>
            </button>
          </div>
        </div>
        {/* Tombol Logout Dihapus Sesuai Permintaan */}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "2rem 3rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2>Engineer Dashboard</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              {activeTab === "home"
                ? "Ringkasan total tiket yang menjadi tanggung jawab Anda."
                : activeTab === "it-action"
                  ? "Tickets assigned to you for resolution."
                  : "Riwayat tiket yang telah Anda selesaikan."}
            </p>
          </div>
          {/* Tombol Refresh Dihapus Sesuai Permintaan */}
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              borderRadius: "5px",
              marginBottom: "1.5rem",
            }}
          >
            {error}
          </div>
        )}

        {isLoading && !error ? (
          <p style={{ color: "var(--text-secondary)" }}>
            Mengambil data tiket...
          </p>
        ) : (
          <>
            {activeTab === "home" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    borderTop: "4px solid #3b82f6",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Open / Assigned
                  </h3>
                  <p
                    style={{
                      fontSize: "3rem",
                      fontWeight: "bold",
                      margin: "1rem 0 0 0",
                      color: "#3b82f6",
                    }}
                  >
                    {openCount}
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    borderTop: "4px solid #f59e0b",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Hold
                  </h3>
                  <p
                    style={{
                      fontSize: "3rem",
                      fontWeight: "bold",
                      margin: "1rem 0 0 0",
                      color: "#f59e0b",
                    }}
                  >
                    {holdCount}
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    borderTop: "4px solid #14b8a6",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Completed
                  </h3>
                  <p
                    style={{
                      fontSize: "3rem",
                      fontWeight: "bold",
                      margin: "1rem 0 0 0",
                      color: "#14b8a6",
                    }}
                  >
                    {completedCount}
                  </p>
                </div>
              </div>
            )}

            {activeTab !== "home" && (
              <>
                <div style={{ marginBottom: "2rem" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Cari Nomor Tiket atau Judul..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      padding: "0.75rem",
                    }}
                  />
                </div>

                <div className="grid-2">
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "1rem",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                              fontWeight: "bold",
                            }}
                          >
                            #{ticket.ticketNumber || "N/A"}
                          </span>
                          <h4 style={{ margin: "0.25rem 0 0 0" }}>
                            {ticket.title}
                          </h4>
                        </div>
                        <span
                          style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            color: "white",
                            backgroundColor:
                              ticket.status === "RESOLVED"
                                ? "#14b8a6"
                                : ticket.status === "OPEN" ||
                                    ticket.status === "ASSIGNED"
                                  ? "#3b82f6"
                                  : ticket.status === "HOLD"
                                    ? "#f59e0b"
                                    : "#6b7280",
                          }}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: "rgba(128, 128, 128, 0.08)",
                          padding: "12px",
                          borderRadius: "8px",
                          marginBottom: "15px",
                          fontSize: "0.9rem",
                          lineHeight: "1.6",
                          border: "1px solid rgba(128,128,128,0.15)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            <strong>Kategori:</strong> {ticket.category || "-"}{" "}
                            ({ticket.subCategory || "-"})
                          </span>
                          <span>
                            <strong>Priority:</strong>{" "}
                            <span
                              style={{
                                color:
                                  ticket.priority === "High"
                                    ? "#dc3545"
                                    : "inherit",
                              }}
                            >
                              {ticket.priority || "-"}
                            </span>
                          </span>
                        </div>
                        <div>
                          <strong>
                            Creator: {ticket.createdBy?.name || "User"} (
                            {ticket.createdBy?.email})<br />
                            Created:{" "}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                        <div>
                          <strong>Hostname:</strong> {ticket.hostname || "-"}
                        </div>
                        <div>
                          <strong>Assigned to:</strong>{" "}
                          {ticket.assignedTo?.name || "Belum di-assign"}
                        </div>
                        <div
                          style={{
                            marginTop: "4px",
                            paddingTop: "4px",
                            borderTop: "1px solid rgba(128,128,128,0.2)",
                          }}
                        >
                          <strong>SLA Target:</strong>
                          {" 5 Menit "}
                          <span style={{ color: "#d97706", fontWeight: "600" }}>
                            {getFormattedSLA(ticket)}
                          </span>
                        </div>
                      </div>

                      <p
                        style={{
                          color: "var(--text-secondary)",
                          marginBottom: "1rem",
                          fontSize: "0.95rem",
                        }}
                      >
                        {ticket.description}
                      </p>

                      <hr
                        style={{
                          border: "none",
                          borderTop: "1px dashed var(--border-color)",
                          marginBottom: "1rem",
                        }}
                      />

                      {ticket.status !== "RESOLVED" ? (
                        <form
                          onSubmit={(e) => handleUpdateTicket(e, ticket.id)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                marginBottom: "4px",
                                display: "block",
                              }}
                            >
                              Status Tiket:
                            </label>
                            <select
                              name="status"
                              defaultValue={ticket.status}
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                backgroundColor: "#333",
                                color: "white",
                                border: "1px solid #444",
                                borderRadius: "6px",
                              }}
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="ASSIGNED">Assigned</option>
                              <option value="HOLD">Hold</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                marginBottom: "4px",
                                display: "block",
                              }}
                            >
                              Re-Assign ke Engineer Lain (Opsional):
                            </label>
                            <select
                              name="engineerId"
                              defaultValue=""
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                backgroundColor: "#333",
                                color: "white",
                                border: "1px solid #444",
                                borderRadius: "6px",
                              }}
                            >
                              <option value="">
                                -- Tetap kerjakan sendiri --
                              </option>
                              {engineers.map((eng) => (
                                <option key={eng.id} value={eng.id}>
                                  {eng.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                marginBottom: "4px",
                                display: "block",
                              }}
                            >
                              Catatan Engineer:
                            </label>
                            <textarea
                              name="notes"
                              defaultValue={ticket.notes}
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                backgroundColor: "#333",
                                color: "white",
                                border: "1px solid #444",
                                borderRadius: "6px",
                                resize: "vertical",
                              }}
                              rows="3"
                              placeholder="Tambahkan catatan update atau resolusi tiket..."
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                              marginTop: "5px",
                              width: "100%",
                              cursor: "pointer",
                              padding: "10px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                            }}
                          >
                            Simpan Perubahan
                          </button>
                        </form>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "1rem",
                            backgroundColor: "rgba(39, 174, 96, 0.1)",
                            border: "1px solid rgba(39, 174, 96, 0.3)",
                            borderRadius: "6px",
                          }}
                        >
                          {/* INFORMASI SLA DI CARD TIKET ENGINEER */}
                          <div style={{ marginTop: "8px", fontSize: "0.9rem" }}>
                            {ticket.status === "RESOLVED" ||
                            ticket.status === "CLOSED" ? (
                              <span
                                style={{
                                  color: ticket.isSlaBreached
                                    ? "#dc2626"
                                    : "#059669",
                                  fontWeight: "bold",
                                }}
                              >
                                {ticket.isSlaBreached
                                  ? "❌ SLA Tidak Terpenuhi (Melebihi Waktu)"
                                  : "✅ SLA Terpenuhi"}
                              </span>
                            ) : (
                              <span
                                style={{ color: "#d97706", fontWeight: "bold" }}
                              >
                                ⏳ Sedang Berjalan
                              </span>
                            )}
                          </div>
                          {ticket.notes && (
                            <p
                              style={{
                                marginTop: "12px",
                                padding: "10px",
                                backgroundColor: "rgba(0,0,0,0.05)",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                textAlign: "left",
                                borderLeft: "3px solid #27ae60",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                Diselesaikan pada:{" "}
                                {ticket.resolvedAt
                                  ? new Date(ticket.resolvedAt).toLocaleString()
                                  : "-"}
                              </div>
                              <strong>Catatan Akhir:</strong> {ticket.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* --- TOMBOL TOGGLE & TABEL HISTORICAL LOG --- */}
                      <button
                        type="button"
                        onClick={() => toggleLogs(ticket.id)}
                        style={{
                          marginTop: "20px",
                          backgroundColor: showLogs[ticket.id]
                            ? "#e2e8f0"
                            : "transparent",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                      >
                        {showLogs[ticket.id]
                          ? "🔼 Tutup Log History"
                          : "🔽 Buka Log History"}
                      </button>

                      {showLogs[ticket.id] && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            backgroundColor: "rgba(128, 128, 128, 0.1)",
                            borderRadius: "6px",
                            border: "1px solid var(--border-color)",
                            maxHeight: "200px",
                            overflowY: "auto",
                          }}
                        >
                          <h5
                            style={{
                              margin: "0 0 10px 0",
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Riwayat Pembaruan:
                          </h5>
                          {ticket.histories && ticket.histories.length > 0 ? (
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                                fontSize: "0.8rem",
                                color: "var(--text-primary)",
                              }}
                            >
                              {ticket.histories.map((log, index) => (
                                <li
                                  key={log.id || index}
                                  style={{
                                    borderBottom: "1px solid #444",
                                    paddingBottom: "8px",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    <strong style={{ color: "#4da6ff" }}>
                                      {log.updatedBy?.name || "System"}
                                    </strong>
                                    <span
                                      style={{
                                        color: "var(--text-secondary)",
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      {/* Menggunakan formatDate dan formatTime agar tidak error di komponen Engineer */}
                                      {formatDate(log.createdAt)}{" "}
                                      {formatTime(log.createdAt)}
                                    </span>
                                  </div>
                                  <div style={{ marginBottom: "2px" }}>
                                    Status diubah menjadi:{" "}
                                    <strong>{log.status}</strong>
                                  </div>
                                  {log.note && (
                                    <div
                                      style={{
                                        fontStyle: "italic",
                                        color: "var(--text-secondary)",
                                        marginTop: "4px",
                                      }}
                                    >
                                      " {log.note} "
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                                fontStyle: "italic",
                              }}
                            >
                              Belum ada riwayat pembaruan untuk tiket ini.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredTickets.length === 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        color: "var(--text-secondary)",
                        textAlign: "center",
                        padding: "3rem",
                        backgroundColor: "rgba(0,0,0,0.02)",
                        borderRadius: "8px",
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "2rem",
                          display: "block",
                          marginBottom: "10px",
                        }}
                      >
                        📭
                      </span>
                      Tidak ada tiket di kategori ini.
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EngineerDashboard;
