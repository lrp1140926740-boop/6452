const {
  createContractHash,
  prepareCredential,
} = require("../src/storage/credentialProcessor");

describe("W3C VC and credential hash integration", () => {
  const validInput = {
    credentialId: "urn:uuid:credential-001",
    issuerId: "did:example:unsw",
    issuerName: "University of New South Wales",
    studentId: "did:example:student-001",
    studentName: "Example Student",
    degree: "Bachelor of Engineering",
    major: "Computer Engineering",
    graduationDate: "2026-07-01",
    issuanceDate: "2026-07-20T10:00:00.000Z",
  };

  test("creates a W3C VC and a Solidity bytes32 hash", () => {
    const result =
      prepareCredential(validInput);

    expect(result.credentialJson.id).toBe(
      validInput.credentialId
    );

    expect(result.credentialJson.issuer.id).toBe(
      validInput.issuerId
    );

    expect(result.credentialHash).toMatch(
      /^0x[0-9a-f]{64}$/
    );

    expect(result.credentialHash).toHaveLength(66);
  });

  test("produces the same hash for reordered object keys", () => {
    const firstCredential = {
      issuer: {
        id: "did:example:unsw",
        name: "UNSW",
      },
      degree: "Bachelor of Engineering",
      student: {
        id: "student-001",
        name: "Example Student",
      },
    };

    const reorderedCredential = {
      student: {
        name: "Example Student",
        id: "student-001",
      },
      degree: "Bachelor of Engineering",
      issuer: {
        name: "UNSW",
        id: "did:example:unsw",
      },
    };

    expect(
      createContractHash(firstCredential)
    ).toBe(
      createContractHash(reorderedCredential)
    );
  });

  test("produces a different hash when VC data changes", () => {
    const original =
      prepareCredential(validInput);

    const modified =
      prepareCredential({
        ...validInput,
        major: "Software Engineering",
      });

    expect(original.credentialHash).not.toBe(
      modified.credentialHash
    );
  });

  test("produces the same hash for identical credential data", () => {
    const first =
      prepareCredential(validInput);

    const second =
      prepareCredential(validInput);

    expect(first.credentialHash).toBe(
      second.credentialHash
    );
  });
});
