const demoCredential = {
  credentialId: "VC-UNSW-2026-0001",
  studentId: "z1234567",
  studentName: "Alice Zhang",
  email: "alice.zhang@example.com",
  dateOfBirth: "2000-05-18",
  degree: "Master of Information Technology",
  major: "Information Technology",
  graduationDate: "2026-07-20",
  grade: "Distinction",
};

const demoMetadata = {
  issuerAddress:
    "0x1111111111111111111111111111111111111111",
  issuedAt: Math.floor(Date.now() / 1000),
  expiryDate:
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
  revoked: false,
  ipfsCid: null,
};

module.exports = {
  demoCredential,
  demoMetadata,
};