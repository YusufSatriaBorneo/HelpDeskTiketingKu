const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// --- 1. KONFIGURASI MULTER (HARUS DI ATAS) ---
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Hanya format PNG dan JPG yang diperbolehkan'));
    }
  }
});

// Middleware autentikasi untuk semua route di bawahnya
router.use(authenticateToken);

// --- 2. ROUTE POST (Menggunakan 'upload' yang sudah dideklarasikan di atas) ---
router.post('/', authorizeRole(['USER']), upload.single('attachment'), async (req, res) => {
  // Perhatikan: ipAddress sudah dihapus dari sini
  const { title, description, hostname, category, subCategory } = req.body;
  const attachmentUrl = req.file ? req.file.path : null;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  try {
    // Logika Pembuatan Nomor Tiket Otomatis
    const currentYear = new Date().getFullYear().toString();

    const lastTicket = await prisma.ticket.findFirst({
      where: { ticketNumber: { startsWith: currentYear } },
      orderBy: { ticketNumber: 'desc' },
    });

    let nextSequence = 1;
    if (lastTicket && lastTicket.ticketNumber) {
      const lastSequence = parseInt(lastTicket.ticketNumber.slice(4));
      nextSequence = lastSequence + 1;
    }

    const sequenceString = nextSequence.toString().padStart(4, '0');
    const newTicketNumber = `${currentYear}${sequenceString}`;

    // Simpan ke Database (beserta data baru)
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: newTicketNumber,
        title,
        description,
        hostname,
        category,
        subCategory,
        attachmentUrl,
        createdById: req.user.id
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ message: 'Error creating ticket', error: error.message });
  }
});

// --- 3. ROUTE LAINNYA ---

// Get tickets based on role
router.get('/', async (req, res) => {
  try {
    let tickets = [];
    if (req.user.role === 'USER') {
      tickets = await prisma.ticket.findMany({
        where: { createdById: req.user.id },
        include: { assignedTo: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else if (req.user.role === 'HELPDESK') {
      tickets = await prisma.ticket.findMany({
        include: {
          createdBy: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (req.user.role === 'ENGINEER') {
      tickets = await prisma.ticket.findMany({
        where: { assignedToId: req.user.id },
        include: { createdBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Get all engineers
router.get('/engineers', authorizeRole(['HELPDESK']), async (req, res) => {
  try {
    const engineers = await prisma.user.findMany({
      where: { role: 'ENGINEER' },
      select: { id: true, name: true, email: true }
    });
    res.json(engineers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching engineers', error: error.message });
  }
});

// Assign ticket
router.put('/:id/assign', authorizeRole(['HELPDESK']), async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { assignedToId } = req.body;

  if (!assignedToId) {
    return res.status(400).json({ message: 'Engineer ID is required' });
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: parseInt(assignedToId),
        status: 'ASSIGNED'
      },
      include: { assignedTo: { select: { name: true } } }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning ticket', error: error.message });
  }
});

// Resolve ticket
router.put('/:id/resolve', authorizeRole(['ENGINEER']), async (req, res) => {
  const ticketId = parseInt(req.params.id);

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to resolve this ticket' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED' }
    });
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Error resolving ticket', error: error.message });
  }
});

// Route Update Tiket (Priority, Notes, AssignTo, Status)
router.put('/:id/update', authorizeRole(['HELPDESK', 'ENGINEER']), async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { priority, notes, assignedToId, status } = req.body;

  try {
    // 1. Siapkan objek kosong
    const updateData = {};

    // 2. HANYA masukkan data ke objek jika datanya dikirim (tidak undefined)
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    // Khusus untuk AssignedTo, kita cek apakah properti ini dikirim dari Frontend
    if (assignedToId !== undefined) {
      // Jika dikirim dan ada isinya, ubah ke angka. Jika 'Pilih Engineer' (kosong), jadikan null.
      updateData.assignedToId = assignedToId ? parseInt(assignedToId) : null;
    }

    // 3. Simpan ke database
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    res.json(updatedTicket);
  } catch (error) {
    // 4. Jika masih error, ini akan mencetak penyebab aslinya di terminal backend!
    console.error("DETAIL ERROR UPDATE TICKET:", error);
    res.status(500).json({ message: 'Error updating ticket', error: error.message });
  }
});

module.exports = router;