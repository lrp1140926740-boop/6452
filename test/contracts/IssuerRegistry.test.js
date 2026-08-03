const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IssuerRegistry", function () {
  let issuerRegistry;
  let owner;
  let university;
  let anotherUniversity;
  let outsider;

  beforeEach(async function () {
    [owner, university, anotherUniversity, outsider] =
      await ethers.getSigners();

    const IssuerRegistry =
      await ethers.getContractFactory("IssuerRegistry");

    issuerRegistry = await IssuerRegistry.deploy();
    await issuerRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the deployer as the owner", async function () {
      expect(await issuerRegistry.owner()).to.equal(owner.address);
    });

    it("should treat an unregistered address as unauthorised", async function () {
      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(false);
    });
  });

  describe("Adding issuers", function () {
    it("should allow the owner to add an issuer", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(true);
    });

    it("should store the issuer name and authorisation status", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      const [name, authorised] =
        await issuerRegistry.getIssuer(university.address);

      expect(name).to.equal("University of New South Wales");
      expect(authorised).to.equal(true);
    });

    it("should emit IssuerAdded when an issuer is added", async function () {
      await expect(
        issuerRegistry.addIssuer(
          university.address,
          "University of New South Wales"
        )
      )
        .to.emit(issuerRegistry, "IssuerAdded")
        .withArgs(
          university.address,
          "University of New South Wales"
        );
    });

    it("should reject attempts by a non-owner to add an issuer", async function () {
      await expect(
        issuerRegistry
          .connect(outsider)
          .addIssuer(
            university.address,
            "University of New South Wales"
          )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "NotOwner"
      );
    });

    it("should reject the zero address", async function () {
      await expect(
        issuerRegistry.addIssuer(
          ethers.ZeroAddress,
          "Invalid University"
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "InvalidIssuerAddress"
      );
    });

    it("should reject an empty issuer name", async function () {
      await expect(
        issuerRegistry.addIssuer(university.address, "")
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "EmptyIssuerName"
      );
    });

    it("should reject an issuer that is already authorised", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      await expect(
        issuerRegistry.addIssuer(
          university.address,
          "Duplicate University"
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "IssuerAlreadyAuthorised"
      );
    });

    it("should support multiple authorised issuers", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      await issuerRegistry.addIssuer(
        anotherUniversity.address,
        "University of Sydney"
      );

      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(true);

      expect(
        await issuerRegistry.isAuthorised(
          anotherUniversity.address
        )
      ).to.equal(true);
    });
  });

  describe("Removing issuers", function () {
    beforeEach(async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );
    });

    it("should allow the owner to remove an issuer", async function () {
      await issuerRegistry.removeIssuer(university.address);

      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(false);
    });

    it("should preserve the issuer name after removal", async function () {
      await issuerRegistry.removeIssuer(university.address);

      const [name, authorised] =
        await issuerRegistry.getIssuer(university.address);

      expect(name).to.equal("University of New South Wales");
      expect(authorised).to.equal(false);
    });

    it("should emit IssuerRemoved when an issuer is removed", async function () {
      await expect(
        issuerRegistry.removeIssuer(university.address)
      )
        .to.emit(issuerRegistry, "IssuerRemoved")
        .withArgs(university.address);
    });

    it("should reject attempts by a non-owner to remove an issuer", async function () {
      await expect(
        issuerRegistry
          .connect(outsider)
          .removeIssuer(university.address)
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "NotOwner"
      );
    });

    it("should reject removal of an unauthorised issuer", async function () {
      await expect(
        issuerRegistry.removeIssuer(
          anotherUniversity.address
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "IssuerNotAuthorised"
      );
    });

    it("should allow a removed issuer to be authorised again", async function () {
      await issuerRegistry.removeIssuer(university.address);

      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(true);
    });
  });

  describe("Updating issuer names", function () {
    beforeEach(async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "UNSW"
      );
    });

    it("should allow the owner to update an issuer name", async function () {
      await issuerRegistry.updateIssuerName(
        university.address,
        "University of New South Wales"
      );

      const [name, authorised] =
        await issuerRegistry.getIssuer(university.address);

      expect(name).to.equal("University of New South Wales");
      expect(authorised).to.equal(true);
    });

    it("should emit IssuerNameUpdated", async function () {
      await expect(
        issuerRegistry.updateIssuerName(
          university.address,
          "University of New South Wales"
        )
      )
        .to.emit(issuerRegistry, "IssuerNameUpdated")
        .withArgs(
          university.address,
          "University of New South Wales"
        );
    });

    it("should reject name updates by a non-owner", async function () {
      await expect(
        issuerRegistry
          .connect(outsider)
          .updateIssuerName(
            university.address,
            "Changed Name"
          )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "NotOwner"
      );
    });

    it("should reject an empty new name", async function () {
      await expect(
        issuerRegistry.updateIssuerName(
          university.address,
          ""
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "EmptyIssuerName"
      );
    });

    it("should reject updates for an unauthorised issuer", async function () {
      await expect(
        issuerRegistry.updateIssuerName(
          anotherUniversity.address,
          "University of Sydney"
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "IssuerNotAuthorised"
      );
    });

    it("should reject updates after the issuer has been removed", async function () {
      await issuerRegistry.removeIssuer(university.address);

      await expect(
        issuerRegistry.updateIssuerName(
          university.address,
          "Changed Name"
        )
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "IssuerNotAuthorised"
      );
    });
  });
  // new test
  describe("Oracle integration", function () {
    let oracle;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      oracle = signers[4];
    });

    it("should allow the owner to set the oracle", async function () {
      await issuerRegistry.setOracle(oracle.address);

      expect(await issuerRegistry.oracle()).to.equal(oracle.address);
    });

    it("should reject setting the zero address as oracle", async function () {
      await expect(
        issuerRegistry.setOracle(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "InvalidOracleAddress"
      );
    });

    it("should reject a non-owner setting the oracle", async function () {
      await expect(
        issuerRegistry
          .connect(outsider)
          .setOracle(oracle.address)
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "NotOwner"
      );
    });

    it("should allow the oracle to update an existing issuer status", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      await issuerRegistry.setOracle(oracle.address);

      await issuerRegistry
        .connect(oracle)
        .updateIssuerStatus(university.address, false);

      expect(
        await issuerRegistry.isAuthorised(university.address)
      ).to.equal(false);
    });

    it("should reject issuer status updates from a non-oracle", async function () {
      await issuerRegistry.addIssuer(
        university.address,
        "University of New South Wales"
      );

      await issuerRegistry.setOracle(oracle.address);

      await expect(
        issuerRegistry
          .connect(outsider)
          .updateIssuerStatus(university.address, false)
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "NotOracle"
      );
    });

    it("should reject oracle updates for an unregistered issuer", async function () {
      await issuerRegistry.setOracle(oracle.address);

      await expect(
        issuerRegistry
          .connect(oracle)
          .updateIssuerStatus(university.address, true)
      ).to.be.revertedWithCustomError(
        issuerRegistry,
        "IssuerNotRegistered"
      );
    });
  });  
});