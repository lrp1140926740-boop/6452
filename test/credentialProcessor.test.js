const {
  createContractHash,
  processCredential,
} = require(
  "../src/storage/credentialProcessor"
);

describe(
  "Complete credential storage pipeline",
  () => {
    const validInput = {
      credentialId:
        "urn:uuid:credential-001",
      issuerId:
        "did:example:unsw",
      issuerName:
        "University of New South Wales",
      studentId:
        "z5447977",
      studentName:
        "Test Student",
      degree:
        "Bachelor of Engineering",
      major:
        "Computer Engineering",
      graduationDate:
        "2026-12-15",
      issuanceDate:
        "2026-08-01T00:00:00Z",
    };

    test(
      "creates, hashes, encrypts, and uploads a credential",
      async () => {
        const mockUpload =
          jest.fn().mockResolvedValue(
            "bafybeimockcredential123"
          );

        const result =
          await processCredential(
            validInput,
            "strong-test-password",
            {
              uploadFn: mockUpload,
            }
          );

        expect(result).toHaveProperty(
          "credentialJson"
        );

        expect(result).toHaveProperty(
          "credentialHash"
        );

        expect(result).toHaveProperty(
          "cid"
        );

        expect(result.cid).toBe(
          "bafybeimockcredential123"
        );

        expect(
          result.credentialHash
        ).toMatch(
          /^0x[0-9a-f]{64}$/
        );

        expect(
          result.credentialHash
        ).toBe(
          createContractHash(
            result.credentialJson
          )
        );

        expect(
          mockUpload
        ).toHaveBeenCalledTimes(1);

        const encryptedPackage =
          mockUpload.mock.calls[0][0];

        expect(
          encryptedPackage
        ).toEqual(
          expect.objectContaining({
            algorithm: "aes-256-gcm",
            salt: expect.any(String),
            iv: expect.any(String),
            authTag: expect.any(String),
            ciphertext:
              expect.any(String),
          })
        );

        expect(
          encryptedPackage
        ).not.toHaveProperty(
          "studentName"
        );

        expect(
          JSON.stringify(
            encryptedPackage
          )
        ).not.toContain(
          validInput.studentName
        );
      }
    );

    test(
      "uses the requested IPFS filename",
      async () => {
        const mockUpload =
          jest.fn().mockResolvedValue(
            "bafycustomfilename"
          );

        await processCredential(
          validInput,
          "strong-test-password",
          {
            uploadFn: mockUpload,
            filename:
              "student-credential.json",
          }
        );

        expect(
          mockUpload.mock.calls[0][1]
        ).toEqual(
          expect.objectContaining({
            filename:
              "student-credential.json",
          })
        );
      }
    );

    test(
      "rejects an empty encryption password",
      async () => {
        const mockUpload = jest.fn();

        await expect(
          processCredential(
            validInput,
            "   ",
            {
              uploadFn: mockUpload,
            }
          )
        ).rejects.toThrow(
          "Encryption password is required"
        );

        expect(
          mockUpload
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "does not upload an invalid credential",
      async () => {
        const invalidInput = {
          ...validInput,
        };

        delete invalidInput.studentId;

        const mockUpload = jest.fn();

        await expect(
          processCredential(
            invalidInput,
            "strong-test-password",
            {
              uploadFn: mockUpload,
            }
          )
        ).rejects.toThrow();

        expect(
          mockUpload
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "propagates an IPFS upload failure",
      async () => {
        const mockUpload =
          jest.fn().mockRejectedValue(
            new Error(
              "Pinata service unavailable"
            )
          );

        await expect(
          processCredential(
            validInput,
            "strong-test-password",
            {
              uploadFn: mockUpload,
            }
          )
        ).rejects.toThrow(
          "Pinata service unavailable"
        );

        expect(
          mockUpload
        ).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "rejects an invalid CID returned by the uploader",
      async () => {
        const mockUpload =
          jest.fn().mockResolvedValue("");

        await expect(
          processCredential(
            validInput,
            "strong-test-password",
            {
              uploadFn: mockUpload,
            }
          )
        ).rejects.toThrow(
          "IPFS upload did not return a valid CID"
        );
      }
    );
  }
);
