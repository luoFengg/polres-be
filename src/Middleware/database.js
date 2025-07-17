const prisma = require("../config/prisma");

// Middleware untuk handle database connection gracefully
const databaseMiddleware = async (req, res, next) => {
  try {
    // Test koneksi database sebelum setiap request (optional, untuk debugging)
    if (process.env.NODE_ENV === "development") {
      await prisma.$connect();
    }
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Service unavailable",
    });
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};

// Listen for termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Utility untuk mengecek role database saat ini
const checkDatabaseRole = async () => {
  try {
    // Query untuk mendapatkan role saat ini
    const result = await prisma.$queryRaw`
      SELECT 
        current_user as current_user,
        session_user as session_user,
        current_setting('role') as current_role,
        current_setting('is_superuser') as is_superuser,
        inet_client_addr() as client_ip,
        inet_server_addr() as server_ip
    `;

    console.log("=== DATABASE CONNECTION INFO ===");
    console.log("Current User:", result[0]?.current_user);
    console.log("Session User:", result[0]?.session_user);
    console.log("Current Role:", result[0]?.current_role);
    console.log("Is Superuser:", result[0]?.is_superuser);
    console.log("Client IP:", result[0]?.client_ip);
    console.log("Server IP:", result[0]?.server_ip);

    // Deteksi Supabase role berdasarkan user
    let supabaseRole = "unknown";
    const currentUser = result[0]?.current_user;

    if (currentUser === "postgres") {
      supabaseRole = "service_role";
    } else if (currentUser === "anon") {
      supabaseRole = "anon";
    } else if (currentUser?.startsWith("auth")) {
      supabaseRole = "authenticated";
    }

    console.log("🔍 Detected Supabase Role:", supabaseRole);
    console.log("=====================================");

    return {
      currentUser: result[0]?.current_user,
      role: result[0]?.current_role,
      supabaseRole: supabaseRole,
      isServiceRole: supabaseRole === "service_role",
    };
  } catch (error) {
    console.error("Error checking database role:", error);
    return null;
  }
};

module.exports = {
  databaseMiddleware,
  gracefulShutdown,
  checkDatabaseRole,
};
