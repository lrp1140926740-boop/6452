const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
  STATUS,
} = require('../src/oracle');

// 固定的「当前时间」,让过期相关测试可复现
const NOW = 1_700_000_000_000; // 某个固定毫秒时间戳
const ONE_DAY = 24 * 60 * 60 * 1000;

function buildSource() {
  return new AccreditationSource([
    { issuerId: 'issuer-alice', accredited: true, validUntil: NOW + ONE_DAY, body: 'GovCA' },
    { issuerId: 'issuer-bob', accredited: true, validUntil: NOW - ONE_DAY, body: 'GovCA' }, // 已过期
    { issuerId: 'issuer-carol', accredited: false, validUntil: NOW + ONE_DAY, body: 'GovCA' }, // 已吊销
  ]);
}

describe('认证数据源 AccreditationSource', () => {
  test('认证有效的机构 → ACCREDITED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-alice', NOW);
    expect(r.accredited).toBe(true);
    expect(r.status).toBe(STATUS.ACCREDITED);
  });

  test('认证已过期 → EXPIRED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-bob', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.EXPIRED);
  });

  test('认证已吊销 → REVOKED', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-carol', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.REVOKED);
  });

  test('查无此机构 → NOT_FOUND', () => {
    const src = buildSource();
    const r = src.checkAccreditation('issuer-unknown', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.NOT_FOUND);
  });

  test('revoke() 之后机构变为未认证', () => {
    const src = buildSource();
    src.revoke('issuer-alice', '违规操作');
    const r = src.checkAccreditation('issuer-alice', NOW);
    expect(r.accredited).toBe(false);
    expect(r.status).toBe(STATUS.REVOKED);
  });
});

describe('认证预言机 AccreditationOracle', () => {
  test('resolve() 返回结构化认证结论', () => {
    const oracle = new AccreditationOracle(buildSource());
    const out = oracle.resolve('issuer-alice', NOW);
    expect(out).toEqual({
      issuerId: 'issuer-alice',
      accredited: true,
      status: STATUS.ACCREDITED,
      checkedAt: NOW,
    });
  });

  test('构造预言机时传入非数据源 → 抛错', () => {
    expect(() => new AccreditationOracle({})).toThrow();
  });

  test('通过链适配器:收到链上请求 → 查结果 → 写回链上', () => {
    const oracle = new AccreditationOracle(buildSource());
    const adapter = new MockChainAdapter();
    oracle.start(adapter);

    // 模拟链上合约发来两个请求
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

  test('未注册处理器就 emit → 抛错', () => {
    const adapter = new MockChainAdapter();
    expect(() => adapter.emitRequest('req-x', 'issuer-alice')).toThrow();
  });
});
