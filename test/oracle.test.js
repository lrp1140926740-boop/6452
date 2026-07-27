const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
  STATUS,
} = require('../src/oracle');

// A fixed "current time" so expiry-related tests are reproducible
const NOW = 1_700_000_000_000; // some fixed ms timestamp
const ONE_DAY = 24 * 60 * 60 * 1000;

function buildSource() {
  return new AccreditationSource([
    { issuerId: 'issuer-alice', accredited: true, validUntil: NOW + ONE_DAY, body: 'GovCA' },
    { issuerId: 'issuer-bob', accredited: true, validUntil: NOW - ONE_DAY, body: 'GovCA' }, // expired
    { issuerId: 'issuer-carol', accredited: false, validUntil: NOW + ONE_DAY, body: 'GovCA' }, // revoked
  ]);
}

describe('AccreditationSource', () => {
  test('an accredited, in-date issuer -> ACCREDITED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-alice', NOW);
    expect(r.accredited).toBe(true);
    expect(r.status).toBe(STATUS.ACCREDITED);
  });

  test('an expired accreditation -> EXPIRED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-bob', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.EXPIRED);
  });

  test('a revoked accreditation -> REVOKED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-carol', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.REVOKED);
  });

  test('an unknown issuer -> NOT_FOUND', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-unknown', NOW);
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

describe('AccreditationOracle', () => {
  test('resolve() returns a structured accreditation verdict', () => {
    const oracle = new AccreditationOracle(buildSource());
    const out = oracle.resolve('issuer-alice', NOW);
    expect(out).toEqual({
      issuerId: 'issuer-alice',
      accredited: true,
      status: STATUS.ACCREDITED,
      checkedAt: NOW,
    });
  });

  test('constructing with a non-source throws', () => {
    expect(() => new AccreditationOracle({})).toThrow();
  });

  test('via the chain adapter: on-chain request -> lookup -> written back on-chain', () => {
    const oracle = new AccreditationOracle(buildSource());
    const adapter = new MockChainAdapter();
    oracle.start(adapter);

    // Simulate two requests coming from the on-chain contract
    adapter.emitRequest('req-1', 'issuer-alice', NOW);
    adapter.emitRequest('req-2', 'issuer-carol', NOW);

    expect(adapter.fulfilled).toHaveLength(2);
    expect(adapter.fulfilled[0]).toMatchObject({
      requestId: 'req-1',
      issuerId: 'issuer-alice',
      accredited: true,
      status: STATUS.ACCREDITED,
    });
    expect(adapter.fulfilled[1]).toMatchObject({
      requestId: 'req-2',
      issuerId: 'issuer-carol',
      accredited: false,
      status: STATUS.REVOKED,
    });
  });

  test('emitting before a handler is registered throws', () => {
    const adapter = new MockChainAdapter();
    expect(() => adapter.emitRequest('req-x', 'issuer-alice')).toThrow();
  });
});
