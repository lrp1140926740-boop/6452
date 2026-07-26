/**
 * Accreditation Oracle — standalone demo script
 *
 * Run: node scripts/oracleDemo.js
 *
 * Depends on no on-chain contract or teammate code. It shows how the oracle:
 *   receives an on-chain accreditation query -> checks the accreditation source ->
 *   writes "is the issuer still accredited?" back on-chain.
 * Once member B's contract is ready, swap MockChainAdapter for EthersChainAdapter to go
 * on-chain for real.
 */

const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
} = require('../src/oracle');

// 1. Prepare the accreditation source (a mock authoritative accreditation database)
const now = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const source = new AccreditationSource([
  { issuerId: 'UNSW', accredited: true, validUntil: now + 365 * ONE_DAY, body: 'AU-Gov' },
  { issuerId: 'FakeCollege', accredited: true, validUntil: now - ONE_DAY, body: 'AU-Gov' }, // expired
  { issuerId: 'BannedInc', accredited: false, validUntil: now + ONE_DAY, body: 'AU-Gov' }, // revoked
]);

// 2. Create the oracle + chain adapter (Mock for the demo)
const oracle = new AccreditationOracle(source);
const adapter = new MockChainAdapter();
oracle.start(adapter);

// 3. Simulate several accreditation query requests coming from the on-chain contract
console.log('=== Accreditation Oracle demo ===\n');
const queries = [
  ['req-1', 'UNSW'],
  ['req-2', 'FakeCollege'],
  ['req-3', 'BannedInc'],
  ['req-4', 'UnknownOrg'],
];
for (const [requestId, issuerId] of queries) {
  const r = adapter.emitRequest(requestId, issuerId, now);
  const mark = r.accredited ? 'ACCREDITED' : 'NOT accredited';
  console.log(`[${requestId}] issuer ${issuerId.padEnd(12)} -> ${mark}  (${r.status})`);
}

// 4. Show what was "written back on-chain"
console.log('\n=== Results written back on-chain (fulfill) ===');
console.log(JSON.stringify(adapter.fulfilled, null, 2));
