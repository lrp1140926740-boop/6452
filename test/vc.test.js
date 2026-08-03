const {
  VC_CONTEXT,
  createVerifiableCredential,
  validateVerifiableCredential,
} = require("../src/storage/vc");

describe("W3C Verifiable Credential module", () => {
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

  test("creates a credential in W3C VC format", () => {
    const credential = createVerifiableCredential(validInput);

    expect(credential["@context"]).toContain(VC_CONTEXT);
    expect(credential.type).toContain("VerifiableCredential");
    expect(credential.type).toContain(
      "UniversityDegreeCredential"
    );

    expect(credential.id).toBe(validInput.credentialId);
    expect(credential.issuer.id).toBe(validInput.issuerId);
    expect(credential.issuer.name).toBe(validInput.issuerName);

    expect(credential.credentialSubject.id).toBe(
      validInput.studentId
    );

    expect(credential.credentialSubject.degree.name).toBe(
      validInput.degree
    );
  });

  test("uses the current date when issuanceDate is not supplied", () => {
    const inputWithoutDate = { ...validInput };
    delete inputWithoutDate.issuanceDate;

    const credential =
      createVerifiableCredential(inputWithoutDate);

    expect(
      Number.isNaN(Date.parse(credential.issuanceDate))
    ).toBe(false);
  });

  test("rejects missing required input", () => {
    const invalidInput = { ...validInput };
    delete invalidInput.studentId;

    expect(() =>
      createVerifiableCredential(invalidInput)
    ).toThrow("Missing or invalid field: studentId");
  });

  test("rejects an invalid issuance date", () => {
    const invalidInput = {
      ...validInput,
      issuanceDate: "not-a-date",
    };

    expect(() =>
      createVerifiableCredential(invalidInput)
    ).toThrow("Invalid issuanceDate");
  });

  test("validates a correctly structured credential", () => {
    const credential = createVerifiableCredential(validInput);

    const result =
      validateVerifiableCredential(credential);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("detects a missing VC context", () => {
    const credential = createVerifiableCredential(validInput);
    delete credential["@context"];

    const result =
      validateVerifiableCredential(credential);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Missing valid @context"
    );
  });

  test("detects a missing credential subject", () => {
    const credential = createVerifiableCredential(validInput);
    delete credential.credentialSubject;

    const result =
      validateVerifiableCredential(credential);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Missing credentialSubject"
    );
  });
});
