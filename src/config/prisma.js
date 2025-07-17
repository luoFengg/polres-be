const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Optional: untuk logging
  errorFormat: "pretty", // Format error yang lebih readable
});

// Graceful shutdown untuk berbagai event
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
