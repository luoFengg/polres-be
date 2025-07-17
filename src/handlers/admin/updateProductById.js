const prisma = require("../../config/prisma");
const { uploadProdukFoto } = require("../../config/storage");

/**
 * Update product by ID
 * Support update foto, kategori berdasarkan namaKategori
 * PUT/PATCH /admin/produk/:productId
 */
const updateProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const { namaProduk, harga, deskripsi, namaKategori } = req.body;

    // Validasi productId
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID wajib diisi",
      });
    }

    // Cek apakah produk exist
    const existingProduct = await prisma.tokoProduk.findUnique({
      where: { id: productId },
      include: {
        kategori: {
          select: {
            id: true,
            namaKategori: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    // Prepare update data - hanya update field yang dikirim
    const updateData = {};

    // Update nama produk jika ada
    if (namaProduk !== undefined) {
      if (!namaProduk.trim()) {
        return res.status(400).json({
          success: false,
          message: "Nama produk tidak boleh kosong",
        });
      }
      updateData.namaProduk = namaProduk.trim();
    }

    // Update harga jika ada
    if (harga !== undefined) {
      const hargaNum = parseFloat(harga);
      if (isNaN(hargaNum) || hargaNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Harga harus berupa angka positif",
        });
      }
      updateData.harga = hargaNum;
    }

    // Update deskripsi jika ada
    if (deskripsi !== undefined) {
      updateData.deskripsi = deskripsi?.trim() || "";
    }

    // Handle kategori - cari atau buat baru jika namaKategori diisi
    if (namaKategori !== undefined) {
      if (namaKategori && namaKategori.trim()) {
        const namaKategoriTrimmed = namaKategori.trim();

        // Cari kategori yang sudah ada berdasarkan nama
        let kategori = await prisma.tokoKategori.findUnique({
          where: { namaKategori: namaKategoriTrimmed },
        });

        // Jika kategori belum ada, buat baru
        if (!kategori) {
          kategori = await prisma.tokoKategori.create({
            data: { namaKategori: namaKategoriTrimmed },
          });
        }

        updateData.kategoriId = kategori.id;
      } else {
        // Jika namaKategori kosong, set kategoriId ke null
        updateData.kategoriId = null;
      }
    }

    // Handle foto upload jika ada file baru
    if (req.file) {
      try {
        const fotoUrl = await uploadProdukFoto(
          req.file.buffer,
          productId,
          req.file.originalname
        );
        updateData.fotoProduk = fotoUrl;
      } catch (uploadError) {
        console.error("Photo upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Gagal upload foto produk",
          error: uploadError.message,
        });
      }
    }

    // Jika tidak ada data yang diupdate
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data yang diupdate",
      });
    }

    // Update produk
    const updatedProduct = await prisma.tokoProduk.update({
      where: { id: productId },
      data: updateData,
      include: {
        kategori: {
          select: {
            id: true,
            namaKategori: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil diupdate",
      data: {
        id: updatedProduct.id,
        namaProduk: updatedProduct.namaProduk,
        harga: updatedProduct.harga,
        deskripsi: updatedProduct.deskripsi,
        fotoProduk: updatedProduct.fotoProduk,
        kategori: updatedProduct.kategori,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt, // Field baru yang sudah kita tambahkan
      },
    });
  } catch (error) {
    console.error("Update product error:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Nama produk sudah ada",
      });
    }

    // Handle record not found
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { updateProductById };
