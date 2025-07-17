const express = require("express");
const router = express.Router();
const { login } = require("../handlers/auth/login");
const { logout } = require("../handlers/auth/logout");
const { authenticate } = require("../middleware/auth");

// Route untuk authentication
router.post("/login", login);
router.post("/logout", authenticate, logout);

module.exports = router;
