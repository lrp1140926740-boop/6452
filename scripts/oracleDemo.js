/**
 * Accreditation Oracle — standalone offline demo (no chain required)
 *
 * Run: node scripts/oracleDemo.js   (or: npm run demo:oracle)
 *
 * Shows the oracle deciding, off-chain, whether each issuer is still accredited and pushing
 * that verdict through a MockChainAdapter (which records what WOULD be written on-chain).
 * The real on-chain version is scripts/oracleIntegration.js.
 */

const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
} = require('../src/oracle');

const now = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;

// In production the id is an on-chain address (0x...); readable ids used here for clarity.
const source = new AccreditationSource([
  { issuerId: 'UNSW', accredited: true, validUntil: now + 365 * ONE_DAY, body: 'AU-Gov' },
  { issuerId: 'FakeCollege', accredited: true, validUntil: now - ONE_DAY, body: 'AU-Gov' }, // expired
  { issuerId: 'BannedInc', accredited: false, validUntil: now + ONE_DAY, body: 'AU-Gov' }, // revoked
]);

async function main() {
  const oracle = new AccreditationOracle(source);
  const adapter = new MockChainAdapter();

  console.log('=== Accreditation Oracle demo (offline) ===\n');
  const verdicts = await oracle.syncAll(
    ['UNSW', 'FakeCollege', 'BannedInc', 'UnknownOrg'],
    adapter,
    now
  );
  for (const v of verdicts) {
    const mark = v.accredited ? 'ACCREDITED' : 'NOT accredited';
    console.log(`issuer ${v.issuerAddress.padEnd(12)} -> ${mark}  (${v.status})`);
  }

  console.log('\n=== What the oracle would push on-chain (updateIssuerStatus) ===');
  console.log(JSON.stringify(adapter.updates, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
