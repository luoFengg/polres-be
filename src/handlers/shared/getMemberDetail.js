const prisma = require("../../config/prisma");

/**
 * Universal handler untuk mengambil detail member/user
 * Bisa digunakan untuk:
 * - Admin view member detail
 * - User view own profile
 * - Public user data access
 */
const getUserDetail = async (req, res) => {
  try {
    const { id: paramId, memberId } = req.params;
    const {
      includeTransactions = "false",
      transactionLimit = "10",
      context = "general", // "admin", "profile", "general"
    } = req.query;

    // Smart ID detection - parameter bisa dari berbagai route
    const targetId = paramId || memberId;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "ID atau NRP diperlukan",
      });
    }

    // Authorization check berdasarkan context
    if (context === "profile" && req.authenticatedUser) {
      // Untuk /user/profile - user hanya bisa lihat data sendiri
      const userId = req.authenticatedUser.id;
      if (targetId !== userId && targetId !== req.authenticatedUser.nrp) {
        return res.status(403).json({
          success: false,
          message: "Anda hanya bisa mengakses data diri sendiri",
        });
      }
    }

    // Smart where clause - detect ID vs NRP
    let whereClause;
    if (targetId.length < 10) {
      // Kemungkinan NRP (biasanya angka pendek)
      whereClause = { nrp: targetId };
    } else {
      // Kemungkinan ID (cuid biasanya panjang)
      whereClause = { id: targetId };
    }

    // Query dengan field selection yang aman
    const userData = await prisma.anggota.findUnique({
      where: whereClause,
      select: {
        id: true,
        nrp: true,
        nama: true,
        jabatan: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // ✅ TIDAK ADA password field untuk security
        simpanan: {
          select: {
            simpananPokok: true,
            simpananWajib: true,
            simpananSukarela: true,
            tabunganHariRaya: true,
            lastUpdatedBy: true,
            createdAt: true,
            updatedAt: true,
            ...(includeTransactions === "true" && {
              simpananTransactions: {
                select: {
                  id: true,
                  type: true,
                  category: true,
                  amount: true,
                  balanceBefore: true,
                  balanceAfter: true,
                  description: true,
                  isSystemGenerated: true,
                  createdAt: true,
                  processor: {
                    select: {
                      nama: true,
                      nrp: true,
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
                take: parseInt(transactionLimit),
              },
            }),
            updatedBy: {
              select: {
                nama: true,
                nrp: true,
              },
            },
          },
        },
        piutang: {
          select: {
            id: true,
            jenis: true,
            besarPinjaman: true,
            totalPiutang: true,
            biayaAngsuran: true,
            sisaPiutang: true,
            sisaAngsuran: true,
            totalAngsuran: true,
            status: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
            ...(includeTransactions === "true" && {
              transactions: {
                select: {
                  id: true,
                  type: true,
                  amount: true,
                  description: true,
                  createdAt: true,
                  processor: {
                    select: {
                      nama: true,
                      nrp: true,
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
                take: parseInt(transactionLimit),
              },
            }),
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    // Calculate summary statistics
    const activePiutang = userData.piutang.filter((p) => p.status === "active");
    const completedPiutang = userData.piutang.filter(
      (p) => p.status === "completed"
    );
    const totalActivePiutang = activePiutang.reduce(
      (sum, p) => sum + parseFloat(p.sisaPiutang),
      0
    );
    const totalCompletedPiutang = completedPiutang.reduce(
      (sum, p) => sum + parseFloat(p.besarPinjaman),
      0
    );

    // Calculate simpanan statistics
    const simpananData = userData.simpanan;
    const totalSimpanan = simpananData
      ? parseFloat(simpananData.simpananPokok) +
        parseFloat(simpananData.simpananWajib) +
        parseFloat(simpananData.simpananSukarela) +
        parseFloat(simpananData.tabunganHariRaya)
      : 0;

    // Simpanan transaction statistics (jika ada)
    let simpananTransactionStats = {
      totalTransactions: 0,
      totalSetoran: 0,
      totalPenarikan: 0,
      totalKoreksi: 0,
      lastTransactionDate: null,
    };

    if (simpananData?.simpananTransactions) {
      const transactions = simpananData.simpananTransactions;
      simpananTransactionStats = {
        totalTransactions: transactions.length,
        totalSetoran: transactions.filter((t) => t.type === "setoran").length,
        totalPenarikan: transactions.filter((t) => t.type === "penarikan")
          .length,
        totalKoreksi: transactions.filter((t) => t.type === "koreksi").length,
        lastTransactionDate:
          transactions.length > 0 ? transactions[0].createdAt : null,
      };
    }

    // Transform response dengan summary
    const userDetail = {
      ...userData,
      // Transform simpanan data untuk consistency dengan updateSimpananAnggota
      simpanan: userData.simpanan
        ? {
            // Convert Decimal to string untuk consistency
            simpananPokok: userData.simpanan.simpananPokok.toString(),
            simpananWajib: userData.simpanan.simpananWajib.toString(),
            simpananSukarela: userData.simpanan.simpananSukarela.toString(),
            tabunganHariRaya: userData.simpanan.tabunganHariRaya.toString(),
            // Add totalSimpanan seperti di updateSimpananAnggota - PINDAH KE ATAS
            totalSimpanan: totalSimpanan.toString(),
            lastUpdatedBy: userData.simpanan.lastUpdatedBy,
            createdAt: userData.simpanan.createdAt,
            updatedAt: userData.simpanan.updatedAt,
            // Transactions dan updatedBy di bawah
            ...(userData.simpanan.simpananTransactions && {
              transactions: userData.simpanan.simpananTransactions,
            }),
            ...(userData.simpanan.updatedBy && {
              updatedBy: userData.simpanan.updatedBy,
            }),
          }
        : {
            simpananPokok: "0",
            simpananWajib: "0",
            simpananSukarela: "0",
            tabunganHariRaya: "0",
            totalSimpanan: "0",
            lastUpdatedBy: null,
            createdAt: null,
            updatedAt: null,
            updatedBy: null,
          },
      summary: {
        // Piutang summary
        totalPiutang: userData.piutang.length,
        activePiutang: activePiutang.length,
        completedPiutang: completedPiutang.length,
        totalActivePiutangAmount: totalActivePiutang,
        totalCompletedPiutangAmount: totalCompletedPiutang,

        // Simpanan summary
        totalSimpanan: totalSimpanan,
        simpananBreakdown: simpananData
          ? {
              simpananPokok: parseFloat(simpananData.simpananPokok),
              simpananWajib: parseFloat(simpananData.simpananWajib),
              simpananSukarela: parseFloat(simpananData.simpananSukarela),
              tabunganHariRaya: parseFloat(simpananData.tabunganHariRaya),
            }
          : {
              simpananPokok: 0,
              simpananWajib: 0,
              simpananSukarela: 0,
              tabunganHariRaya: 0,
            },

        // Simpanan transaction summary
        simpananTransactions: simpananTransactionStats,
      },
    };

    // Context-aware response message
    const messages = {
      admin: "Detail anggota berhasil diambil",
      profile: "Profile berhasil diambil",
      general: "Data user berhasil diambil",
    };

    return res.status(200).json({
      success: true,
      message: messages[context] || messages.general,
      data: userDetail,
    });
  } catch (error) {
    console.error("Get user detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { getUserDetail };
