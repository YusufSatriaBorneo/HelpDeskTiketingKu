import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SLATimer from "../components/SLATimer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// IMPORT RECHARTS UNTUK GRAFIK
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const HelpDeskDashboard = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [showLogs, setShowLogs] = useState({});

  // STATE: Mengontrol tab aktif di sidebar (Default sekarang adalah 'home')
  const [activeTab, setActiveTab] = useState("home");

  const fetchData = async () => {
    try {
      const [ticketsRes, engineersRes] = await Promise.all([
        fetch("http://localhost:5000/api/tickets", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/tickets/engineers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (engineersRes.ok) setEngineers(await engineersRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // FUNGSI: Menangani tombol Simpan Perubahan (Update & Assign Tiket)
  const handleUpdateTicket = async (e, ticketId) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const assignedToVal = formData.get("assignedToId");
    let statusVal = formData.get("status");

    // LOGIKA AUTO-ASSIGN
    if (assignedToVal !== "" && statusVal === "OPEN") {
      statusVal = "ASSIGNED";
    }

    const updateData = {
      status: statusVal,
      priority: formData.get("priority"),
      notes: formData.get("notes"),
      assignedToId: assignedToVal === "" ? null : assignedToVal,
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
        fetchData();
      } else {
        const errorData = await res.json();
        alert(
          `Gagal memperbarui tiket: ${errorData.message || "Terjadi kesalahan"}`,
        );
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("id-ID", options);
  };

  // LOGIKA FILTERING TIKET TERBARU
  const actionTickets = tickets.filter(
    (ticket) => !ticket.assignedTo && ticket.status !== "RESOLVED",
  );
  const historyTickets = tickets.filter(
    (ticket) => ticket.assignedTo || ticket.status === "RESOLVED",
  );

  // MENGHITUNG TOTAL TIKET UNTUK KARTU HOME
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

  // Filter tiket berdasarkan Tab Aktif, Nomor Tiket/Judul, dan Rentang Tanggal
  const filteredTickets = currentTabTickets.filter((ticket) => {
    // 1. Pencarian Teks
    const searchLower = (searchQuery || "").toLowerCase().trim();
    const matchesSearch = searchLower
      ? (ticket.ticketNo &&
          String(ticket.ticketNo).toLowerCase().includes(searchLower)) ||
        (ticket.title &&
          String(ticket.title).toLowerCase().includes(searchLower))
      : true;

    // 2. Pencarian Rentang Tanggal (Start Date s/d End Date)
    let matchesDate = true;
    if (ticket.createdAt && (startDate || endDate)) {
      const tDate = new Date(ticket.createdAt);
      tDate.setHours(0, 0, 0, 0); // Reset jam agar akurat membandingkan hari

      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (tDate < sDate) matchesDate = false; // Jika tiket dibuat sebelum Start Date
      }

      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(0, 0, 0, 0);
        if (tDate > eDate) matchesDate = false; // Jika tiket dibuat setelah End Date
      }
    }

    return matchesSearch && matchesDate;
  });

  // ================= DATA PROCESSING UNTUK LEADERBOARD & CHART =================

  // Helper untuk mengecek apakah sebuah tanggal adalah hari ini
  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 1. DATA LEADERBOARD: Engineer dengan tiket RESOLVED hari ini
  const getLeaderboardData = () => {
    // Gunakan updatedAt (jika ada) untuk mengecek kapan tiket terakhir diubah/diselesaikan
    const resolvedToday = tickets.filter(
      (t) => t.status === "RESOLVED" && isToday(t.updatedAt || t.createdAt),
    );
    const counts = {};

    resolvedToday.forEach((t) => {
      if (t.assignedTo) {
        const engName = t.assignedTo.name;
        counts[engName] = (counts[engName] || 0) + 1;
      }
    });

    // Ubah ke array dan urutkan dari yang terbanyak
    return Object.keys(counts)
      .map((name) => ({ name, count: counts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Ambil Top 5 saja
  };

  // 2. DATA CHART: Tiket yang sedang dikerjakan (OPEN/ASSIGNED/HOLD/PENDING) per Engineer
  const getChartData = () => {
    const unfinished = tickets.filter(
      (t) =>
        (t.status === "OPEN" ||
          t.status === "ASSIGNED" ||
          t.status === "HOLD" ||
          t.status === "PENDING") &&
        t.assignedTo, // Hanya hitung yang sudah ada engineernya
    );

    const counts = {};
    unfinished.forEach((t) => {
      const engName = t.assignedTo.name;
      counts[engName] = (counts[engName] || 0) + 1;
    });

    return Object.keys(counts).map((name) => ({ name, total: counts[name] }));
  };

  const leaderboardData = getLeaderboardData();
  const chartData = getChartData();

  // HELPER STYLING SIDEBAR
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

  // Fungsi ini diletakkan SEBELUM return (...)
  const handleQuickStatus = async (ticketId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/tickets/${ticketId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (response.ok) {
        // Panggil fungsi fetch tiket Anda lagi agar data di layar terbarui
        // fetchTickets();
      } else {
        const errorData = await response.json();
        alert(`Gagal update status: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error Quick Status:", error);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleExportData = () => {
    if (filteredTickets.length === 0) {
      alert("Tidak ada data untuk di-export.");
      return;
    }

    // 1. Buat Header CSV
    const headers = [
      "Ticket No,Title,Status,Priority,Category,Hostname,Created At,Engineer",
    ];

    // 2. Map data ke format CSV
    const csvData = filteredTickets.map((t) => {
      // Escape tanda kutip ganda jika ada koma di dalam teks
      return `"${t.ticketNo || ""}", "${t.title || ""}", "${t.status}", "${t.priority || ""}", "${t.category || ""}", "${t.hostname || ""}", "${new Date(t.createdAt).toLocaleDateString()}", "${t.assignedTo?.name || "-"}"`;
    });

    // 3. Gabungkan dan buat file Blob
    const csvString = headers.concat(csvData).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    let dateLabel = "All";
    if (startDate && endDate) dateLabel = `${startDate}_to_${endDate}`;
    else if (startDate) dateLabel = `From_${startDate}`;
    else if (endDate) dateLabel = `Until_${endDate}`;

    // 4. Trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `History_Tickets_${dateLabel}.csv`);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", minHeight: "100vh" }}
    >
      {/* SIDEBAR HELPDESK */}
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
        <div style={{ padding: "0 10px 0 28px", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
            Menu Helpdesk
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>🏠</span>
              <span>Home</span>
            </div>
          </button>
          <button
            style={getMenuItemStyle(activeTab === "it-action")}
            onClick={() => setActiveTab("it-action")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>📜</span>
              <span>History</span>
            </div>
            <span style={getBadgeStyle(activeTab === "history")}>
              {historyTickets.length}
            </span>
          </button>
          {user?.role === "HELPDESK" && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              style={{ textDecoration: "none" }} // Menghilangkan garis bawah default link
            >
              {/* Styling inline disesuaikan agar mirip dengan menu lainnya */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 18px 12px 28px",
                  color: "var(--text-primary)",
                  fontWeight: "500",
                }}
              >
                <span>👥</span>
                <span>Manajemen Akun</span>
              </div>
            </NavLink>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "2rem 3rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 8px 0" }}>HelpDesk Dashboard</h2>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            {activeTab === "home"
              ? "Ringkasan keseluruhan status tiket di Helpdesk saat ini."
              : activeTab === "it-action"
                ? "Overview tiket masuk yang memerlukan delegasi atau penanganan awal."
                : "Riwayat tiket yang sudah di-assign ke engineer atau sudah diselesaikan (Resolved)."}
          </p>
        </div>

        {/* ================= TAMPILAN TAB HOME ================= */}
        {activeTab === "home" && (
          <div>
            {/* CARDS OVERVIEW */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "1.5rem",
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
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    margin: "0.5rem 0 0 0",
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
                  padding: "1.5rem",
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
                  Hold / Pending
                </h3>
                <p
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    margin: "0.5rem 0 0 0",
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
                  padding: "1.5rem",
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
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    margin: "0.5rem 0 0 0",
                    color: "#14b8a6",
                  }}
                >
                  {completedCount}
                </p>
              </div>
            </div>

            {/* LEADERBOARD & CHART SECTION */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {/* Leaderboard Card */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    margin: "0 0 1rem 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  🏆 Top Engineers Hari Ini
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    marginBottom: "1.5rem",
                  }}
                >
                  Berdasarkan tiket yang diselesaikan (Resolved) hari ini. Akan
                  otomatis ter-reset besok.
                </p>

                {leaderboardData.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {leaderboardData.map((eng, index) => (
                      <li
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 15px",
                          marginBottom: "8px",
                          backgroundColor:
                            index === 0
                              ? "rgba(255, 215, 0, 0.15)"
                              : "rgba(128,128,128,0.05)",
                          borderRadius: "8px",
                          borderLeft:
                            index === 0
                              ? "4px solid #ffd700"
                              : "4px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontWeight: index === 0 ? "bold" : "normal",
                          }}
                        >
                          <span>
                            {index === 0
                              ? "🥇"
                              : index === 1
                                ? "🥈"
                                : index === 2
                                  ? "🥉"
                                  : `${index + 1}.`}
                          </span>
                          <span>{eng.name}</span>
                        </div>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "var(--text-primary)",
                          }}
                        >
                          {eng.count} Tiket
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 0",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    Belum ada tiket yang diselesaikan hari ini. 🚀
                  </div>
                )}
              </div>

              {/* Bar Chart Card */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    margin: "0 0 1rem 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  📊 Beban Kerja Engineer
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    marginBottom: "1.5rem",
                  }}
                >
                  Total tiket yang belum selesai (Open/Assigned/Hold) di
                  masing-masing engineer.
                </p>

                {chartData.length > 0 ? (
                  <div style={{ width: "100%", height: "280px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#444"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.1)" }}
                          contentStyle={{
                            backgroundColor: "#222",
                            borderColor: "#444",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="total"
                          name="Total Tiket Aktif"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 0",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    Semua tiket sudah diselesaikan! 🎉
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAMPILAN TAB IT-ACTION & HISTORY ================= */}
        {activeTab !== "home" && (
          <>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "2rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* Input Pencarian Teks */}
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Cari Nomor Tiket (misal: 20260001) atau Judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: "250px", padding: "0.75rem" }}
              />
              {/* Input Rentang Tanggal (Single Calendar) */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    color: "#4b5563",
                  }}
                >
                  Filter Tanggal:
                </span>
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    setDateRange(update);
                  }}
                  isClearable={true}
                  placeholderText="Pilih rentang tanggal..."
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                />
              </div>

              {/* Tombol Export (Hanya muncul di tab History) */}
              {activeTab === "history" && (
                <button
                  onClick={handleExportData}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#10b981",
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
                  📥 Export Data
                </button>
              )}
            </div>

            <div className="grid-2">
              {filteredTickets.map((ticket) => {
                const isReadOnly = activeTab === "history";

                return (
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
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          color: "white",
                          backgroundColor:
                            ticket.status === "RESOLVED"
                              ? "#14b8a6"
                              : ticket.status === "IN_PROGRESS"
                                ? "#0d6efd"
                                : ticket.status === "ASSIGNED"
                                  ? "#8b5cf6"
                                  : ticket.status === "OPEN"
                                    ? "#3b82f6"
                                    : ticket.status === "HOLD" ||
                                        ticket.status === "PENDING"
                                      ? "#f59e0b"
                                      : "#6b7280",
                        }}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: "rgba(128, 128, 128, 0.15)",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "10px",
                        fontSize: "0.9rem",
                      }}
                    >
                      <strong>Kategori:</strong> {ticket.category || "-"} (
                      {ticket.subCategory || "-"})<br />
                      <strong>Hostname / IP Adress:</strong> <br />
                      {ticket.hostname || "-"}
                      <strong>Phone Number:</strong> {ticket.phoneDir || "-"}
                    </div>

                    <p
                      style={{
                        color: "var(--text-secondary)",
                        marginBottom: "1rem",
                      }}
                    >
                      {ticket.description}
                    </p>

                    {ticket.attachmentUrl && (
                      <div style={{ marginBottom: "1rem" }}>
                        <a
                          href={`http://localhost:5000/${ticket.attachmentUrl.replace(/\\/g, "/")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#4da6ff",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          📎 Lihat Lampiran
                        </a>
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "1.5rem",
                      }}
                    >
                      Creator: {ticket.createdBy?.name || "User"} (
                      {ticket.createdBy?.email})<br />
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                    {/* ========================================================= */}
                    {/* 📍 KOMPONEN SLA TIMER DENGAN PENGECEKAN STATUS */}
                    {/* ========================================================= */}
                    {ticket.status !== "RESOLVED" && (
                      <div
                        style={{
                          marginTop: "1rem",
                          paddingTop: "1rem",
                          borderTop: "1px dashed var(--border-color)",
                        }}
                      >
                        <SLATimer ticket={ticket} />
                      </div>
                    )}

                    <hr
                      style={{
                        border: "1px solid var(--border-color)",
                        marginBottom: "1rem",
                      }}
                    />

                    {ticket.status !== "RESOLVED" ? (
                      <>
                        {/* --- TOMBOL QUICK ACTION IN PROGRESS / HOLD --- */}
                        {!isReadOnly && (
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginBottom: "15px",
                            }}
                          >
                            {(ticket.status === "OPEN" ||
                              ticket.status === "ASSIGNED" ||
                              ticket.status === "HOLD") && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatus(ticket.id, "IN_PROGRESS")
                                }
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  backgroundColor: "#0d6efd",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  transition: "0.2s",
                                }}
                              >
                                ▶ Mulai / Resume (In Progress)
                              </button>
                            )}
                            {ticket.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatus(ticket.id, "HOLD")
                                }
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  backgroundColor: "#f59e0b",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  transition: "0.2s",
                                }}
                              >
                                ⏸ Pause Pekerjaan (Hold)
                              </button>
                            )}
                          </div>
                        )}
                        {/* ---------------------------------------------- */}

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
                              }}
                            >
                              Priority:
                            </label>
                            <select
                              name="priority"
                              defaultValue={ticket.priority || "Standard"}
                              disabled={isReadOnly}
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "rgba(51, 51, 51, 1)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="Standard">Standard</option>
                              <option value="Urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Notes Form IT:
                            </label>
                            <textarea
                              name="notes"
                              defaultValue={ticket.notes}
                              disabled={isReadOnly}
                              className="form-control"
                              rows="2"
                              placeholder="Tambahkan catatan tindak lanjut di sini..."
                              style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "#333",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                resize: "vertical",
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? "not-allowed" : "text",
                              }}
                            ></textarea>
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Assign to:
                            </label>
                            <select
                              name="assignedToId"
                              defaultValue={
                                ticket.assignedTo?.id ||
                                ticket.assignedToId ||
                                ""
                              }
                              disabled={isReadOnly}
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "rgba(51, 51, 51, 1)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="">
                                Pilih Engineer (Biarkan kosong jika belum)
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
                              }}
                            >
                              Status Tiket:
                            </label>
                            <select
                              name="status"
                              defaultValue={ticket.status}
                              disabled={isReadOnly}
                              className="form-control"
                              style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "rgba(51, 51, 51, 1)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="OPEN">Open</option>
                              <option value="ASSIGNED">Assigned</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="HOLD">Hold</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </div>
                          {!isReadOnly ? (
                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ marginTop: "10px", width: "100%" }}
                            >
                              Simpan Perubahan
                            </button>
                          ) : (
                            <div
                              style={{
                                marginTop: "10px",
                                textAlign: "center",
                                fontSize: "0.85rem",
                                color: "#f59e0b",
                                fontStyle: "italic",
                              }}
                            >
                              Tiket sedang ditangani oleh engineer.
                            </div>
                          )}
                        </form>
                      </>
                    ) : (
                      /* --- TAMPILAN JIKA TIKET RESOLVED (EVALUASI SLA) --- */
                      <div
                        style={{
                          textAlign: "center",
                          padding: "1rem",
                          backgroundColor: ticket.isSlaBreached
                            ? "rgba(220, 53, 69, 0.1)"
                            : "rgba(39, 174, 96, 0.1)",
                          color: ticket.isSlaBreached ? "#ef4444" : "#22c55e",
                          border: `1px solid ${ticket.isSlaBreached ? "#ef4444" : "#22c55e"}`,
                          borderRadius: "5px",
                        }}
                      >
                        <h5
                          style={{ margin: "0 0 10px 0", fontWeight: "bold" }}
                        >
                          {ticket.isSlaBreached
                            ? "❌ SLA Tidak Terpenuhi (Melebihi Waktu)"
                            : "✅ SLA Terpenuhi (Tepat Waktu)"}
                        </h5>
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
                        {ticket.notes && (
                          <p
                            style={{
                              marginTop: "10px",
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                              fontWeight: "normal",
                              textAlign: "left",
                            }}
                          >
                            <strong>Catatan Akhir:</strong> {ticket.notes}
                          </p>
                        )}
                      </div>
                    )}
                    {/* --- FITUR LOG HISTORY --- */}
                    <button
                      type="button"
                      onClick={() => toggleLogs(ticket.id)}
                      style={{
                        marginTop: "15px",
                        backgroundColor: "transparent",
                        color: "#3b82f6",
                        border: "1px solid #3b82f6",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s",
                      }}
                    >
                      {showLogs[ticket.id]
                        ? "🔼 Sembunyikan Log History"
                        : "🔽 Lihat Log History"}
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
                                    {log.updatedBy?.name || "Sistem / Helpdesk"}
                                  </strong>
                                  <span
                                    style={{
                                      color: "var(--text-secondary)",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {formatDateTime(log.createdAt)}
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

                    {ticket.assignedTo && (
                      <div
                        style={{
                          backgroundColor: "rgba(128, 128, 128, 0.08)",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          marginTop: "12px",
                          fontSize: "0.85rem",
                        }}
                      >
                        Assigned to:{" "}
                        <strong>
                          {ticket.assignedTo.name || ticket.assignedTo}
                        </strong>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredTickets.length === 0 && (
                <p
                  style={{
                    gridColumn: "1 / -1",
                    color: "var(--text-secondary)",
                  }}
                >
                  Tidak ada tiket yang ditemukan.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HelpDeskDashboard;
