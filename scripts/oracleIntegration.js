/**
 * Accreditation Oracle — on-chain integration demo (local Hardhat network)
 *
 * Run: npx hardhat run scripts/oracleIntegration.js   (or: npm run demo:oracle-integration)
 *
 * End-to-end: deploy IssuerRegistry (member B) + CredentialRegistry (member A), register the
 * oracle, have a university issue a credential, then let the OFF-CHAIN accreditation oracle
 * withdraw the university's accreditation and push it on-chain via updateIssuerStatus. The
 * previously-valid credential then fails verification — showing the oracle feeding real-world
 * accreditation status to the chain.
 */

const { ethers } = require('hardhat');
const {
  AccreditationSource,
  AccreditationOracle,
  IssuerRegistryAdapter,
} = require('../src/oracle');

async function main() {
  const [owner, university, oracleSigner] = await ethers.getSigners();

  // 1. Deploy member B's IssuerRegistry and member A's CredentialRegistry.
  const IssuerRegistry = await ethers.getContractFactory('IssuerRegistry');
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();

  const CredentialRegistry = await ethers.getContractFactory('CredentialRegistry');
  const credentialRegistry = await CredentialRegistry.deploy(
    await issuerRegistry.getAddress()
  );
  await credentialRegistry.waitForDeployment();

  console.log('IssuerRegistry    :', await issuerRegistry.getAddress());
  console.log('CredentialRegistry:', await credentialRegistry.getAddress());

  // 2. Owner registers the university as an authorised issuer, and registers our oracle
  //    account as THE accreditation oracle (so updateIssuerStatus will accept it).
  await (await issuerRegistry.addIssuer(university.address, 'Demo University')).wait();
  await (await issuerRegistry.setOracle(oracleSigner.address)).wait();
  console.log('\nUniversity:', university.address);
  console.log('Oracle    :', oracleSigner.address);

  // 3. The university issues a credential.
  const credentialHash = '0x' + '11'.repeat(32);
  await (
    await credentialRegistry
      .connect(university)
      .issueCredential(credentialHash, 'bafybeidemo')
  ).wait();

  // 4. Verify BEFORE the oracle acts -> should be valid.
  let v = await credentialRegistry.verifyCredential(credentialHash);
  console.log('\n[before] credential valid:', v.valid);

  // 5. Off-chain: the accreditation authority withdraws the university's accreditation.
  const source = new AccreditationSource([
    { issuerId: university.address, accredited: true, body: 'AU-Gov' },
  ]);
  source.revoke(university.address, 'Accreditation withdrawn by authority');

  // 6. The oracle resolves the new status and PUSHES it on-chain via updateIssuerStatus.
  //    The adapter uses the oracle signer registered in step 2 (onlyOracle).
  const oracle = new AccreditationOracle(source);
  const adapter = new IssuerRegistryAdapter(issuerRegistry.connect(oracleSigner));
  const verdict = await oracle.syncIssuer(university.address, adapter);
  console.log('[oracle ] pushed accredited =', verdict.accredited, `(${verdict.status})`);

  // 7. Verify AFTER the oracle acts -> issuer no longer authorised, so credential is invalid.
  v = await credentialRegistry.verifyCredential(credentialHash);
  console.log('[after ] credential valid:', v.valid);

  console.log(
    '\nResult:',
    v.valid === false
      ? 'PASS - oracle revocation took effect on-chain'
      : 'UNEXPECTED - credential still valid'
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
