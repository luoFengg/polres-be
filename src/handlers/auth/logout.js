const { addToBlacklist } = require("../../middleware/auth");

const logout = async (req, res) => {
  try {
    // Ambil token dari cookie atau Authorization header
    let token = req.cookies.token || req.headers.authorization;

    // Jika dari Authorization header, hapus 'Bearer ' prefix
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No token to logout",
      });
    }

    // Tambahkan token ke blacklist
    addToBlacklist(token);

    // Clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    console.log("User logged out, token blacklisted"); // Debug log

    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { logout };
