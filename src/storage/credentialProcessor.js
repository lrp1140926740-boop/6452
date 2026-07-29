const {
  createVerifiableCredential,
} = require("./vc");

const {
  hashCredential,
} = require("../data-module/encryption");

/**
 * Convert SHA-256 result into a
 * Solidity-compatible bytes32 hexadecimal string.
 *
 */
function toSolidityBytes32(hash) {
  if (typeof hash !== "string") {
    throw new Error("Credential hash must be a string");
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
 *
 *
 */
function createContractHash(credential) {
  const rawHash =
    hashCredential(credential);

  return toSolidityBytes32(rawHash);
}

/**
 * Create a W3C VC and prepare its hash.
 *
 *
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

module.exports = {
  toSolidityBytes32,
  createContractHash,
  prepareCredential,
};
