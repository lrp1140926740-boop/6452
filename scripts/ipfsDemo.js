require("dotenv").config({ quiet: true });

const {
  processCredential,
  createContractHash,
} = require("../src/storage/credentialProcessor");

const {
  downloadFromIPFS,
} = require("../src/storage/ipfs");

const {
  decryptCredential,
} = require("../src/data-module/encryption");

const {
  validateVerifiableCredential,
} = require("../src/storage/vc");

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${name} is not configured in the .env file`
    );
  }

  return value;
}


async function parseDownloadedPackage(data) {
  if (data === null || data === undefined) {
    throw new Error(
      "The Pinata gateway returned empty data"
    );
  }

  if (Buffer.isBuffer(data)) {
    return JSON.parse(data.toString("utf8"));
  }

  if (typeof data === "string") {
    return JSON.parse(data);
  }

  if (data instanceof ArrayBuffer) {
    return JSON.parse(
      Buffer.from(data).toString("utf8")
    );
  }

  if (ArrayBuffer.isView(data)) {
    return JSON.parse(
      Buffer.from(
        data.buffer,
        data.byteOffset,
        data.byteLength
      ).toString("utf8")
    );
  }

  if (
    typeof data === "object" &&
    typeof data.text === "function"
  ) {
    const text = await data.text();
    return JSON.parse(text);
  }

  if (
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data;
  }

  throw new Error(
    "The Pinata gateway returned an unsupported data format"
  );
}

async function runDemo() {
  const password = requireEnvironmentVariable(
    "DEMO_CREDENTIAL_PASSWORD"
  );


  const credentialInput = {
    credentialId:
      "urn:uuid:demo-credential-6452-001",
    issuerId:
      "did:example:demo-university",
    issuerName:
      "Demo University",
    studentId:
      "demo-student-001",
    studentName:
      "Demo Student",
    degree:
      "Bachelor of Engineering",
    major:
      "Computer Engineering",
    graduationDate:
      "2026-07-31",
    issuanceDate:
      "2026-08-01",
  };

  console.log(
    "=== COMP6452 Real Pinata IPFS Demo ==="
  );

  console.log(
    "\nStep 1: Creating, hashing and encrypting the VC..."
  );

  const storedResult = await processCredential(
    credentialInput,
    password,
    {
      filename:
        "encrypted-demo-credential.json",
    }
  );

  console.log("Upload completed.");
  console.log(`CID: ${storedResult.cid}`);
  console.log(
    `Credential hash: ${storedResult.credentialHash}`
  );

  console.log(
    "\nStep 2: Downloading the encrypted package..."
  );

  const downloadedData = await downloadFromIPFS(
    storedResult.cid
  );

  const encryptedPackage =
    await parseDownloadedPackage(downloadedData);

  console.log(
    "Encrypted package downloaded."
  );

  console.log(
    "\nStep 3: Decrypting the credential..."
  );

  const downloadedCredential =
    decryptCredential(
      encryptedPackage,
      password
    );

  console.log("Credential decrypted.");

  console.log(
    "\nStep 4: Validating the W3C VC..."
  );

  const validation =
    validateVerifiableCredential(
      downloadedCredential
    );

  if (!validation.valid) {
    throw new Error(
      `VC validation failed: ${
        validation.errors.join("; ")
      }`
    );
  }

  console.log("W3C VC validation passed.");

  console.log(
    "\nStep 5: Recalculating the contract hash..."
  );

  const downloadedHash =
    createContractHash(
      downloadedCredential
    );

  const hashMatches =
    downloadedHash ===
    storedResult.credentialHash;

  if (!hashMatches) {
    throw new Error(
      "The downloaded credential hash does not match"
    );
  }

  console.log("Credential hash matches.");

  const integrationOutput = {
    cid: storedResult.cid,
    credentialHash:
      storedResult.credentialHash,
    credentialJson:
      downloadedCredential,
  };

  console.log(
    "\n=== Output for Members B and E ==="
  );

  console.log(
    JSON.stringify(
      integrationOutput,
      null,
      2
    )
  );

  console.log(
    "\nPASS: Real Pinata IPFS demo completed successfully."
  );
}

runDemo().catch((error) => {
  console.error(
    "\nFAIL: Real Pinata IPFS demo failed."
  );
  console.error(error.message);
  process.exitCode = 1;
});
