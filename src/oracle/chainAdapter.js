/**
 * Chain Adapter
 *
 * Abstracts the "oracle <-> on-chain contract" interaction behind a single interface so the
 * oracle core never depends on ethers or a specific contract directly:
 *   - onRequest(handler): subscribe to "accreditation query" requests from the chain
 *   - fulfill(requestId, result): write the accreditation result back on-chain
 *
 * This file provides two implementations:
 *   1. MockChainAdapter — a pure in-memory mock for isolated development, unit tests and
 *      offline demos (usable right now);
 *   2. EthersChainAdapter — the real on-chain skeleton, to be wired up once member B's
 *      contract is ready (the contract is injected; we do not hard-depend on ethers here to
 *      avoid clashing with others' dependencies).
 */

/**
 * Mock chain adapter: simulates on-chain requests and fulfilments in memory, for tests and
 * offline demos.
 */
class MockChainAdapter {
  constructor() {
    this._handler = null;
    this.fulfilled = []; // records every result "written back on-chain", for assertions/demo
  }

  /** Subscribe to on-chain requests */
  onRequest(handler) {
    this._handler = handler;
  }

  /**
   * Simulate the on-chain contract emitting an accreditation query request (triggered
   * manually in tests/demo)
   * @param {string} requestId - request id
   * @param {string} issuerId - issuer to query
   * @param {number} [now] - optional evaluation time (handy for testing expiry logic)
   * @returns {object|undefined} the result returned by the handler
   */
  emitRequest(requestId, issuerId, now) {
    if (!this._handler) {
      throw new Error('No request handler registered; call oracle.start(adapter) first');
    }
    return this._handler({ requestId, issuerId, now });
  }

  /** Write the result back on-chain (recorded in memory here) */
  fulfill(requestId, result) {
    this.fulfilled.push({ requestId, ...result });
  }
}

/**
 * Real chain adapter (skeleton) — enable once member B's contract is ready.
 *
 * Usage (integration phase):
 *   const { ethers } = require('ethers');
 *   const contract = new ethers.Contract(address, ABI, signer);
 *   const adapter = new EthersChainAdapter(contract);
 *   oracle.start(adapter);
 *
 * NOTE: the event/method names below are placeholders; align them with member B's
 * AuthorisedIssuerRegistry.sol before use.
 */
class EthersChainAdapter {
  /**
   * @param {object} contract - an ethers.Contract instance (injected from outside)
   */
  constructor(contract) {
    if (!contract) {
      throw new Error('EthersChainAdapter requires an injected ethers contract instance');
    }
    this.contract = contract;
  }

  onRequest(handler) {
    // TODO(integration): event name must match the contract, e.g. AccreditationRequested(requestId, issuerId)
    this.contract.on('AccreditationRequested', (requestId, issuerId) => {
      handler({ requestId, issuerId });
    });
  }

  async fulfill(requestId, result) {
    // TODO(integration): method/params must match the contract, e.g. fulfillAccreditation(requestId, accredited, status)
    const tx = await this.contract.fulfillAccreditation(
      requestId,
      result.accredited,
      result.status
    );
    return tx.wait();
  }
}

module.exports = { MockChainAdapter, EthersChainAdapter };
