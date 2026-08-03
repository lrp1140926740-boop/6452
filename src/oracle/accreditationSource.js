/**
 * Accreditation Source
 *
 * Simulates an off-chain "authoritative accreditation database": for each issuer it records
 * whether they are currently accredited, when the accreditation expires, and which body
 * issued it. In the real world this layer might be a government or industry accreditation
 * authority's API; here we model it with in-memory, injectable data so the module can be
 * developed and unit-tested in isolation.
 *
 * The AccreditationOracle calls this module to feed "is the issuer still accredited?" to the
 * chain.
 */

// Accreditation status codes
const STATUS = {
  ACCREDITED: 'ACCREDITED', // accreditation is valid
  NOT_FOUND: 'NOT_FOUND', // issuer not present in the source
  REVOKED: 'REVOKED', // accreditation has been revoked
  EXPIRED: 'EXPIRED', // accreditation has expired
};

class AccreditationSource {
  /**
   * @param {Array<object>} records - initial issuer records, each shaped like:
   *   { issuerId, accredited, validUntil, body }
   */
  constructor(records = []) {
    // Keyed by issuerId in a Map for fast lookup
    this._db = new Map();
    for (const r of records) {
      this.upsertIssuer(r);
    }
  }

  /**
   * Insert or update an issuer's accreditation record
   * @param {object} record
   * @param {string} record.issuerId - unique issuer identifier (address or name)
   * @param {boolean} [record.accredited=true] - whether the issuer is accredited
   * @param {number} [record.validUntil=Infinity] - accreditation expiry (ms timestamp)
   * @param {string} [record.body='Unknown'] - name of the accrediting body
   */
  upsertIssuer(record) {
    if (!record || !record.issuerId) {
      throw new Error('An issuer record must include issuerId');
    }
    this._db.set(record.issuerId, {
      issuerId: record.issuerId,
      accredited: record.accredited !== false, // defaults to true
      validUntil: record.validUntil ?? Infinity,
      body: record.body ?? 'Unknown',
      revokedReason: record.revokedReason ?? null,
    });
  }

  /**
   * Revoke an issuer's accreditation
   * @param {string} issuerId
   * @param {string} [reason] - reason for revocation
   */
  revoke(issuerId, reason = 'No reason given') {
    const rec = this._db.get(issuerId);
    if (!rec) {
      throw new Error(`Issuer not found, cannot revoke: ${issuerId}`);
    }
    rec.accredited = false;
    rec.revokedReason = reason;
  }

  /**
   * Look up the raw record
   * @param {string} issuerId
   * @returns {object|null}
   */
  lookup(issuerId) {
    return this._db.get(issuerId) ?? null;
  }

  /**
   * Decide whether an issuer is still accredited at a given time — the oracle's core rule
   * @param {string} issuerId
   * @param {number} [now=Date.now()] - evaluation time (ms); pass a fixed value in tests
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
