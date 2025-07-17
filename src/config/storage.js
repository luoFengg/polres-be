const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");
const path = require("path");

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer config untuk upload foto
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed!"), false);
    }
  },
});

// Function untuk memastikan bucket ada
const ensureBucketExists = async (bucketName) => {
  try {
    // Cek apakah bucket sudah ada
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (!bucketExists) {
      // Buat bucket baru jika belum ada
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        fileSizeLimit: 5242880, // 5MB
      });

      if (error) {
        console.error("Error creating bucket:", error);
        throw error;
      }

      console.log(`Bucket '${bucketName}' created successfully`);
    }
  } catch (error) {
    console.error("Error ensuring bucket exists:", error);
    throw error;
  }
};

// Function upload foto produk
const uploadProdukFoto = async (fileBuffer, produkId, originalName) => {
  try {
    // Mastiin bucketnya udah ada apa belum
    await ensureBucketExists("produk-images");

    const ext = path.extname(originalName);
    const fileName = `produk-${produkId}-${Date.now()}${ext}`;

    // Fix MIME type untuk JPG files
    let contentType = `image/${ext.slice(1)}`;
    if (contentType === "image/jpg") {
      contentType = "image/jpeg";
    }

    const { data, error } = await supabase.storage
      .from("produk-images")
      .upload(fileName, fileBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("produk-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Upload foto error:", error);
    throw error;
  }
};

module.exports = { upload, uploadProdukFoto };
