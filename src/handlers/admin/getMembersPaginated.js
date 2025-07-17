const prisma = require("../../config/prisma");
const { paginate } = require("../../utils/pagination");
const { Role } = require("../../generated/prisma");

const getMembersPaginated = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

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

    // Use pagination helper
    const result = await paginate(prisma.anggota, {
      page,
      limit,
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
    });

    // Transform data untuk response yang lebih user-friendly
    const transformedMembers = result.data.map((member) => ({
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
      message: "Data anggota dengan pagination berhasil diambil",
      data: {
        members: transformedMembers,
        pagination: result.pagination,
        filters: {
          search: search || null,
          role: Role.anggota, // Always anggota
        },
      },
    });
  } catch (error) {
    console.error("Get members paginated error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { getMembersPaginated };
