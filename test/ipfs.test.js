const {
  createPinataClient,
  createJsonFile,
  uploadToIPFS,
  downloadFromIPFS,
} = require("../src/storage/ipfs");

describe("IPFS storage module", () => {
  test("creates a Pinata client with supplied settings", () => {
    const client = createPinataClient({
      jwt: "test-jwt",
      gateway: "test-gateway.mypinata.cloud",
    });

    expect(client).toBeDefined();
  });

  test("rejects missing Pinata JWT", () => {
    expect(() =>
      createPinataClient({
        jwt: "",
        gateway: "test-gateway.mypinata.cloud",
      })
    ).toThrow("PINATA_JWT is not configured");
  });

  test("rejects missing Pinata gateway", () => {
    expect(() =>
      createPinataClient({
        jwt: "test-jwt",
        gateway: "",
      })
    ).toThrow("PINATA_GATEWAY is not configured");
  });

  test("creates a JSON file from credential data", async () => {
    const encryptedData = {
      iv: "example-iv",
      authTag: "example-auth-tag",
      ciphertext: "example-ciphertext",
    };

    const file = createJsonFile(
      encryptedData,
      "encrypted-credential.json"
    );

    expect(file.name).toBe("encrypted-credential.json");
    expect(file.type).toBe("application/json");

    const fileContent = await file.text();
    expect(JSON.parse(fileContent)).toEqual(encryptedData);
  });

  test("rejects missing credential data", () => {
    expect(() => createJsonFile(null)).toThrow(
      "Credential data is required"
    );
  });

  test("rejects an empty filename", () => {
    expect(() =>
      createJsonFile(
        {
          ciphertext: "encrypted-data",
        },
        ""
      )
    ).toThrow("Filename is required");
  });

  test("uploads data and returns a CID", async () => {
    const fakeClient = {
      upload: {
        public: {
          file: jest.fn().mockResolvedValue({
            cid: "bafy-test-cid-001",
          }),
        },
      },
    };

    const cid = await uploadToIPFS(
      {
        ciphertext: "encrypted-content",
      },
      {
        client: fakeClient,
        filename: "test-credential.json",
      }
    );

    expect(cid).toBe("bafy-test-cid-001");
    expect(
      fakeClient.upload.public.file
    ).toHaveBeenCalledTimes(1);

    const uploadedFile =
      fakeClient.upload.public.file.mock.calls[0][0];

    expect(uploadedFile.name).toBe("test-credential.json");
  });

  test("reports an error when Pinata returns no CID", async () => {
    const fakeClient = {
      upload: {
        public: {
          file: jest.fn().mockResolvedValue({}),
        },
      },
    };

    await expect(
      uploadToIPFS(
        {
          ciphertext: "encrypted-content",
        },
        {
          client: fakeClient,
        }
      )
    ).rejects.toThrow(
      "IPFS upload failed: Pinata did not return a valid CID"
    );
  });

  test("reports an upload network error", async () => {
    const fakeClient = {
      upload: {
        public: {
          file: jest
            .fn()
            .mockRejectedValue(new Error("Network unavailable")),
        },
      },
    };

    await expect(
      uploadToIPFS(
        {
          ciphertext: "encrypted-content",
        },
        {
          client: fakeClient,
        }
      )
    ).rejects.toThrow(
      "IPFS upload failed: Network unavailable"
    );
  });

  test("downloads data using a CID", async () => {
    const encryptedData = {
      iv: "example-iv",
      authTag: "example-auth-tag",
      ciphertext: "encrypted-content",
    };

    const fakeClient = {
      gateways: {
        public: {
          get: jest.fn().mockResolvedValue({
            data: encryptedData,
          }),
        },
      },
    };

    const result = await downloadFromIPFS(
      "bafy-test-cid-001",
      {
        client: fakeClient,
      }
    );

    expect(result).toEqual(encryptedData);
    expect(
      fakeClient.gateways.public.get
    ).toHaveBeenCalledWith("bafy-test-cid-001");
  });

  test("rejects an empty CID", async () => {
    await expect(
      downloadFromIPFS("")
    ).rejects.toThrow("CID is required");
  });

  test("reports a download gateway error", async () => {
    const fakeClient = {
      gateways: {
        public: {
          get: jest
            .fn()
            .mockRejectedValue(
              new Error("Gateway unavailable")
            ),
        },
      },
    };

    await expect(
      downloadFromIPFS(
        "bafy-test-cid-001",
        {
          client: fakeClient,
        }
      )
    ).rejects.toThrow(
      "IPFS download failed: Gateway unavailable"
    );
  });

  test("reports an error when IPFS returns no data", async () => {
    const fakeClient = {
      gateways: {
        public: {
          get: jest.fn().mockResolvedValue({}),
        },
      },
    };

    await expect(
      downloadFromIPFS(
        "bafy-test-cid-001",
        {
          client: fakeClient,
        }
      )
    ).rejects.toThrow(
      "IPFS download failed: No data was returned from IPFS"
    );
  });
});
