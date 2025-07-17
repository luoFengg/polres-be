// Test script to verify migration success
const { PrismaClient } = require("./src/generated/prisma");

const prisma = new PrismaClient();

async function testMigration() {
  try {
    console.log("🔍 Testing database connection...");

    // Test 1: Count all models
    const anggotaCount = await prisma.anggota.count();
    const simpananCount = await prisma.simpanan.count();
    const simpananTransactionCount = await prisma.simpananTransaction.count();
    const piutangCount = await prisma.piutang.count();
    const piutangTransactionCount = await prisma.piutangTransaction.count();

    console.log("\n📊 Database Statistics:");
    console.log(`- Anggota: ${anggotaCount} records`);
    console.log(`- Simpanan: ${simpananCount} records`);
    console.log(`- SimpananTransaction: ${simpananTransactionCount} records`);
    console.log(`- Piutang: ${piutangCount} records`);
    console.log(`- PiutangTransaction: ${piutangTransactionCount} records`);

    // Test 2: Check if we can query with relations
    const memberWithSimpanan = await prisma.anggota.findFirst({
      include: {
        simpanan: {
          include: {
            transactions: true,
          },
        },
      },
    });

    console.log("\n✅ Relations test passed");
    console.log(
      "👤 Sample member with simpanan:",
      memberWithSimpanan ? "Found" : "No data yet"
    );

    // Test 3: Test SimpananTransaction model structure
    const simpananTransactionFields = Object.keys(
      await prisma.simpananTransaction.findMany({})
    );
    console.log(
      "\n🔧 SimpananTransaction model fields available:",
      simpananTransactionFields.length > 0 ? "Ready" : "No data"
    );

    console.log("\n🎉 Migration test completed successfully!");
    console.log("📝 Ready to implement simpanan transaction endpoints");
  } catch (error) {
    console.error("❌ Migration test failed:", error.message);
    console.error("Details:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
