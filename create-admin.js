const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("./src/generated/prisma");

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Generate hash untuk password
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Creating admin with password:", password);
    console.log("Hash:", hashedPassword);

    // Hapus admin lama jika ada
    await prisma.anggota.deleteMany({
      where: { nrp: "12345" },
    });

    // Buat admin baru
    const admin = await prisma.anggota.create({
      data: {
        nrp: "12345",
        nama: "Admin Koperasi",
        jabatan: "Administrator",
        password: hashedPassword,
        role: Role.admin,
      },
    });

    console.log("Admin created successfully:", {
      id: admin.id,
      nrp: admin.nrp,
      nama: admin.nama,
      role: admin.role,
    });

    // Test verification
    const isValid = await bcrypt.compare(password, admin.password);
    console.log("Password verification test:", isValid);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
