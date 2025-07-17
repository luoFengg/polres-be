const express = require("express");
const router = express.Router();

const { getProducts } = require("../handlers/shared/getProducts");
const { getProductById } = require("../handlers/shared/getProductbyId");

// Route untuk user melihat produk berdasarkan kategori atau pencarian
router.get("/products", getProducts);
router.get("/products/:productId", getProductById);

module.exports = router;
