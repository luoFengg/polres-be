const prisma = require("../../config/prisma");

const updatePiutangByUserId = async (req, res) => {
  try {
    const { piutangId } = req.params;
    const {
      type, // "payment", "penalty", "discount", "adjustment"
      amount,
      description,
      // Optional: untuk update data piutang langsung
      sisaPiutang,
      sisaAngsuran,
      status,
    } = req.body;

    // Validasi input
    if (!piutangId) {
      return res.status(400).json({
        success: false,
        message: "Piutang ID is required",
      });
    }

    if (!type || (!amount && type !== "pelunasan")) {
      return res.status(400).json({
        success: false,
        message:
          "Type wajib diisi, dan amount wajib diisi kecuali untuk pelunasan",
      });
    }

    // Validasi type
    const validTypes = ["payment", "adjustment", "pelunasan"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type harus salah satu dari: payment, adjustment, pelunasan",
      });
    }

    // Cari piutang yang akan diupdate
    const existingPiutang = await prisma.piutang.findUnique({
      where: { id: piutangId },
      include: {
        anggota: {
          select: { nama: true, nrp: true },
        },
      },
    });

    if (!existingPiutang) {
      return res.status(404).json({
        success: false,
        message: "Piutang tidak ditemukan",
      });
    }

    // Cek apakah piutang masih aktif
    if (existingPiutang.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Piutang sudah ${existingPiutang.status}, tidak bisa diupdate`,
      });
    }

    // Hitung sisa piutang dan angsuran baru
    let newSisaPiutang = existingPiutang.sisaPiutang;
    let newSisaAngsuran = existingPiutang.sisaAngsuran;
    let newStatus = existingPiutang.status;
    let completedAt = existingPiutang.completedAt;

    // Logic berdasarkan type transaksi
    switch (type) {
      case "payment":
        newSisaPiutang = Math.max(0, newSisaPiutang - amount);
        if (newSisaAngsuran > 0) {
          newSisaAngsuran = Math.max(0, newSisaAngsuran - 1);
        }
        break;
      case "adjustment":
        // Manual adjustment - admin bisa set langsung
        if (sisaPiutang !== undefined) newSisaPiutang = sisaPiutang;
        if (sisaAngsuran !== undefined) newSisaAngsuran = sisaAngsuran;
        break;
      case "pelunasan":
        // Pelunasan langsung - set semua ke 0 dan status completed
        newSisaPiutang = 0;
        newSisaAngsuran = 0;
        newStatus = "completed";
        completedAt = new Date();
        break;
    }

    // Cek apakah piutang sudah lunas (kecuali untuk pelunasan yang sudah di-handle di switch)
    if (type !== "pelunasan" && (newSisaPiutang <= 0 || newSisaAngsuran <= 0)) {
      newStatus = "completed";
      completedAt = new Date();
      newSisaPiutang = 0;
      newSisaAngsuran = 0;
    }

    // Override manual jika admin set status
    if (status && ["active", "completed", "cancelled"].includes(status)) {
      newStatus = status;
      if (status === "completed") {
        completedAt = new Date();
        newSisaPiutang = 0;
        newSisaAngsuran = 0;
      }
    }

    // Gunakan transaction untuk atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const transaction = await tx.piutangTransaction.create({
        data: {
          piutangId: piutangId,
          type: type,
          amount:
            type === "pelunasan"
              ? 0
              : type === "payment"
              ? -Math.abs(amount)
              : amount, // Pelunasan = 0, Payment = negatif, Adjustment = amount
          description:
            description ||
            (type === "pelunasan"
              ? "Pelunasan piutang"
              : `${type} sebesar ${amount || 0}`),
          processedBy: req.authenticatedUser.id,
        },
      });

      // 2. Update piutang
      const updatedPiutang = await tx.piutang.update({
        where: { id: piutangId },
        data: {
          sisaPiutang: newSisaPiutang,
          sisaAngsuran: newSisaAngsuran,
          status: newStatus,
          completedAt: completedAt,
        },
        select: {
          id: true,
          anggotaId: true,
          jenis: true,
          besarPinjaman: true,
          totalPiutang: true, // Tambahkan field totalPiutang
          biayaAngsuran: true,
          sisaPiutang: true,
          sisaAngsuran: true,
          totalAngsuran: true,
          status: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          anggota: {
            select: { nama: true, nrp: true },
          },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              createdAt: true,
              processor: {
                select: { nama: true, nrp: true },
              },
            },
          },
        },
      });

      return { transaction, updatedPiutang };
    });

    return res.status(200).json({
      success: true,
      message: `Piutang berhasil diupdate - ${type}`,
      data: {
        piutang: result.updatedPiutang,
        latestTransaction: result.transaction,
      },
    });
  } catch (error) {
    console.error("Update piutang error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { updatePiutangByUserId };
