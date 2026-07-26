/**
 * 认证预言机 —— 独立演示脚本
 *
 * 运行:node scripts/oracleDemo.js
 *
 * 不依赖任何链上合约或组员代码,展示预言机如何:
 *   收到链上认证查询请求 → 查认证数据源 → 把「机构是否仍被认证」写回链上。
 * 等成员 B 的合约就绪后,把 MockChainAdapter 换成 EthersChainAdapter 即可真正上链。
 */

const {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
} = require('../src/oracle');

// 1. 准备认证数据源(模拟权威认证数据库)
const now = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const source = new AccreditationSource([
  { issuerId: 'UNSW', accredited: true, validUntil: now + 365 * ONE_DAY, body: 'AU-Gov' },
  { issuerId: 'FakeCollege', accredited: true, validUntil: now - ONE_DAY, body: 'AU-Gov' }, // 认证过期
  { issuerId: 'BannedInc', accredited: false, validUntil: now + ONE_DAY, body: 'AU-Gov' }, // 认证吊销
]);

// 2. 创建预言机 + 链适配器(演示用 Mock)
const oracle = new AccreditationOracle(source);
const adapter = new MockChainAdapter();
oracle.start(adapter);

// 3. 模拟链上合约发来若干认证查询请求
console.log('=== 认证预言机演示 ===\n');
const queries = [
  ['req-1', 'UNSW'],
  ['req-2', 'FakeCollege'],
  ['req-3', 'BannedInc'],
  ['req-4', 'UnknownOrg'],
];
for (const [requestId, issuerId] of queries) {
  const r = adapter.emitRequest(requestId, issuerId, now);
  const mark = r.accredited ? '✅ 仍被认证' : '❌ 未认证';
  console.log(`[${requestId}] 机构 ${issuerId.padEnd(12)} → ${mark}  (${r.status})`);
}

// 4. 展示「写回链上」的内容
console.log('\n=== 已写回链上的结果(fulfill) ===');
console.log(JSON.stringify(adapter.fulfilled, null, 2));
