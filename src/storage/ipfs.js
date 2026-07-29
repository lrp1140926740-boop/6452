/**
 * IPFS storage module using Pinata.
 *
 */

require("dotenv").config();

const { PinataSDK } = require("pinata");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createPinataClient(options = {}) {
  const jwt = options.jwt || process.env.PINATA_JWT;
  const gateway = options.gateway || process.env.PINATA_GATEWAY;

  if (!isNonEmptyString(jwt)) {
    throw new Error("PINATA_JWT is not configured");
  }

  if (!isNonEmptyString(gateway)) {
    throw new Error("PINATA_GATEWAY is not configured");
  }

  return new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway,
  });
}

function createJsonFile(
  data,
  filename = "encrypted-credential.json"
) {
  if (data === null || data === undefined) {
    throw new Error("Credential data is required");
  }

  if (!isNonEmptyString(filename)) {
    throw new Error("Filename is required");
  }

  const json = JSON.stringify(data, null, 2);

  return new File([json], filename, {
    type: "application/json",
  });
}

async function uploadToIPFS(data, options = {}) {
  const client = options.client || createPinataClient();
  const filename =
    options.filename || "encrypted-credential.json";

  const file = createJsonFile(data, filename);

  try {
    const result = await client.upload.public.file(file);

    if (!result || !isNonEmptyString(result.cid)) {
      throw new Error("Pinata did not return a valid CID");
    }

    return result.cid;
  } catch (error) {
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

async function downloadFromIPFS(cid, options = {}) {
  if (!isNonEmptyString(cid)) {
    throw new Error("CID is required");
  }

  const client = options.client || createPinataClient();

  try {
    const response = await client.gateways.public.get(cid);

    if (!response || response.data === undefined) {
      throw new Error("No data was returned from IPFS");
    }

    return response.data;
  } catch (error) {
    throw new Error(`IPFS download failed: ${error.message}`);
  }
}

module.exports = {
  createPinataClient,
  createJsonFile,
  uploadToIPFS,
  downloadFromIPFS,
};
