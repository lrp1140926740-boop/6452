/**
 * Full end-to-end integration demo (local Hardhat network)
 *
 * Run: npx hardhat run scripts/fullIntegrationDemo.js   (or: npm run demo:full)
 *
 * Wires together every team member's module into one runnable pipeline:
 *   C + D  off-chain : build a W3C VC -> hash it -> encrypt the PII -> upload to IPFS
 *                      (src/storage/credentialProcessor.js: processCredential)
 *   A / B  on-chain  : register the issuer + the oracle, then issue the credential
 *                      (its hash + IPFS CID) on-chain
 *   E      oracle    : the accreditation authority withdraws the issuer's accreditation,
 *                      and the oracle pushes that on-chain via updateIssuerStatus
 *   => the previously-valid credential becomes invalid, proving the whole system works.
 *
 * IPFS: this demo uses a mock uploader, so it runs with NO Pinata account. To use real IPFS,
 * set PINATA_JWT / PINATA_GATEWAY in .env and delete the `uploadFn` option below (the
 * processor then falls back to the real Pinata uploadToIPFS).
 */

const { ethers } = require("hardhat");
const { processCredential } = require("../src/storage/credentialProcessor");
const {
  AccreditationSource,
  AccreditationOracle,
  IssuerRegistryAdapter,
} = require("../src/oracle");

// Mock IPFS uploader: returns a fixed fake CID so the demo needs no Pinata account.
// Delete this (and the uploadFn option in step 3) once PINATA_JWT is configured for real IPFS.
async function mockUpload(encryptedPackage, options) {
  return "bafybeidemoencryptedcredentialmockcid0000000001";
}

async function main() {
  const [owner, university, oracleSigner] = await ethers.getSigners();

  console.log("=== Full end-to-end integration demo (A -> B -> C -> D -> E) ===\n");

  // 1. Deploy member B's IssuerRegistry and member A's CredentialRegistry.
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();

  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(
    await issuerRegistry.getAddress()
  );
  await credentialRegistry.waitForDeployment();
  console.log("[1] Contracts deployed (IssuerRegistry + CredentialRegistry).");

  // 2. Register the university as an authorised issuer, and register our oracle account.
  await (
    await issuerRegistry.addIssuer(university.address, "University of New South Wales")
  ).wait();
  await (await issuerRegistry.setOracle(oracleSigner.address)).wait();
  console.log("[2] Issuer registered + oracle configured.\n");

  // 3. OFF-CHAIN (C + D): build the W3C VC, hash it, encrypt the PII, upload to IPFS.
  const studentInput = {
    credentialId: "urn:uuid:credential-001",
    issuerId: "did:example:unsw",
    issuerName: "University of New South Wales",
    studentId: "z5447977",
    studentName: "Alice Zhang",
    degree: "Master of Information Technology",
    major: "Information Technology",
    graduationDate: "2026-07-20",
    issuanceDate: "2026-08-01T00:00:00Z",
  };
  const { credentialHash, cid } = await processCredential(
    studentInput,
    "demo-encryption-password",
    { uploadFn: mockUpload } // remove to use real Pinata IPFS (needs PINATA_JWT)
  );
  console.log("[3] Off-chain pipeline done (VC -> hash -> encrypt -> IPFS):");
  console.log("      credentialHash:", credentialHash);
  console.log("      IPFS CID      :", cid, "\n");

  // 4. ON-CHAIN (A): the university issues the credential (hash + CID) on-chain.
  await (
    await credentialRegistry.connect(university).issueCredential(credentialHash, cid)
  ).wait();
  console.log("[4] Credential issued on-chain by the university.\n");

  // 5. Verify while the issuer is accredited -> valid.
  let v = await credentialRegistry.verifyCredential(credentialHash);
  console.log("[5] [before oracle] credential valid:", v.valid);

  // 6. ORACLE (E): the accreditation authority withdraws the university's accreditation;
  //    the oracle resolves the new status and pushes it on-chain via updateIssuerStatus.
  const source = new AccreditationSource([
    { issuerId: university.address, accredited: true, body: "AU-Gov" },
  ]);
  source.revoke(university.address, "Accreditation withdrawn by authority");
  const oracle = new AccreditationOracle(source);
  const adapter = new IssuerRegistryAdapter(issuerRegistry.connect(oracleSigner));
  const verdict = await oracle.syncIssuer(university.address, adapter);
  console.log("[6] [oracle] pushed accredited =", verdict.accredited, `(${verdict.status})`);

  // 7. Verify again -> issuer no longer authorised, so the credential is now invalid.
  v = await credentialRegistry.verifyCredential(credentialHash);
  console.log("[7] [after oracle ] credential valid:", v.valid);

  console.log(
    "\nResult:",
    v.valid === false
      ? "PASS - full A->B->C->D->E pipeline works end-to-end"
      : "UNEXPECTED - credential still valid"
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
