const { ethers } = require("hardhat");

async function main() {
  const [owner, university] =
    await ethers.getSigners();

  console.log("Owner:", owner.address);
  console.log("University:", university.address);

  // 1. Deploy IssuerRegistry
  const IssuerRegistry =
    await ethers.getContractFactory(
      "IssuerRegistry"
    );

  const issuerRegistry =
    await IssuerRegistry.deploy();

  await issuerRegistry.waitForDeployment();

  console.log(
    "IssuerRegistry deployed to:",
    await issuerRegistry.getAddress()
  );

  // 2. Register an authorised university
  const addIssuerTx =
    await issuerRegistry.addIssuer(
      university.address,
      "Demo University"
    );

  await addIssuerTx.wait();

  console.log(
    "University authorised:",
    await issuerRegistry.isAuthorised(
      university.address
    )
  );

  // 3. Deploy CredentialRegistry
  const CredentialRegistry =
    await ethers.getContractFactory(
      "CredentialRegistry"
    );

  const credentialRegistry =
    await CredentialRegistry.deploy(
      await issuerRegistry.getAddress()
    );

  await credentialRegistry.waitForDeployment();

  console.log(
    "CredentialRegistry deployed to:",
    await credentialRegistry.getAddress()
  );

  // Demo values that would normally come
  // from the off-chain VC/IPFS pipeline.
  const credentialHash =
    "0x" + "11".repeat(32);

  const cid =
    "bafybeimockcredential123";

  // 4. Issue credential
  const issueTx =
    await credentialRegistry
      .connect(university)
      .issueCredential(
        credentialHash,
        cid
      );

  await issueTx.wait();

  console.log("Credential issued");

  // 5. Verify credential
  let result =
    await credentialRegistry
      .verifyCredential(
        credentialHash
      );

  console.log(
    "Verification before revocation:"
  );

  console.log({
    valid: result.valid,
    issuer: result.issuer,
    issuedAt:
      result.issuedAt.toString(),
    cid: result.cid,
    revoked: result.revoked,
  });

  // 6. Revoke credential
  const revokeTx =
    await credentialRegistry
      .connect(university)
      .revokeCredential(
        credentialHash
      );

  await revokeTx.wait();

  console.log("Credential revoked");

  // 7. Verify again
  result =
    await credentialRegistry
      .verifyCredential(
        credentialHash
      );

  console.log(
    "Verification after revocation:"
  );

  console.log({
    valid: result.valid,
    issuer: result.issuer,
    issuedAt:
      result.issuedAt.toString(),
    cid: result.cid,
    revoked: result.revoked,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});