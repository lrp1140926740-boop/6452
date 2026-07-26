/**
 * 认证预言机(Accreditation Oracle)—— 核心逻辑
 *
 * 职责:把链下的「机构是否仍被认证」这一事实,喂给链上合约。
 *
 * 典型工作流(链下预言机服务模式):
 *   1. 链上合约(成员 B 的 AuthorisedIssuerRegistry / 成员 A 的主合约)在需要时
 *      发出一个「认证查询请求」事件;
 *   2. 本预言机监听到请求 → 查认证数据源(AccreditationSource);
 *   3. 把结果通过「链适配器」写回链上(fulfill)。
 *
 * 为了不被组员进度卡住,本模块把「和链上合约对接」抽象成 chainAdapter 接口,
 * 现在用 MockChainAdapter 即可独立运行和测试;等成员 B 的合约就绪后,
 * 换成真实的 ethers 适配器即可,核心逻辑无需改动。
 */

const { AccreditationSource } = require('./accreditationSource');

class AccreditationOracle {
  /**
   * @param {AccreditationSource} source - 认证数据源
   */
  constructor(source) {
    if (!(source instanceof AccreditationSource)) {
      throw new Error('AccreditationOracle 需要一个 AccreditationSource 实例');
    }
    this.source = source;
  }

  /**
   * 解析单条认证查询 —— 预言机对外的纯函数式核心
   * @param {string} issuerId
   * @param {number} [now=Date.now()]
   * @returns {object} 结构化结果,可直接写回链上
   */
  resolve(issuerId, now = Date.now()) {
    const result = this.source.checkAccreditation(issuerId, now);
    return {
      issuerId,
      accredited: result.accredited,
      status: result.status,
      checkedAt: now,
    };
  }

  /**
   * 启动预言机服务:绑定链适配器,自动处理链上发来的认证请求
   * @param {object} chainAdapter - 需实现 onRequest(handler) 与 fulfill(requestId, result)
   */
  start(chainAdapter) {
    if (!chainAdapter || typeof chainAdapter.onRequest !== 'function') {
      throw new Error('chainAdapter 必须实现 onRequest 方法');
    }
    // 注册请求处理器:每当链上来一个请求,就查数据源并把结果履行回链上
    chainAdapter.onRequest((request) => {
      const { requestId, issuerId } = request;
      const result = this.resolve(issuerId, request.now);
      chainAdapter.fulfill(requestId, result);
      return result;
    });
    this.chainAdapter = chainAdapter;
  }
}

module.exports = { AccreditationOracle };
