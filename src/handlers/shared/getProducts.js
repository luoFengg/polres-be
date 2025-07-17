const prisma = require("../../config/prisma");
const { paginate } = require("../../utils/pagination");

const getProducts = async (req, res) => {
  try {
    const { kategori, search, page = 1, limit = 20 } = req.query;

    const whereClause = {};

    // Filter by kategori (nama kategori)
    if (kategori) {
      whereClause.kategori = {
        namaKategori: {
          contains: kategori,
          mode: "insensitive", // Case insensitive search
        },
      };
    }

    // Search by nama produk
    if (search) {
      whereClause.namaProduk = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Use pagination helper (consistent with getMembersPaginated)
    const result = await paginate(prisma.tokoProduk, {
      page,
      limit,
      where: whereClause,
      include: {
        kategori: {
          select: {
            id: true,
            namaKategori: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Produk terbaru dulu
      },
    });

    // Format response (consistent structure)
    const formattedProducts = result.data.map((product) => ({
      id: product.id,
      namaProduk: product.namaProduk,
      harga: product.harga,
      deskripsi: product.deskripsi,
      fotoProduk: product.fotoProduk,
      kategori: product.kategori
        ? {
            id: product.kategori.id,
            namaKategori: product.kategori.namaKategori,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    res.status(200).json({
      success: true,
      message: "Produk berhasil diambil",
      data: {
        products: formattedProducts,
        pagination: result.pagination,
        filters: {
          kategori: kategori || null,
          search: search || null,
        },
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil produk",
      error: error.message,
    });
  }
};

module.exports = { getProducts };
