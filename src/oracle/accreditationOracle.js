/**
 * Accreditation Oracle — core logic
 *
 * Responsibility: feed the off-chain fact "is this issuer still accredited?" to the chain.
 *
 * Typical workflow (off-chain oracle service model):
 *   1. An on-chain contract (member B's AuthorisedIssuerRegistry / member A's main contract)
 *      emits an "accreditation query" request event when needed;
 *   2. This oracle observes the request and queries the accreditation source
 *      (AccreditationSource);
 *   3. It writes the result back on-chain through a "chain adapter" (fulfill).
 *
 * To avoid being blocked by teammates' progress, the "talking to the on-chain contract" part
 * is abstracted behind the chainAdapter interface. Right now MockChainAdapter lets this run
 * and be tested in isolation; once member B's contract is ready, swap in the real ethers
 * adapter and the core logic stays unchanged.
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
   * Resolve a single accreditation query — the oracle's pure functional core
   * @param {string} issuerId
   * @param {number} [now=Date.now()]
   * @returns {object} structured result, ready to be written back on-chain
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
   * Start the oracle service: bind a chain adapter and handle on-chain requests automatically
   * @param {object} chainAdapter - must implement onRequest(handler) and fulfill(requestId, result)
   */
  start(chainAdapter) {
    if (!chainAdapter || typeof chainAdapter.onRequest !== 'function') {
      throw new Error('chainAdapter must implement an onRequest method');
    }
    // Register the request handler: for every incoming request, query the source and fulfill
    // the result back on-chain
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
