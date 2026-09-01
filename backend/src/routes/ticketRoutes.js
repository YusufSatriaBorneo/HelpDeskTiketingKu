const express = require("express");
const prisma = require("../prismaClient");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
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

// --- 3. ROUTE POST (Buat Tiket) ---
router.post(
  "/",
  authorizeRole(["USER"]),
  upload.single("attachment"),
  async (req, res) => {
    const { title, description, hostname, category, subCategory } = req.body;
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

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: newTicketNumber,
          title,
          description,
          hostname,
          category,
          subCategory,
          attachmentUrl,
          createdById: req.user.id,
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

// --- 7. ROUTE PUT RESOLVE (Engineer Resolve & Pencatatan History) ---
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

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "RESOLVED",
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

      // Perbaikan: Tidak mengubah assignedToId menjadi null jika form kosong/tidak diubah
      const targetEngineerId =
        assignedToId !== undefined ? assignedToId : engineerId;
      if (targetEngineerId !== undefined) {
        if (targetEngineerId !== "" && targetEngineerId !== null) {
          updateData.assignedToId = parseInt(targetEngineerId);
        }
      }

      updateData.histories = {
        create: {
          status: finalStatus,
          note: notes || "Melakukan update tiket",
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

      if (status === "RESOLVED") {
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
