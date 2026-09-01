const express = require("express");
const prisma = require("../prismaClient");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticateToken);

// Mengambil daftar semua akun (Untuk HELPDESK dan ENGINEER)
router.get("/", authorizeRole(["HELPDESK", "ENGINEER"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

// Mengubah role akun (Hanya untuk HELPDESK)
router.put("/:id/role", authorizeRole(["HELPDESK"]), async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;

  if (!["USER", "HELPDESK", "ENGINEER"].includes(role)) {
    return res.status(400).json({ message: "Role tidak valid" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating role", error: error.message });
  }
});

module.exports = router;
