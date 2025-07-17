const prisma = require("../../config/prisma");

const updateSimpananAnggota = async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      type, // "setoran", "penarikan", "koreksi"
      category, // "pokok", "wajib", "sukarela", "thr"
      amount,
      description,
    } = req.body;

    // Validasi input
    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type, category, dan amount wajib diisi",
      });
    }

    // Validasi type
    const validTypes = ["setoran", "penarikan", "koreksi"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type harus salah satu dari: setoran, penarikan, koreksi",
      });
    }

    // Validasi category
    const validCategories = ["pokok", "wajib", "sukarela", "thr"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Category harus salah satu dari: pokok, wajib, sukarela, thr",
      });
    }

    // Validasi amount berdasarkan type
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount harus berupa angka positif",
      });
    }

    // Validasi khusus: simpanan pokok tidak bisa ditarik
    if (type === "penarikan" && category === "pokok") {
      return res.status(400).json({
        success: false,
        message: "Simpanan pokok tidak dapat ditarik",
      });
    }

    // Cek apakah member exists
    const member = await prisma.anggota.findUnique({
      where: { id: memberId },
      select: { id: true, nama: true, nrp: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Anggota tidak ditemukan",
      });
    }

    // Get atau create simpanan untuk member
    let simpanan = await prisma.simpanan.findUnique({
      where: { anggotaId: memberId },
    });

    if (!simpanan) {
      simpanan = await prisma.simpanan.create({
        data: {
          anggotaId: memberId,
          simpananPokok: 0,
          simpananWajib: 0,
          simpananSukarela: 0,
          tabunganHariRaya: 0,
          lastUpdatedBy: req.authenticatedUser.id,
        },
      });
    }

    // Mapping category ke field database
    const categoryFieldMap = {
      pokok: "simpananPokok",
      wajib: "simpananWajib",
      sukarela: "simpananSukarela",
      thr: "tabunganHariRaya",
    };

    const fieldName = categoryFieldMap[category];
    const currentBalance = parseFloat(simpanan[fieldName]);

    // Hitung balance baru berdasarkan type
    let newBalanceAmount;
    let transactionAmount;

    switch (type) {
      case "setoran":
        newBalanceAmount = currentBalance + numAmount;
        transactionAmount = numAmount; // Positif
        break;
      case "penarikan":
        if (currentBalance < numAmount) {
          return res.status(400).json({
            success: false,
            message: `Saldo ${category} tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString(
              "id-ID"
            )}`,
          });
        }
        newBalanceAmount = currentBalance - numAmount;
        transactionAmount = -numAmount; // Negatif
        break;
      case "koreksi":
        // Koreksi bisa positif atau negatif
        newBalanceAmount = currentBalance + numAmount;
        transactionAmount = numAmount;

        // Pastikan hasil koreksi tidak negatif
        if (newBalanceAmount < 0) {
          return res.status(400).json({
            success: false,
            message: `Koreksi akan menghasilkan saldo negatif. Saldo saat ini: Rp ${currentBalance.toLocaleString(
              "id-ID"
            )}`,
          });
        }
        break;
    }

    // Gunakan transaction untuk atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const transaction = await tx.simpananTransaction.create({
        data: {
          anggotaId: memberId,
          type: type,
          category: category,
          amount: transactionAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalanceAmount,
          description:
            description ||
            `${type} ${category} sebesar Rp ${numAmount.toLocaleString(
              "id-ID"
            )}`,
          processedBy: req.authenticatedUser.id,
          isSystemGenerated: false,
        },
      });

      // 2. Update simpanan balance
      const updateData = {
        [fieldName]: newBalanceAmount,
        lastUpdatedBy: req.authenticatedUser.id,
      };

      const updatedSimpanan = await tx.simpanan.update({
        where: { anggotaId: memberId },
        data: updateData,
        include: {
          anggota: {
            select: { nama: true, nrp: true },
          },
          updatedBy: {
            select: { nama: true, nrp: true },
          },
        },
      });

      return { transaction, updatedSimpanan };
    });

    // Format response
    const newBalance = {
      simpananPokok: result.updatedSimpanan.simpananPokok.toString(),
      simpananWajib: result.updatedSimpanan.simpananWajib.toString(),
      simpananSukarela: result.updatedSimpanan.simpananSukarela.toString(),
      tabunganHariRaya: result.updatedSimpanan.tabunganHariRaya.toString(),
    };

    const totalSimpanan = Object.values(newBalance).reduce(
      (sum, val) => sum + parseFloat(val),
      0
    );

    return res.status(201).json({
      success: true,
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } simpanan ${category} berhasil`,
      data: {
        transaction: {
          id: result.transaction.id,
          anggotaId: result.transaction.anggotaId,
          type: result.transaction.type,
          category: result.transaction.category,
          amount: result.transaction.amount.toString(),
          balanceBefore: result.transaction.balanceBefore.toString(),
          balanceAfter: result.transaction.balanceAfter.toString(),
          description: result.transaction.description,
          processedBy: req.authenticatedUser.id,
          createdAt: result.transaction.createdAt,
        },
        member: {
          nama: result.updatedSimpanan.anggota.nama,
          nrp: result.updatedSimpanan.anggota.nrp,
        },
        newBalance: {
          ...newBalance,
          totalSimpanan: totalSimpanan.toString(),
        },
      },
    });
  } catch (error) {
    console.error("Error in updateSimpananAnggota:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses transaksi simpanan",
      error: error.message,
    });
  }
};

// Handler untuk mendapatkan history transaksi simpanan
const getSimpananHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      page = 1,
      limit = 10,
      category,
      type,
      startDate,
      endDate,
    } = req.query;

    // Cek apakah member exists
    const member = await prisma.anggota.findUnique({
      where: { id: memberId },
      select: { id: true, nama: true, nrp: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Anggota tidak ditemukan",
      });
    }

    // Build filter conditions
    const whereConditions = {
      anggotaId: memberId,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (type) {
      whereConditions.type = type;
    }

    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        whereConditions.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereConditions.createdAt.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get transactions with pagination
    const [transactions, totalRecords] = await Promise.all([
      prisma.simpananTransaction.findMany({
        where: whereConditions,
        include: {
          processor: {
            select: { nama: true, nrp: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.simpananTransaction.count({
        where: whereConditions,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      success: true,
      data: {
        member: {
          nama: member.nama,
          nrp: member.nrp,
        },
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          category: t.category,
          amount: t.amount.toString(),
          balanceBefore: t.balanceBefore.toString(),
          balanceAfter: t.balanceAfter.toString(),
          description: t.description,
          processedBy: t.processor
            ? {
                nama: t.processor.nama,
                nrp: t.processor.nrp,
              }
            : null,
          isSystemGenerated: t.isSystemGenerated,
          createdAt: t.createdAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRecords,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getSimpananHistory:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil history simpanan",
      error: error.message,
    });
  }
};

// Handler untuk mendapatkan summary simpanan semua anggota (admin only)
const getAllMembersSimpananSummary = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (search) {
      whereConditions.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { nrp: { contains: search, mode: "insensitive" } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get members with simpanan
    const [members, totalRecords] = await Promise.all([
      prisma.anggota.findMany({
        where: whereConditions,
        include: {
          simpanan: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { nama: "asc" },
        skip,
        take: limitNum,
      }),
      prisma.anggota.count({
        where: whereConditions,
      }),
    ]);

    // Calculate summary totals
    const summary = await prisma.simpanan.aggregate({
      _sum: {
        simpananPokok: true,
        simpananWajib: true,
        simpananSukarela: true,
        tabunganHariRaya: true,
      },
    });

    const totalPages = Math.ceil(totalRecords / limitNum);

    const membersData = members.map((member) => {
      const simpanan = member.simpanan;
      const totalSimpanan = simpanan
        ? parseFloat(simpanan.simpananPokok) +
          parseFloat(simpanan.simpananWajib) +
          parseFloat(simpanan.simpananSukarela) +
          parseFloat(simpanan.tabunganHariRaya)
        : 0;

      return {
        id: member.id,
        nrp: member.nrp,
        nama: member.nama,
        jabatan: member.jabatan,
        simpanan: simpanan
          ? {
              simpananPokok: simpanan.simpananPokok.toString(),
              simpananWajib: simpanan.simpananWajib.toString(),
              simpananSukarela: simpanan.simpananSukarela.toString(),
              tabunganHariRaya: simpanan.tabunganHariRaya.toString(),
              totalSimpanan: totalSimpanan.toString(),
            }
          : {
              simpananPokok: "0",
              simpananWajib: "0",
              simpananSukarela: "0",
              tabunganHariRaya: "0",
              totalSimpanan: "0",
            },
        lastActivity:
          simpanan?.transactions?.[0]?.createdAt || simpanan?.createdAt || null,
      };
    });

    // Calculate grand totals
    const grandTotal = {
      totalMembers: totalRecords,
      totalSimpananPokok: (summary._sum.simpananPokok || 0).toString(),
      totalSimpananWajib: (summary._sum.simpananWajib || 0).toString(),
      totalSimpananSukarela: (summary._sum.simpananSukarela || 0).toString(),
      totalTabunganHariRaya: (summary._sum.tabunganHariRaya || 0).toString(),
      grandTotal: (
        parseFloat(summary._sum.simpananPokok || 0) +
        parseFloat(summary._sum.simpananWajib || 0) +
        parseFloat(summary._sum.simpananSukarela || 0) +
        parseFloat(summary._sum.tabunganHariRaya || 0)
      ).toString(),
    };

    res.json({
      success: true,
      data: {
        members: membersData,
        summary: grandTotal,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRecords,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllMembersSimpananSummary:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil summary simpanan",
      error: error.message,
    });
  }
};

module.exports = {
  updateSimpananAnggota,
  getSimpananHistory,
  getAllMembersSimpananSummary,
};
