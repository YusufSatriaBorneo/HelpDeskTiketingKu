const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");

// Setup multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/knowledge");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "KB-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Batas maksimal 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Hanya file PDF yang diperbolehkan!"), false);
    }
  },
});

// Middleware helper untuk menangani error multer agar pesannya lebih rapi
const uploadPdf = (req, res, next) => {
  const uploadSingle = upload.single("file");
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Ukuran file terlalu besar. Maksimal 10MB." });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.use(authenticateToken);

// GET all knowledge base items
router.get("/", authorizeRole(["ENGINEER", "HELPDESK"]), async (req, res) => {
  try {
    const data = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching knowledge base", error: error.message });
  }
});

// POST new knowledge base item
router.post("/", authorizeRole(["ENGINEER"]), uploadPdf, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "File PDF wajib diunggah" });
    }

    const fileUrl = `/uploads/knowledge/${req.file.filename}`;

    const newKb = await prisma.knowledgeBase.create({
      data: {
        title,
        description,
        fileUrl,
      },
    });

    res.status(201).json({ message: "Knowledge base berhasil ditambahkan", data: newKb });
  } catch (error) {
    res.status(500).json({ message: "Error creating knowledge base", error: error.message });
  }
});

// PUT (Edit) existing knowledge base item
router.put("/:id", authorizeRole(["ENGINEER"]), uploadPdf, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const existingKb = await prisma.knowledgeBase.findUnique({ where: { id: Number(id) } });
    if (!existingKb) {
      return res.status(404).json({ message: "Knowledge base tidak ditemukan" });
    }

    let fileUrl = existingKb.fileUrl;
    if (req.file) {
      // Hapus file lama
      const oldFilePath = path.join(__dirname, "../../", existingKb.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      fileUrl = `/uploads/knowledge/${req.file.filename}`;
    }

    const updatedKb = await prisma.knowledgeBase.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        fileUrl,
      },
    });

    res.json({ message: "Knowledge base berhasil diperbarui", data: updatedKb });
  } catch (error) {
    res.status(500).json({ message: "Error updating knowledge base", error: error.message });
  }
});

// DELETE knowledge base item
router.delete("/:id", authorizeRole(["ENGINEER"]), async (req, res) => {
  try {
    const { id } = req.params;
    const existingKb = await prisma.knowledgeBase.findUnique({ where: { id: Number(id) } });
    
    if (!existingKb) {
      return res.status(404).json({ message: "Knowledge base tidak ditemukan" });
    }

    // Hapus file fisik
    const filePath = path.join(__dirname, "../../", existingKb.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.knowledgeBase.delete({ where: { id: Number(id) } });
    res.json({ message: "Knowledge base berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting knowledge base", error: error.message });
  }
});

module.exports = router;
