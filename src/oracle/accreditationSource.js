/**
 * 认证数据源(Accreditation Source)
 *
 * 模拟一个链下的「权威认证数据库」:记录每个签发机构(issuer)当前是否仍被认证、
 * 认证有效期、由哪个认证机构颁发。真实世界里这一层可能是政府或行业认证机构的 API,
 * 这里用内存数据 + 可注入的方式模拟,方便独立开发和单元测试。
 *
 * 预言机(AccreditationOracle)会调用本模块,把「机构是否仍被认证」的结论喂给链上。
 */

// 认证状态码
const STATUS = {
  ACCREDITED: 'ACCREDITED', // 认证有效
  NOT_FOUND: 'NOT_FOUND', // 数据源里查无此机构
  REVOKED: 'REVOKED', // 认证已被吊销
  EXPIRED: 'EXPIRED', // 认证已过期
};

class AccreditationSource {
  /**
   * @param {Array<object>} records - 初始机构记录数组,元素形如:
   *   { issuerId, accredited, validUntil, body }
   */
  constructor(records = []) {
    // 用 Map 以 issuerId 为键存储,查询更快
    this._db = new Map();
    for (const r of records) {
      this.upsertIssuer(r);
    }
  }

  /**
   * 新增或更新一个机构的认证记录
   * @param {object} record
   * @param {string} record.issuerId - 机构唯一标识(地址或名称)
   * @param {boolean} [record.accredited=true] - 是否被认证
   * @param {number} [record.validUntil=Infinity] - 认证有效期(毫秒时间戳)
   * @param {string} [record.body='Unknown'] - 颁发认证的机构名
   */
  upsertIssuer(record) {
    if (!record || !record.issuerId) {
      throw new Error('机构记录必须包含 issuerId');
    }
    this._db.set(record.issuerId, {
      issuerId: record.issuerId,
      accredited: record.accredited !== false, // 默认 true
      validUntil: record.validUntil ?? Infinity,
      body: record.body ?? 'Unknown',
      revokedReason: record.revokedReason ?? null,
    });
  }

  /**
   * 吊销某机构的认证
   * @param {string} issuerId
   * @param {string} [reason] - 吊销原因
   */
  revoke(issuerId, reason = '未说明原因') {
    const rec = this._db.get(issuerId);
    if (!rec) {
      throw new Error(`机构不存在,无法吊销: ${issuerId}`);
    }
    rec.accredited = false;
    rec.revokedReason = reason;
  }

  /**
   * 查询原始记录
   * @param {string} issuerId
   * @returns {object|null}
   */
  lookup(issuerId) {
    return this._db.get(issuerId) ?? null;
  }

  /**
   * 判断某机构在给定时刻是否仍被认证 —— 预言机的核心判据
   * @param {string} issuerId
   * @param {number} [now=Date.now()] - 判断的时间点(毫秒),测试时可传固定值
   * @returns {{ accredited: boolean, status: string, detail: object|null }}
   */
  checkAccreditation(issuerId, now = Date.now()) {
    const rec = this._db.get(issuerId);
    if (!rec) {
      return { accredited: false, status: STATUS.NOT_FOUND, detail: null };
    }
    if (!rec.accredited) {
      return { accredited: false, status: STATUS.REVOKED, detail: rec };
    }
    if (rec.validUntil <= now) {
      return { accredited: false, status: STATUS.EXPIRED, detail: rec };
    }
    return { accredited: true, status: STATUS.ACCREDITED, detail: rec };
  }
}

module.exports = { AccreditationSource, STATUS };
