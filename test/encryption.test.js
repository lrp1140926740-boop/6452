const {
  encryptCredential,
  decryptCredential,
  hashCredential,
} = require("../src/data-module/encryption");

const {
  separateCredentialData,
} = require("../src/data-module/credentialData");

const {
  demoCredential,
  demoMetadata,
} = require("../src/data-module/demoData");

describe("Encryption module", () => {
  const password = "COMP6452-Demo-Key-2026";

  test("encrypts credential data successfully", () => {
    const encrypted = encryptCredential(
      demoCredential,
      password
    );

    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();

    expect(encrypted.ciphertext).not.toContain(
      demoCredential.studentName
    );
  });

  test("decrypts credential data correctly", () => {
    const encrypted = encryptCredential(
      demoCredential,
      password
    );

    const decrypted = decryptCredential(
      encrypted,
      password
    );

    expect(decrypted).toEqual(demoCredential);
  });

  test("fails when the wrong password is used", () => {
    const encrypted = encryptCredential(
      demoCredential,
      password
    );

    expect(() => {
      decryptCredential(
        encrypted,
        "Wrong-Password-2026"
      );
    }).toThrow();
  });
  
  test("generates identical hash regardless of object key order", () => {
    const a = {
        name: "Alice",
        degree: "IT",
    };

    const b = {
        degree: "IT",
        name: "Alice",
    };

    expect(hashCredential(a))
        .toBe(hashCredential(b));
  });
  
  test("detects modified ciphertext", () => {
    const encrypted = encryptCredential(
      demoCredential,
      password
    );

    const tamperedData = {
      ...encrypted,
      ciphertext:
        encrypted.ciphertext.slice(0, -4) + "AAAA",
    };

    expect(() => {
      decryptCredential(tamperedData, password);
    }).toThrow();
  });

  test("generates the same hash for identical data", () => {
    const firstHash = hashCredential(demoCredential);
    const secondHash = hashCredential(demoCredential);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
  });
});

describe("On-chain and off-chain data separation", () => {
  test("keeps personal information off-chain", () => {
    const credentialHash =
      hashCredential(demoCredential);

    const result = separateCredentialData(
      demoCredential,
      {
        ...demoMetadata,
        credentialHash,
        ipfsCid: "bafybeidemo123",
      }
    );

    expect(result.onChainData.credentialHash).toBe(
      credentialHash
    );

    expect(result.onChainData.ipfsCid).toBe(
      "bafybeidemo123"
    );

    expect(result.offChainData.studentName).toBe(
      "Alice Zhang"
    );

    expect(
      result.onChainData.studentName
    ).toBeUndefined();

    expect(result.onChainData.email).toBeUndefined();

    expect(
      result.onChainData.dateOfBirth
    ).toBeUndefined();
  });
});