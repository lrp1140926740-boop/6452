# COMP6452 Project 2 Task 3 — Data Module

This repository contains the Data Module implemented for COMP6452 Project 2 Task 3.

The module is responsible for:

- Off-chain credential encryption and decryption
- On-chain and off-chain data separation
- SHA-256 credential hashing
- Demo credential data
- Unit testing
- Providing encrypted credential packages for IPFS integration

## Member Responsibility

Member D — Data Module

Main responsibilities:

1. Encrypt sensitive credential data before uploading it to IPFS.
2. Decrypt credential data during the verification process.
3. Ensure personally identifiable information is not stored directly on-chain.
4. Generate a SHA-256 hash for blockchain integrity verification.
5. Provide automated tests and demonstration data.

## Technologies Used

- Node.js
- Node.js built-in `crypto` module
- AES-256-GCM authenticated encryption
- SHA-256 hashing
- Jest

## Project Structure

```text
6452/
├── scripts/
│   └── dataModuleDemo.js
├── src/
│   └── data-module/
│       ├── credentialData.js
│       ├── demoData.js
│       └── encryption.js
├── test/
│   └── encryption.test.js
├── .gitignore
├── package.json
├── package-lock.json
└── README.md