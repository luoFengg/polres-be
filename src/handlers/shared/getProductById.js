const prisma = require("../../config/prisma");

const getProductById = async (req, res) => {
  const { productId } = req.params;

  // Validasi input
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID wajib diisi",
    });
  }

  // Cari produk berdasarkan ID
  const product = await prisma.tokoProduk.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Produk tidak ditemukan",
    });
  }

  return res.status(200).json({
    success: true,
    data: product,
  });
};

module.exports = {
  getProductById,
};
