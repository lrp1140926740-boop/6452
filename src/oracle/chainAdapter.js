/**
 * Chain Adapter
 *
 * Abstracts how the oracle pushes accreditation results onto the chain, so the oracle core
 * never depends on ethers or a specific contract directly:
 *   - pushStatus(issuerAddress, authorised): write an issuer's accreditation status on-chain.
 *
 * Interaction model: PUSH. The oracle decides off-chain whether an issuer is still
 * accredited, then actively pushes that status on-chain via updateIssuerStatus. Member B's
 * IssuerRegistry exposes setOracle() plus the onlyOracle-guarded updateIssuerStatus(); it
 * emits no request event, so there is nothing for the oracle to listen for.
 *
 * Two implementations:
 *   1. MockChainAdapter — records pushes in memory, for unit tests and offline demos;
 *   2. IssuerRegistryAdapter — the real adapter that calls member B's IssuerRegistry method
 *      updateIssuerStatus(address, bool). The ethers.Contract is injected, so this module
 *      never hard-depends on ethers.
 */

/**
 * Mock chain adapter: records every status push in memory, for tests and offline demos.
 */
class MockChainAdapter {
  constructor() {
    this.updates = []; // every { issuerAddress, authorised } pushed "on-chain"
  }

  /**
   * Record an issuer's accreditation status (stands in for an on-chain transaction).
   * @param {string} issuerAddress
   * @param {boolean} authorised
   * @returns {Promise<object>}
   */
  async pushStatus(issuerAddress, authorised) {
    this.updates.push({ issuerAddress, authorised });
    return { issuerAddress, authorised };
  }
}

/**
 * Real chain adapter — pushes status onto member B's IssuerRegistry contract.
 *
 * Usage (integration):
 *   const { ethers } = require('hardhat');
 *   const registry = await ethers.getContractAt('IssuerRegistry', address, oracleSigner);
 *   const adapter = new IssuerRegistryAdapter(registry);
 *   await oracle.syncIssuer(issuerAddress, adapter);
 *
 * IMPORTANT: the injected contract MUST be connected to the signer registered via
 * IssuerRegistry.setOracle(), otherwise updateIssuerStatus reverts with NotOracle().
 */
class IssuerRegistryAdapter {
  /**
   * @param {object} contract - an ethers.Contract for IssuerRegistry (injected)
   */
  constructor(contract) {
    if (!contract) {
      throw new Error('IssuerRegistryAdapter requires an injected IssuerRegistry contract');
    }
    this.contract = contract;
  }

  /**
   * Push an issuer's accreditation status on-chain by calling updateIssuerStatus.
   * @param {string} issuerAddress
   * @param {boolean} authorised
   * @returns {Promise<object>} the mined transaction receipt
   */
  async pushStatus(issuerAddress, authorised) {
    const tx = await this.contract.updateIssuerStatus(issuerAddress, authorised);
    return tx.wait();
  }
}

module.exports = { MockChainAdapter, IssuerRegistryAdapter };
