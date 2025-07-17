const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");

const login = async (req, res) => {
  try {
    const { nrp, password } = req.body;

    // Validasi input
    if (!nrp || !password) {
      return res.status(400).json({
        success: false,
        message: "NRP dan password wajib diisi",
      });
    }

    // Cari user berdasarkan NRP
    console.log("Mencari user dengan NRP:", nrp); // Debug log

    const user = await prisma.anggota.findUnique({
      where: { nrp: nrp },
    });

    console.log("User ditemukan:", user ? "Ya" : "Tidak"); // Debug log
    console.log(
      "User data:",
      user
        ? { id: user.id, nrp: user.nrp, nama: user.nama, role: user.role }
        : "null"
    ); // Debug log

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "NRP atau password salah",
      });
    }

    // Verify password
    console.log("Password dari request:", password); // Debug log (HAPUS di production!)
    console.log(
      "Password hash dari DB:",
      user.password.substring(0, 20) + "..."
    ); // Debug log

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid); // Debug log

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "NRP atau password salah",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        nrp: user.nrp,
        nama: user.nama,
        role: user.role,
        jabatan: user.jabatan,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    });

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: {
          id: user.id,
          nrp: user.nrp,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { login };
