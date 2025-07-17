const jwt = require("jsonwebtoken");

// Contoh: blacklist di-memory (untuk production, lebih baik pakai Redis/DB)
const tokenBlacklist =
  global.tokenBlacklist || (global.tokenBlacklist = new Set());

// Fungsi untuk menambah token ke blacklist
function addToBlacklist(token) {
  tokenBlacklist.add(token);
}

// Fungsi untuk cek apakah token sudah di-blacklist
function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

const authenticate = (req, res, next) => {
  try {
    // Ambil token dari cookie atau Authorization header
    let token = req.cookies.token || req.headers.authorization;

    // Jika dari Authorization header, hapus 'Bearer ' prefix
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    console.log("Token:", token); // Debug log
    console.log("All cookies:", req.cookies); // Debug log

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Cek apakah token ada di blacklist
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been blacklisted",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.authenticatedUser = decoded;

    next(); // Lanjutkan ke middleware/handler berikutnya
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  authenticate,
  addToBlacklist,
  isTokenBlacklisted,
};
