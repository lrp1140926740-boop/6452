/**
 * Accreditation Oracle module — unified entry point
 *
 * Member E's "oracle" part. Currently a self-contained implementation: core logic + data
 * source + chain-adapter abstraction, runnable and unit-testable in isolation. The "real
 * on-chain" part (EthersChainAdapter) is left as an interface, to be wired up once member B's
 * AuthorisedIssuerRegistry.sol is ready.
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
