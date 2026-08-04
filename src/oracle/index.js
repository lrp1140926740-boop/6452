/**
 * Accreditation Oracle module — unified entry point
 *
 * Member E's "oracle" part. Off-chain core (data source + accreditation logic) plus a
 * chain-adapter abstraction. MockChainAdapter runs and unit-tests it in isolation;
 * IssuerRegistryAdapter pushes status onto member B's on-chain IssuerRegistry via
 * updateIssuerStatus(address, bool).
 */

const { AccreditationSource, STATUS } = require('./accreditationSource');
const { AccreditationOracle } = require('./accreditationOracle');
const { MockChainAdapter, IssuerRegistryAdapter } = require('./chainAdapter');

module.exports = {
  AccreditationSource,
  AccreditationOracle,
  MockChainAdapter,
  IssuerRegistryAdapter,
  STATUS,
};
