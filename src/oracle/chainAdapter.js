/**
 * 链适配器(Chain Adapter)
 *
 * 把「预言机 ↔ 链上合约」的交互抽象成统一接口,让预言机核心不直接依赖 ethers 或具体合约:
 *   - onRequest(handler):订阅链上发来的「认证查询请求」
 *   - fulfill(requestId, result):把认证结果写回链上
 *
 * 本文件提供两种实现:
 *   1. MockChainAdapter —— 纯内存模拟,用于独立开发、单元测试、离线 Demo(现在就能用);
 *   2. EthersChainAdapter —— 真实上链骨架,等成员 B 的合约就绪后接入(依赖注入 contract,
 *      不在本项目里硬引入 ethers,避免与他人依赖冲突)。
 */

/**
 * 模拟链适配器:用内存事件模拟链上请求与履行,方便测试和离线演示
 */
class MockChainAdapter {
  constructor() {
    this._handler = null;
    this.fulfilled = []; // 记录所有被「写回链上」的结果,便于断言与演示
  }

  /** 订阅链上请求 */
  onRequest(handler) {
    this._handler = handler;
  }

  /**
   * 模拟链上合约发出一个认证查询请求(测试/Demo 中手动触发)
   * @param {string} requestId - 请求编号
   * @param {string} issuerId - 待查询机构
   * @param {number} [now] - 可选的判断时间点(便于测试过期逻辑)
   * @returns {object|undefined} 处理器返回的结果
   */
  emitRequest(requestId, issuerId, now) {
    if (!this._handler) {
      throw new Error('尚未注册请求处理器,请先调用 oracle.start(adapter)');
    }
    return this._handler({ requestId, issuerId, now });
  }

  /** 把结果写回链上(这里只记录到内存) */
  fulfill(requestId, result) {
    this.fulfilled.push({ requestId, ...result });
  }
}

/**
 * 真实链适配器(骨架)—— 等成员 B 的合约就绪后启用
 *
 * 用法(集成阶段):
 *   const { ethers } = require('ethers');
 *   const contract = new ethers.Contract(地址, ABI, signer);
 *   const adapter = new EthersChainAdapter(contract);
 *   oracle.start(adapter);
 *
 * ⚠️ 下面的事件名 / 方法名是占位,需和成员 B 的 AuthorisedIssuerRegistry.sol 对齐后修改。
 */
class EthersChainAdapter {
  /**
   * @param {object} contract - 一个 ethers.Contract 实例(由外部注入)
   */
  constructor(contract) {
    if (!contract) {
      throw new Error('EthersChainAdapter 需要注入一个 ethers 合约实例');
    }
    this.contract = contract;
  }

  onRequest(handler) {
    // TODO(集成): 事件名需与合约一致,例如 AccreditationRequested(requestId, issuerId)
    this.contract.on('AccreditationRequested', (requestId, issuerId) => {
      handler({ requestId, issuerId });
    });
  }

  async fulfill(requestId, result) {
    // TODO(集成): 方法名/参数需与合约一致,例如 fulfillAccreditation(requestId, accredited, status)
    const tx = await this.contract.fulfillAccreditation(
      requestId,
      result.accredited,
      result.status
    );
    return tx.wait();
  }
}

module.exports = { MockChainAdapter, EthersChainAdapter };
