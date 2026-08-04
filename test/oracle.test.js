const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
  STATUS,
} = require('../src/oracle');

// A fixed "current time" so expiry-related tests are reproducible
const NOW = 1_700_000_000_000; // some fixed ms timestamp
const ONE_DAY = 24 * 60 * 60 * 1000;

// In production these ids are on-chain addresses (0x...); any stable string works for the
// off-chain logic, so readable ids are used here.
function buildSource() {
  return new AccreditationSource([
    { issuerId: 'issuer-alice', accredited: true, validUntil: NOW + ONE_DAY, body: 'GovCA' },
    { issuerId: 'issuer-bob', accredited: true, validUntil: NOW - ONE_DAY, body: 'GovCA' }, // expired
    { issuerId: 'issuer-carol', accredited: false, validUntil: NOW + ONE_DAY, body: 'GovCA' }, // revoked
  ]);
}

describe('AccreditationSource', () => {
  test('an accredited, in-date issuer -> ACCREDITED', () => {
    const r = buildSource().checkAccreditation('issuer-alice', NOW);
    expect(r.accredited).toBe(true);
    expect(r.status).toBe(STATUS.ACCREDITED);
  });

  test('an expired accreditation -> EXPIRED', () => {
    const r = buildSource().checkAccreditation('issuer-bob', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.EXPIRED);
  });

  test('a revoked accreditation -> REVOKED', () => {
    const r = buildSource().checkAccreditation('issuer-carol', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.REVOKED);
  });

  test('an unknown issuer -> NOT_FOUND', () => {
    const r = buildSource().checkAccreditation('issuer-unknown', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.NOT_FOUND);
  });

  test('after revoke() the issuer becomes unaccredited', () => {
    const src = buildSource();
    src.revoke('issuer-alice', 'Misconduct');
    const r = src.checkAccreditation('issuer-alice', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.REVOKED);
  });
});

describe('AccreditationOracle (push model)', () => {
  test('resolve() returns a structured verdict', () => {
    const oracle = new AccreditationOracle(buildSource());
    const out = oracle.resolve('issuer-alice', NOW);
    expect(out).toEqual({
      issuerAddress: 'issuer-alice',
      accredited: true,
      status: STATUS.ACCREDITED,
      checkedAt: NOW,
    });
  });

  test('constructing with a non-source throws', () => {
    expect(() => new AccreditationOracle({})).toThrow();
  });

  test('syncIssuer() resolves and pushes the status via the adapter', async () => {
    const oracle = new AccreditationOracle(buildSource());
    const adapter = new MockChainAdapter();
    const verdict = await oracle.syncIssuer('issuer-carol', adapter, NOW);
    expect(verdict.accredited).toBe(false);
    expect(verdict.status).toBe(STATUS.REVOKED);
    expect(adapter.updates).toEqual([
      { issuerAddress: 'issuer-carol', authorised: false },
    ]);
  });

  test('syncAll() pushes every issuer status in order', async () => {
    const oracle = new AccreditationOracle(buildSource());
    const adapter = new MockChainAdapter();
    await oracle.syncAll(['issuer-alice', 'issuer-bob', 'issuer-carol'], adapter, NOW);
    expect(adapter.updates).toEqual([
      { issuerAddress: 'issuer-alice', authorised: true },
      { issuerAddress: 'issuer-bob', authorised: false },
      { issuerAddress: 'issuer-carol', authorised: false },
    ]);
  });

  test('syncIssuer() with an invalid adapter throws', async () => {
    const oracle = new AccreditationOracle(buildSource());
    await expect(oracle.syncIssuer('issuer-alice', {}, NOW)).rejects.toThrow();
  });
});
