const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // 1. Deploy IssuerRegistry
  const IssuerRegistry =
    await ethers.getContractFactory("IssuerRegistry");

  const issuerRegistry =
    await IssuerRegistry.deploy();

  await issuerRegistry.waitForDeployment();

  const issuerRegistryAddress =
    await issuerRegistry.getAddress();

  console.log(
    "IssuerRegistry deployed to:",
    issuerRegistryAddress
  );

  // 2. Authorise deployer as demo university
  const addIssuerTx =
    await issuerRegistry.addIssuer(
      deployer.address,
      "Demo University"
    );

  await addIssuerTx.wait();

  console.log(
    "Deployer authorised:",
    await issuerRegistry.isAuthorised(
      deployer.address
    )
  );

  // 3. Deploy CredentialRegistry
  const CredentialRegistry =
    await ethers.getContractFactory(
      "CredentialRegistry"
    );

  const credentialRegistry =
    await CredentialRegistry.deploy(
      issuerRegistryAddress
    );

  await credentialRegistry.waitForDeployment();

  const credentialRegistryAddress =
    await credentialRegistry.getAddress();

  console.log(
    "CredentialRegistry deployed to:",
    credentialRegistryAddress
  );

  // 4. Issue demo credential
  const credentialHash =
    "0x" + "11".repeat(32);

  const cid =
    "bafybeimockcredential123";

  const issueTx =
    await credentialRegistry.issueCredential(
      credentialHash,
      cid
    );

  await issueTx.wait();

  console.log("Credential issued");

  // 5. Verify
  let result =
    await credentialRegistry.verifyCredential(
      credentialHash
    );

  console.log("Verification before revocation:", {
    valid: result.valid,
    issuer: result.issuer,
    issuedAt: result.issuedAt.toString(),
    cid: result.cid,
    revoked: result.revoked,
  });

  // 6. Revoke
  const revokeTx =
    await credentialRegistry.revokeCredential(
      credentialHash
    );

  await revokeTx.wait();

  console.log("Credential revoked");

  // 7. Verify again
  result =
    await credentialRegistry.verifyCredential(
      credentialHash
    );

  console.log("Verification after revocation:", {
    valid: result.valid,
    issuer: result.issuer,
    issuedAt: result.issuedAt.toString(),
    cid: result.cid,
    revoked: result.revoked,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});