const { authenticate } = require("./auth");
const { Role } = require("../generated/prisma");

// Middleware untuk memastikan user adalah admin
const requireAdmin = (req, res, next) => {
  // Pastikan user sudah ter-authenticate dulu
  if (!req.authenticatedUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Cek apakah role adalah admin menggunakan enum
  if (req.authenticatedUser.role !== Role.admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required",
    });
  }

  next(); // User adalah admin, lanjutkan
};

// Middleware gabungan: authenticate + requireAdmin
const requireAdminAuth = (req, res, next) => {
  // Jalankan authenticate
  authenticate(req, res, (err) => {
    if (err) return next(err);

    // Baru jalankan requireAdmin
    requireAdmin(req, res, next);
  });
};

module.exports = {
  requireAdmin,
  requireAdminAuth,
};
