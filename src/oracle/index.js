/**
 * 认证预言机模块 —— 统一入口
 *
 * 成员 E 负责的「预言机」部分。当前为自包含实现:核心逻辑 + 数据源 + 链适配器抽象,
 * 可独立运行和单元测试;「真实上链」部分(EthersChainAdapter)预留接口,
 * 等成员 B 的 AuthorisedIssuerRegistry.sol 就绪后对接。
 */

const { AccreditationSource, STATUS } = require('./accreditationSource');
const { AccreditationOracle } = require('./accreditationOracle');
const { MockChainAdapter, EthersChainAdapter } = require('./chainAdapter');

module.exports = {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
  EthersChainAdapter,
  STATUS,
};
