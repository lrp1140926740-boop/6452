const OFF_CHAIN_FIELDS = [
  "credentialId",
  "studentId",
  "studentName",
  "email",
  "dateOfBirth",
  "degree",
  "major",
  "graduationDate",
  "grade",
];

function separateCredentialData(credential, metadata) {
  const offChainData = {};

  for (const field of OFF_CHAIN_FIELDS) {
    if (credential[field] !== undefined) {
      offChainData[field] = credential[field];
    }
  }

  const onChainData = {
    credentialHash: metadata.credentialHash,
    issuerAddress: metadata.issuerAddress,
    issuedAt: metadata.issuedAt,
    expiryDate: metadata.expiryDate,
    revoked: metadata.revoked ?? false,
    ipfsCid: metadata.ipfsCid ?? null,
  };

  return {
    onChainData,
    offChainData,
  };
}

module.exports = {
  OFF_CHAIN_FIELDS,
  separateCredentialData,
};