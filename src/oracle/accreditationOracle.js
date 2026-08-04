/**
 * Accreditation Oracle — core logic
 *
 * Responsibility: feed the off-chain fact "is this issuer still accredited?" to the chain.
 *
 * Interaction model (PUSH): the oracle decides off-chain whether an issuer is still
 * accredited (via AccreditationSource), then pushes that status on-chain by calling member
 * B's IssuerRegistry.updateIssuerStatus(address, bool) through a chain adapter.
 *
 * The chain adapter is injected, so the core stays testable offline with MockChainAdapter
 * and works against the real contract with IssuerRegistryAdapter — the logic is identical.
 */

const { AccreditationSource } = require('./accreditationSource');

class AccreditationOracle {
  /**
   * @param {AccreditationSource} source - the accreditation data source
   */
  constructor(source) {
    if (!(source instanceof AccreditationSource)) {
      throw new Error('AccreditationOracle requires an AccreditationSource instance');
    }
    this.source = source;
  }

  /**
   * Resolve a single accreditation query — the oracle's pure functional core.
   * @param {string} issuerAddress - the issuer's on-chain address (0x...)
   * @param {number} [now=Date.now()] - evaluation time (ms); pass a fixed value in tests
   * @returns {object} { issuerAddress, accredited, status, checkedAt }
   */
  resolve(issuerAddress, now = Date.now()) {
    const result = this.source.checkAccreditation(issuerAddress, now);
    return {
      issuerAddress,
      accredited: result.accredited,
      status: result.status,
      checkedAt: now,
    };
  }

  /**
   * Resolve one issuer and push its status on-chain via the adapter.
   * @param {string} issuerAddress
   * @param {object} adapter - implements pushStatus(issuerAddress, authorised)
   * @param {number} [now=Date.now()]
   * @returns {Promise<object>} the resolved verdict
   */
  async syncIssuer(issuerAddress, adapter, now = Date.now()) {
    if (!adapter || typeof adapter.pushStatus !== 'function') {
      throw new Error('adapter must implement pushStatus(issuerAddress, authorised)');
    }
    const verdict = this.resolve(issuerAddress, now);
    await adapter.pushStatus(issuerAddress, verdict.accredited);
    return verdict;
  }

  /**
   * Resolve and push several issuers in one go.
   * @param {string[]} issuerAddresses
   * @param {object} adapter
   * @param {number} [now=Date.now()]
   * @returns {Promise<object[]>} the resolved verdicts, in the same order
   */
  async syncAll(issuerAddresses, adapter, now = Date.now()) {
    const verdicts = [];
    for (const issuerAddress of issuerAddresses) {
      verdicts.push(await this.syncIssuer(issuerAddress, adapter, now));
    }
    return verdicts;
  }
}

module.exports = { AccreditationOracle };
