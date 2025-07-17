const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getUserDetail } = require("../handlers/shared/getMemberDetail");

console.log("Loading userData routes...");

// Route untuk user melihat profile sendiri (authenticated)
router.get("/profile", authenticate, async (req, res) => {
  // Set context dan parameter untuk handler universal
  req.params.id = req.authenticatedUser.id;
  req.query.context = "profile";
  req.query.includeTransactions = req.query.includeTransactions || "true";

  await getUserDetail(req, res);
});

// Route untuk akses data user by ID/NRP
router.get("/:id", async (req, res) => {
  req.query.context = "general";
  await getUserDetail(req, res);
});

console.log("userData routes configured");

module.exports = router;
