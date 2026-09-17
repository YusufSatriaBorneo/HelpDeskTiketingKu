const express = require("express");
const prisma = require("../prismaClient");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const ExcelJS = require("exceljs");
const router = express.Router();

// --- 1. HELPER: TRIGGER WEBHOOK N8N (NOMOR HP DEFAULT) ---
const triggerN8nWebhook = async (ticket) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("⚠️ N8N_WEBHOOK_URL tidak ditemukan di environment variables");
    return;
  }

  // UBAH NOMOR HP DEFAULT DI SINI (Gunakan format 0812xxx atau 62812xxx)
  const DEFAULT_PHONE = "6285249709221";

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketNumber: ticket.ticketNumber || `HD-${ticket.id}`,
        userName: ticket.createdBy?.name || "User",
        phone: DEFAULT_PHONE, // Nomor HP dikunci ke nomor default
        subject: ticket.title,
        status: ticket.status,
        notes: ticket.notes || "Tidak ada catatan",
      }),
    });
    console.log(
      `✅ Webhook n8n berhasil dipanggil ke nomor ${DEFAULT_PHONE} untuk tiket: ${ticket.ticketNumber || ticket.id}`,
    );
  } catch (err) {
    console.error("❌ Gagal memanggil Webhook n8n:", err.message);
  }
};

// --- 2. KONFIGURASI MULTER ---
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Hanya format PNG dan JPG yang diperbolehkan"));
    }
  },
});

// Middleware autentikasi untuk semua route di bawahnya
router.use(authenticateToken);

// --- 3. ROUTE POST (Buat Tiket) dan Tambahkan SLA ---
router.post(
  "/",
  authorizeRole(["USER"]),
  upload.single("attachment"),
  async (req, res) => {
    const { title, description, hostname, category, subCategory, phoneDir } =
      req.body;
    const attachmentUrl = req.file ? req.file.path : null;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    try {
      const currentYear = new Date().getFullYear().toString();

      const lastTicket = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: currentYear } },
        orderBy: { ticketNumber: "desc" },
      });

      let nextSequence = 1;
      if (lastTicket && lastTicket.ticketNumber) {
        const lastSequence = parseInt(lastTicket.ticketNumber.slice(4));
        nextSequence = lastSequence + 1;
      }

      const sequenceString = nextSequence.toString().padStart(4, "0");
      const newTicketNumber = `${currentYear}${sequenceString}`;

      // --- TAMBAHKAN LOGIKA SLA 5 MENIT DI SINI ---
      const createdAt = new Date();
      const slaMinutesLimit = 5; // Batas SLA = 5 Menit
      // Hitung batas waktu SLA (waktu saat ini + 5 menit)
      const slaTargetDate = new Date(
        createdAt.getTime() + slaMinutesLimit * 60000,
      );

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: newTicketNumber,
          title,
          description,
          phoneDir,
          hostname,
          category,
          subCategory,
          attachmentUrl,
          createdById: req.user.id,
          createdAt: createdAt, // Simpan waktu pembuatan secara eksplisit
          slaMinutes: slaMinutesLimit, // Simpan durasi 5 untuk kebutuhan route Resolve/Update
          slaTarget: slaTargetDate, // Simpan tanggal target (misal: jam 10:05) untuk ditampilkan di Frontend
          isSlaBreached: false, // Default belum breached
        },
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res
        .status(500)
        .json({ message: "Error creating ticket", error: error.message });
    }
  },
);

// --- 4. ROUTE GET TICKETS (Termasuk Relation History) ---
router.get("/", async (req, res) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "User autentikasi tidak valid" });
    }

    let tickets = [];
    const userRole = req.user.role.toUpperCase();

    if (userRole === "USER") {
      tickets = await prisma.ticket.findMany({
        where: { createdById: req.user.id },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          histories: {
            include: { updatedBy: { select: { name: true, role: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === "HELPDESK") {
      tickets = await prisma.ticket.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          histories: {
            include: { updatedBy: { select: { name: true, role: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === "ENGINEER") {
      tickets = await prisma.ticket.findMany({
        where: { assignedToId: req.user.id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          histories: {
            include: { updatedBy: { select: { name: true, role: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
    res.json(tickets);
  } catch (error) {
    console.error("❌ ERROR DETAILED GET TICKETS:", error);
    res
      .status(500)
      .json({ message: "Error fetching tickets", error: error.message });
  }
});

// --- 5. ROUTE GET ENGINEERS (Bisa Akses Helpdesk & Engineer) ---
router.get(
  "/engineers",
  authorizeRole(["HELPDESK", "ENGINEER"]),
  async (req, res) => {
    try {
      const engineers = await prisma.user.findMany({
        where: { role: "ENGINEER" },
        select: { id: true, name: true, email: true },
      });
      res.json(engineers);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching engineers", error: error.message });
    }
  },
);

// --- 5b. ROUTE GET EXPORT EXCEL (Laporan Tiket) ---
router.get(
  "/export",
  authorizeRole(["HELPDESK"]), // Sesuaikan jika Engineer/Admin juga boleh akses
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "startDate dan endDate harus diisi" });
      }

      // Konversi string tanggal dari frontend ke format Date (Mulai 00:00:00 sampai 23:59:59)
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      // 1. Ambil data tiket yang RESOLVED sesuai rentang tanggal
      const tickets = await prisma.ticket.findMany({
        where: {
          status: "RESOLVED",
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          createdBy: { select: { email: true, name: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2. Inisialisasi Workbook dan Worksheet ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Tiket");

      // 3. Definisikan Kolom
      worksheet.columns = [
        { header: "No Tiket", key: "ticketNumber", width: 15 },
        { header: "Judul", key: "title", width: 30 },
        { header: "Kategori", key: "category", width: 20 },
        { header: "Sub Kategori", key: "subCategory", width: 25 },
        { header: "Hostname / IP", key: "hostname", width: 20 },
        { header: "No Telepon", key: "phoneDir", width: 18 },
        { header: "Creator", key: "creator", width: 25 },
        { header: "Assigned To", key: "engineer", width: 20 },
        { header: "SLA Terpenuhi", key: "isSlaBreached", width: 25 },
        { header: "Waktu Dibuat", key: "createdAt", width: 25 },
        { header: "Waktu Diselesaikan", key: "resolvedAt", width: 25 },
        { header: "Catatan Akhir", key: "notes", width: 40 },
      ];

      // Styling agar Header tebal (Bold)
      worksheet.getRow(1).font = { bold: true };

      // 4. Masukkan data ke baris Excel
      tickets.forEach((ticket) => {
        worksheet.addRow({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          category: ticket.category || "-",
          subCategory: ticket.subCategory || "-",
          hostname: ticket.hostname || "-",
          phoneDir: ticket.phoneDir || "-",
          creator: ticket.createdBy?.email || "-",
          engineer: ticket.assignedTo?.name || "-",
          isSlaBreached: ticket.isSlaBreached
            ? "X TIDAK (Melebihi Waktu)"
            : "V YA (Tepat Waktu)",
          createdAt: ticket.createdAt
            ? ticket.createdAt.toLocaleString("id-ID")
            : "-",
          resolvedAt: ticket.resolvedAt
            ? ticket.resolvedAt.toLocaleString("id-ID")
            : "-",
          notes: ticket.notes || "-",
        });
      });

      // 5. Set Headers agar file otomatis terunduh di browser
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Laporan_Tiket_${startDate}_sd_${endDate}.xlsx`,
      );

      // 6. Generate dan Kirim File
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ ERROR EXPORT EXCEL:", error);
      res
        .status(500)
        .json({ message: "Error exporting tickets", error: error.message });
    }
  },
);

// --- 6. ROUTE PUT ASSIGN TICKET (Helpdesk Assign & Pencatatan History) ---
router.put("/:id/assign", authorizeRole(["HELPDESK"]), async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { assignedToId } = req.body;

  if (!assignedToId) {
    return res.status(400).json({ message: "Engineer ID is required" });
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: parseInt(assignedToId),
        status: "ASSIGNED",
        histories: {
          create: {
            status: "ASSIGNED",
            note: "Tiket di-assign ke engineer",
            updatedById: req.user.id,
          },
        },
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        histories: { include: { updatedBy: { select: { name: true } } } },
      },
    });
    res.json(ticket);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error assigning ticket", error: error.message });
  }
});

// --- 7. ROUTE PUT RESOLVE (Engineer Resolve & Pencatatan History + UPDATE SLA) ---
router.put("/:id/resolve", authorizeRole(["ENGINEER"]), async (req, res) => {
  const ticketId = parseInt(req.params.id);

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.assignedToId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to resolve this ticket" });
    }

    // --- TAMBAHAN KALKULASI SLA UNTUK ROUTE RESOLVE ---
    const now = new Date();

    // PERBAIKAN 1: Start selalu dari waktu tiket DIBUAT (createdAt)
    const start = ticket.createdAt;
    const totalDurationKotorMin = Math.floor((now - new Date(start)) / 60000);

    // PERBAIKAN 2: Jika tiket statusnya sedang HOLD saat di-resolve, hitung waktu HOLD terakhirnya
    let currentHoldMin = 0;
    if (ticket.status === "HOLD" && ticket.pausedAt) {
      currentHoldMin = Math.floor((now - new Date(ticket.pausedAt)) / 60000);
    }

    const finalTotalPausedMin = (ticket.totalPausedMin || 0) + currentHoldMin;
    const actualWorkMin = totalDurationKotorMin - finalTotalPausedMin;
    const isSlaBreached = actualWorkMin > (ticket.slaMinutes || 0);
    // ---------------------------------------------------

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        isSlaBreached: isSlaBreached,
        actualWorkMin: actualWorkMin,
        workStartedAt: null,
        pausedAt: null, // Pastikan pause di-reset
        totalPausedMin: finalTotalPausedMin, // Simpan total pause yang baru
        histories: {
          create: {
            status: "RESOLVED",
            note: "Tiket diselesaikan",
            updatedById: req.user.id,
          },
        },
      },
      include: {
        createdBy: true,
        histories: { include: { updatedBy: { select: { name: true } } } },
      },
    });

    // Panggil Webhook n8n
    triggerN8nWebhook(updatedTicket);

    res.json(updatedTicket);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resolving ticket", error: error.message });
  }
});

// --- 8. ROUTE PUT UPDATE (Priority, Notes, Re-Assign, Status, & History) ---
router.put(
  "/:id/update",
  authorizeRole(["HELPDESK", "ENGINEER"]),
  async (req, res) => {
    const ticketId = parseInt(req.params.id);
    const { priority, notes, assignedToId, engineerId, status } = req.body;

    try {
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });
      if (!existingTicket)
        return res.status(404).json({ message: "Ticket not found" });

      const finalStatus = status !== undefined ? status : existingTicket.status;
      const updateData = {};

      if (priority !== undefined) updateData.priority = priority;
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined) updateData.status = status;

      // ====================================================
      // LOGIKA SLA, PAUSE, RESUME, DAN PENGERJAAN
      // ====================================================
      const oldStatus = existingTicket.status;
      if (status !== undefined && status !== oldStatus) {
        const now = new Date();

        // 1. KETIKA TIKET DI-HOLD (PAUSE)
        if (status === "HOLD" && oldStatus !== "HOLD") {
          updateData.pausedAt = now;
        }

        // 2. KETIKA TIKET LEPAS DARI HOLD (Bisa ke IN_PROGRESS atau langsung RESOLVED)
        else if (oldStatus === "HOLD" && status !== "HOLD") {
          if (existingTicket.pausedAt) {
            const pausedDurationMinutes = Math.floor(
              (now - new Date(existingTicket.pausedAt)) / 60000,
            );
            updateData.totalPausedMin =
              (existingTicket.totalPausedMin || 0) + pausedDurationMinutes;
            updateData.pausedAt = null; // Reset pausedAt karena tiket aktif kembali
          }
        }

        // 3. KETIKA TIKET MULAI DIKERJAKAN (IN PROGRESS)
        if (status === "IN_PROGRESS") {
          // Hanya catat waktu mulai jika tiket belum pernah dikerjakan (workStartedAt masih kosong)
          if (!existingTicket.workStartedAt) {
            updateData.workStartedAt = now;
          }
        }

        // 4. KETIKA TIKET SELESAI (RESOLVED)
        if (status === "RESOLVED") {
          const now = new Date();
          updateData.resolvedAt = now;

          // PERBAIKAN: Selalu gunakan createdAt sebagai titik awal SLA
          const start = existingTicket.createdAt;

          // Hitung durasi total dari awal sampai akhir dalam menit
          const totalDurationKotorMin = Math.floor(
            (now - new Date(start)) / 60000,
          );

          // Ambil total menit pause
          const finalTotalPausedMin =
            updateData.totalPausedMin !== undefined
              ? updateData.totalPausedMin
              : existingTicket.totalPausedMin || 0;

          // Hitung durasi kerja murni (total durasi kotor dikurangi total pause)
          const actualWorkMin = totalDurationKotorMin - finalTotalPausedMin;

          // Tentukan apakah SLA terpenuhi (false) atau lewat (true)
          updateData.isSlaBreached =
            actualWorkMin > (existingTicket.slaMinutes || 0);
          updateData.actualWorkMin = actualWorkMin;

          updateData.workStartedAt = null; // Reset waktu kerja
          updateData.pausedAt = null; // Reset waktu pause
        }
      }
      // ====================================================

      // Perbaikan: Tidak mengubah assignedToId menjadi null jika form kosong/tidak diubah
      const targetEngineerId =
        assignedToId !== undefined ? assignedToId : engineerId;
      if (targetEngineerId !== undefined) {
        if (targetEngineerId !== "" && targetEngineerId !== null) {
          updateData.assignedToId = parseInt(targetEngineerId);
        }
      }

      // Catat History Update ke tabel TicketHistory otomatis menggunakan fitur Prisma Nested Writes
      updateData.histories = {
        create: {
          status: finalStatus,
          note: notes || `Status diubah menjadi ${finalStatus}`,
          updatedById: req.user.id,
        },
      };

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          createdBy: true,
          assignedTo: { select: { id: true, name: true, email: true } },
          histories: { include: { updatedBy: { select: { name: true } } } },
        },
      });

      // Trigger Webhook
      if (status === "RESOLVED" || status === "HOLD" || status === "PENDING") {
        triggerN8nWebhook(updatedTicket);
      }

      res.json(updatedTicket);
    } catch (error) {
      console.error("DETAIL ERROR UPDATE TICKET:", error);
      res
        .status(500)
        .json({ message: "Error updating ticket", error: error.message });
    }
  },
);

module.exports = router;
