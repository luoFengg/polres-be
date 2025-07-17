const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");
const { Role } = require("../../generated/prisma");

const addMember = async (req, res) => {
  try {
    const { nrp, nama, jabatan, password, role = Role.anggota } = req.body;

    // Validasi input
    if (!nrp || !nama || !jabatan || !password) {
      return res.status(400).json({
        success: false,
        message: "NRP, nama, jabatan, dan password wajib diisi",
      });
    }

    // Validasi role menggunakan enum
    const validRoles = Object.values(Role); // ['admin', 'anggota']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role harus salah satu dari: ${validRoles.join(", ")}`,
      });
    }

    // Cek apakah NRP sudah ada
    const existingUser = await prisma.anggota.findUnique({
      where: { nrp: nrp },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "NRP sudah terdaftar",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Buat anggota baru
    const newUser = await prisma.anggota.create({
      data: {
        nrp,
        nama,
        jabatan,
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        nrp: true,
        nama: true,
        jabatan: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Anggota berhasil ditambahkan",
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { addMember };
