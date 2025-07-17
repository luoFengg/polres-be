const prisma = require("../../config/prisma");
const { upload, uploadProdukFoto } = require("../../config/storage");

/**
 * Add new product
 * Foto optional - kalau tidak ada, default string kosong
 * POST /admin/produk
 */
const addProduct = async (req, res) => {
  try {
    const { namaProduk, harga, namaKategori, deskripsi } = req.body;

    // Validation untuk field wajib
    if (!namaProduk || !harga) {
      return res.status(400).json({
        success: false,
        message: "Nama produk dan harga wajib diisi",
      });
    }

    // Validate harga adalah angka positif
    const hargaNum = parseFloat(harga);
    if (isNaN(hargaNum) || hargaNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Harga harus berupa angka positif",
      });
    }

    // Handle kategori - cari atau buat baru jika namaKategori diisi
    let kategoriId = null;
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

      kategoriId = kategori.id;
    }

    // Prepare data dengan default values
    const productData = {
      namaProduk: namaProduk.trim(),
      harga: hargaNum,
      deskripsi: deskripsi?.trim() || "", // Default: string kosong
      kategoriId: kategoriId, // Dari pencarian/pembuatan kategori di atas (null jika tidak ada namaKategori)
      fotoProduk: "", // Default: string kosong
    };

    // Jika ada file foto, upload dulu
    if (req.file) {
      let newProduct;
      try {
        // Create produk dulu untuk dapat ID
        newProduct = await prisma.tokoProduk.create({
          data: productData,
        });

        // Upload foto dengan product ID
        const fotoUrl = await uploadProdukFoto(
          req.file.buffer,
          newProduct.id,
          req.file.originalname
        );

        // Update produk dengan URL foto
        const updatedProduct = await prisma.tokoProduk.update({
          where: { id: newProduct.id },
          data: { fotoProduk: fotoUrl },
          include: {
            kategori: {
              select: {
                id: true,
                namaKategori: true,
              },
            },
          },
        });

        return res.status(201).json({
          success: true,
          message: "Produk berhasil ditambahkan dengan foto",
          data: {
            id: updatedProduct.id,
            namaProduk: updatedProduct.namaProduk,
            harga: updatedProduct.harga,
            deskripsi: updatedProduct.deskripsi,
            fotoProduk: updatedProduct.fotoProduk,
            kategori: updatedProduct.kategori,
            createdAt: updatedProduct.createdAt,
          },
        });
      } catch (uploadError) {
        // Jika upload foto gagal, hapus produk yang sudah dibuat (jika sudah terbuat)
        if (newProduct) {
          await prisma.tokoProduk.delete({
            where: { id: newProduct.id },
          });
        }

        console.error("Photo upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Gagal upload foto produk",
          error: uploadError.message,
        });
      }
    } else {
      // Tidak ada foto - create produk dengan foto string kosong
      const newProduct = await prisma.tokoProduk.create({
        data: productData, // fotoProduk sudah "" (string kosong)
        include: {
          kategori: {
            select: {
              id: true,
              namaKategori: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Produk berhasil ditambahkan tanpa foto",
        data: {
          id: newProduct.id,
          namaProduk: newProduct.namaProduk,
          harga: newProduct.harga,
          deskripsi: newProduct.deskripsi,
          fotoProduk: newProduct.fotoProduk, // akan "" (string kosong)
          kategori: newProduct.kategori,
          createdAt: newProduct.createdAt,
        },
      });
    }
  } catch (error) {
    console.error("Add product error:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Nama produk sudah ada",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { addProduct };
