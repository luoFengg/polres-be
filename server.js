const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

// Import Prisma client untuk test koneksi
const prisma = require("./src/config/prisma");
const { checkDatabaseRole } = require("./src/middleware/database");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// routes
console.log("Loading memberDataRoutes...");
const memberDataRoutes = require("./src/routes/member");
console.log("memberDataRoutes loaded successfully");

console.log("Loading userRoutes...");
const userRoutes = require("./src/routes/user");
console.log("userRoutes loaded successfully");

console.log("Loading authRoutes...");
const authRoutes = require("./src/routes/auth");
console.log("authRoutes loaded successfully");

console.log("Loading adminRoutes...");
const adminRoutes = require("./src/routes/admin");
console.log("adminRoutes loaded successfully");

app.use("/member", memberDataRoutes);
console.log("Route /user registered");

app.use("/auth", authRoutes);
console.log("Route /auth registered");

app.use("/admin", adminRoutes);
console.log("Route /admin registered");

app.use("/user", userRoutes);
console.log("Route /user registered");

// Test route sederhana
app.get("/test", (req, res) => {
  res.json({ message: "Server working", timestamp: new Date() });
});

// Test route untuk database connection
app.get("/test/db", async (req, res) => {
  try {
    // Test koneksi
    await prisma.$connect();

    // Get role info
    const roleInfo = await checkDatabaseRole();

    // Test query
    const result =
      await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`;

    // Test tabel
    const anggotaCount = await prisma.anggota.count();
    const piutangCount = await prisma.piutang.count();
    const simpananCount = await prisma.simpanan.count();

    res.json({
      success: true,
      message: "Database connection successful",
      data: {
        roleInfo: roleInfo,
        currentTime: result[0]?.current_time,
        databaseVersion: result[0]?.db_version,
        tableStats: {
          anggota: anggotaCount,
          piutang: piutangCount,
          simpanan: simpananCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
      code: error.code,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(process.env.PORT || 9000, async () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});
