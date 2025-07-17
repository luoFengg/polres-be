const prisma = require("../../config/prisma");

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.tokoKategori.findMany({
      orderBy: {
        namaKategori: "asc", // Sort alfabetis
      },
      include: {
        _count: {
          select: {
            produk: true, // Count berapa produk per kategori
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Kategori berhasil diambil",
      data: categories.map((kategori) => ({
        id: kategori.id,
        namaKategori: kategori.namaKategori,
        jumlahProduk: kategori._count.produk,
        createdAt: kategori.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil kategori",
      error: error.message,
    });
  }
};

module.exports = { getCategories };
