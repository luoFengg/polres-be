const bcrypt = require("bcrypt");

async function generateMemberHashes() {
  const passwords = ["member123", "anggota123", "polres123"];
  const saltRounds = 10;

  console.log("=== Password Hashes untuk Member ===\n");

  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    const hash = await bcrypt.hash(password, saltRounds);

    console.log(`Member ${i + 1}:`);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);

    // Test verification
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Verification: ${isValid}\n`);
  }
}

generateMemberHashes().catch(console.error);
