const {
  encryptCredential,
  decryptCredential,
  hashCredential,
} = require("../src/data-module/encryption");

const {
  separateCredentialData,
} = require("../src/data-module/credentialData");

const {
  demoCredential,
  demoMetadata,
} = require("../src/data-module/demoData");

function runDemo() {
  const password = "COMP6452-Demo-Key-2026";

  console.log("\n======================================");
  console.log("COMP6452 Data Module Demo");
  console.log("======================================");

  console.log("\n1. Original Credential");
  console.log(JSON.stringify(demoCredential, null, 2));

  const credentialHash = hashCredential(demoCredential);

  console.log("\n2. SHA-256 Credential Hash");
  console.log(credentialHash);

  const separatedData = separateCredentialData(
    demoCredential,
    {
      ...demoMetadata,
      credentialHash,
      ipfsCid: "bafybeidemo123",
    }
  );

  console.log("\n3. Data Stored On-Chain");
  console.log(
    JSON.stringify(separatedData.onChainData, null, 2)
  );

  console.log("\n4. Sensitive Data Stored Off-Chain");
  console.log(
    JSON.stringify(separatedData.offChainData, null, 2)
  );

  const encryptedPackage = encryptCredential(
    separatedData.offChainData,
    password
  );

  console.log("\n5. Encrypted Package for IPFS");
  console.log(
    JSON.stringify(encryptedPackage, null, 2)
  );

  const decryptedCredential = decryptCredential(
    encryptedPackage,
    password
  );

  console.log("\n6. Decrypted Credential");
  console.log(
    JSON.stringify(decryptedCredential, null, 2)
  );

  const verificationHash = hashCredential(
    demoCredential
  );

  console.log("\n7. Integrity Verification");
  console.log(
    verificationHash === credentialHash
      ? "PASS: Credential hash matches the blockchain record."
      : "FAIL: Credential hash does not match."
  );

  console.log("\n======================================");
  console.log("Data Module Demo Completed Successfully");
  console.log("======================================\n");
}

try {
  runDemo();
} catch (error) {
  console.error("\nDemo failed:", error.message);
  process.exit(1);
}