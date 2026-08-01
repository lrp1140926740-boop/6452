const {
  createVerifiableCredential,
} = require("./vc");

const {
  encryptCredential,
  hashCredential,
} = require("../data-module/encryption");

const {
  uploadToIPFS,
} = require("./ipfs");

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function toSolidityBytes32(hash) {
  if (typeof hash !== "string") {
    throw new Error(
      "Credential hash must be a string"
    );
  }

  if (/^0x[0-9a-f]{64}$/i.test(hash)) {
    return hash.toLowerCase();
  }

  if (/^[0-9a-f]{64}$/i.test(hash)) {
    return `0x${hash.toLowerCase()}`;
  }

  throw new Error(
    "Credential hash must contain 64 hexadecimal characters"
  );
}

/**
 * Generate the blockchain-ready hash for a W3C VC.
 */
function createContractHash(credential) {
  const rawHash = hashCredential(credential);

  return toSolidityBytes32(rawHash);
}

/**
 * Create a W3C VC and prepare its hash.
 */
function prepareCredential(input) {
  const credentialJson =
    createVerifiableCredential(input);

  const credentialHash =
    createContractHash(credentialJson);

  return {
    credentialJson,
    credentialHash,
  };
}

/**
 * Complete the off-chain credential storage process.
 *
 * 1. Create the W3C VC.
 * 2. Calculate its blockchain-ready hash.
 * 3. Encrypt the VC.
 * 4. Upload the encrypted package to IPFS.
 * 5. Return the values needed by other modules.
 */
async function processCredential(
  input,
  password,
  options = {}
) {
  if (!isNonEmptyString(password)) {
    throw new Error(
      "Encryption password is required"
    );
  }

  const {
    credentialJson,
    credentialHash,
  } = prepareCredential(input);

  const encryptedPackage =
    encryptCredential(
      credentialJson,
      password
    );

  const uploadFn =
    options.uploadFn || uploadToIPFS;

  if (typeof uploadFn !== "function") {
    throw new Error(
      "IPFS upload function is required"
    );
  }

  const cid = await uploadFn(
    encryptedPackage,
    {
      client: options.client,
      filename:
        options.filename ||
        "encrypted-credential.json",
    }
  );

  if (!isNonEmptyString(cid)) {
    throw new Error(
      "IPFS upload did not return a valid CID"
    );
  }

  return {
    credentialJson,
    credentialHash,
    cid,
  };
}

module.exports = {
  toSolidityBytes32,
  createContractHash,
  prepareCredential,
  processCredential,
};
