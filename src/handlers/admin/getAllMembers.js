const prisma = require("../../config/prisma");
const { Role } = require("../../generated/prisma");

const getAllMembers = async (req, res) => {
  try {
    const { search } = req.query;

    // Build where clause
    let whereClause = {
      role: Role.anggota, // Selalu filter hanya anggota, bukan admin
    };

    // Filter berdasarkan pencarian NRP atau nama
    if (search) {
      whereClause.OR = [
        { nrp: { contains: search, mode: "insensitive" } },
        { nama: { contains: search, mode: "insensitive" } },
      ];
    }

    const [members, totalCount] = await Promise.all([
      prisma.anggota.findMany({
        where: whereClause,
        select: {
          id: true,
          nrp: true,
          nama: true,
          jabatan: true,
          role: true,
          createdAt: true,
          piutang: {
            where: { status: "active" },
            select: { id: true },
          },
        },
        orderBy: [{ nama: "asc" }],

        // TIDAK ADA skip/take = ambil SEMUA data
      }),
      prisma.anggota.count({ where: whereClause }),
    ]);

    // Transform data untuk response yang lebih user-friendly
    const transformedMembers = members.map((member) => ({
      id: member.id,
      nrp: member.nrp,
      nama: member.nama,
      jabatan: member.jabatan,
      role: member.role,
      createdAt: member.createdAt,
      activeLoanCount: member.piutang.length,
      hasActiveLoan: member.piutang.length > 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Data semua anggota berhasil diambil",
      data: {
        members: transformedMembers,
        total: totalCount,
        filters: {
          search: search || null,
          role: Role.anggota, // Selalu anggota
        },
      },
    });
  } catch (error) {
    console.error("Get all members error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { getAllMembers };
