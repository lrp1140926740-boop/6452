const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let issuerRegistry;
  let credentialRegistry;
  let owner;
  let university;
  let other;

  const credentialHash =
    "0x" + "11".repeat(32);

  const cid =
    "bafybeimockcredential123";

  beforeEach(async function () {
    [owner, university, other] =
      await ethers.getSigners();

    const IssuerRegistry =
      await ethers.getContractFactory(
        "IssuerRegistry"
      );

    issuerRegistry =
      await IssuerRegistry.deploy();

    await issuerRegistry.waitForDeployment();

    const CredentialRegistry =
      await ethers.getContractFactory(
        "CredentialRegistry"
      );

    credentialRegistry =
      await CredentialRegistry.deploy(
        await issuerRegistry.getAddress()
      );

    await credentialRegistry.waitForDeployment();

    await issuerRegistry.addIssuer(
      university.address,
      "Test University"
    );
  });

  describe("Deployment", function () {
    it("stores the issuer registry address", async function () {
      expect(
        await credentialRegistry.issuerRegistry()
      ).to.equal(
        await issuerRegistry.getAddress()
      );
    });

    it("rejects a zero issuer registry address", async function () {
      const CredentialRegistry =
        await ethers.getContractFactory(
          "CredentialRegistry"
        );

      await expect(
        CredentialRegistry.deploy(
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        CredentialRegistry,
        "InvalidIssuerRegistry"
      );
    });
  });

  describe("Issuing credentials", function () {
    it("allows an authorised issuer to issue a credential", async function () {
      await expect(
        credentialRegistry
          .connect(university)
          .issueCredential(
            credentialHash,
            cid
          )
      ).to.emit(
        credentialRegistry,
        "CredentialIssued"
      );
    });

    it("stores the credential data", async function () {
      await credentialRegistry
        .connect(university)
        .issueCredential(
          credentialHash,
          cid
        );

      const credential =
        await credentialRegistry
          .getCredential(credentialHash);

      expect(
        credential.credentialHash
      ).to.equal(credentialHash);

      expect(
        credential.issuer
      ).to.equal(university.address);

      expect(
        credential.cid
      ).to.equal(cid);

      expect(
        credential.revoked
      ).to.equal(false);

      expect(
        credential.exists
      ).to.equal(true);
    });

    it("rejects an unauthorised issuer", async function () {
      await expect(
        credentialRegistry
          .connect(other)
          .issueCredential(
            credentialHash,
            cid
          )
      ).to.be.revertedWithCustomError(
        credentialRegistry,
        "NotAuthorisedIssuer"
      );
    });

    it("rejects a duplicate credential", async function () {
      await credentialRegistry
        .connect(university)
        .issueCredential(
          credentialHash,
          cid
        );

      await expect(
        credentialRegistry
          .connect(university)
          .issueCredential(
            credentialHash,
            cid
          )
      ).to.be.revertedWithCustomError(
        credentialRegistry,
        "CredentialAlreadyExists"
      );
    });

    it("rejects an empty CID", async function () {
      await expect(
        credentialRegistry
          .connect(university)
          .issueCredential(
            credentialHash,
            ""
          )
      ).to.be.revertedWithCustomError(
        credentialRegistry,
        "EmptyCID"
      );
    });
  });

  describe("Revoking credentials", function () {
    beforeEach(async function () {
      await credentialRegistry
        .connect(university)
        .issueCredential(
          credentialHash,
          cid
        );
    });

    it("allows the original issuer to revoke a credential", async function () {
      await expect(
        credentialRegistry
          .connect(university)
          .revokeCredential(
            credentialHash
          )
      ).to.emit(
        credentialRegistry,
        "CredentialRevoked"
      );

      const credential =
        await credentialRegistry
          .getCredential(credentialHash);

      expect(
        credential.revoked
      ).to.equal(true);
    });

    it("rejects revocation by another address", async function () {
      await expect(
        credentialRegistry
          .connect(other)
          .revokeCredential(
            credentialHash
          )
      ).to.be.revertedWithCustomError(
        credentialRegistry,
        "NotCredentialIssuer"
      );
    });

    it("rejects a second revocation", async function () {
      await credentialRegistry
        .connect(university)
        .revokeCredential(
          credentialHash
        );

      await expect(
        credentialRegistry
          .connect(university)
          .revokeCredential(
            credentialHash
          )
      ).to.be.revertedWithCustomError(
        credentialRegistry,
        "CredentialAlreadyRevoked"
      );
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await credentialRegistry
        .connect(university)
        .issueCredential(
          credentialHash,
          cid
        );
    });

    it("verifies a valid credential", async function () {
      const result =
        await credentialRegistry
          .verifyCredential(
            credentialHash
          );

      expect(result.valid).to.equal(true);
      expect(result.issuer)
        .to.equal(university.address);
      expect(result.cid).to.equal(cid);
      expect(result.revoked)
        .to.equal(false);
    });

    it("marks a revoked credential as invalid", async function () {
      await credentialRegistry
        .connect(university)
        .revokeCredential(
          credentialHash
        );

      const result =
        await credentialRegistry
          .verifyCredential(
            credentialHash
          );

      expect(result.valid).to.equal(false);
      expect(result.revoked)
        .to.equal(true);
    });

    it("marks the credential invalid if the issuer is no longer authorised", async function () {
      await issuerRegistry.removeIssuer(
        university.address
      );

      const result =
        await credentialRegistry
          .verifyCredential(
            credentialHash
          );

      expect(result.valid).to.equal(false);
    });

    it("returns invalid for an unknown credential", async function () {
      const unknownHash =
        "0x" + "22".repeat(32);

      const result =
        await credentialRegistry
          .verifyCredential(
            unknownHash
          );

      expect(result.valid).to.equal(false);
    });
  });
});