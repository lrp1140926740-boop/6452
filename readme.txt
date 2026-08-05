===========================================================
COMP6452 Project 2 - Task 3
Blockchain-based Academic Credential System (Design 1)
Team Hours
===========================================================

-----------------------------------------------------------
1. OVERVIEW
-----------------------------------------------------------
A blockchain-based system for issuing and verifying academic
credentials. The design has three layers:

  - On-chain : a credential's hash and its IPFS CID are stored on
               smart contracts, so anyone can verify a credential.
  - Off-chain: the private data (PII) is encrypted (AES-256-GCM) and
               stored on IPFS; only the hash / CID go on-chain.
  - Oracle   : an accreditation oracle pushes each issuer's
               accreditation status on-chain. If a university loses
               its accreditation, the credentials it issued
               automatically become invalid.

-----------------------------------------------------------
2. REQUIREMENTS
-----------------------------------------------------------
  - Node.js  (v18 or newer recommended)
  - npm

-----------------------------------------------------------
3. SETUP  --  IMPORTANT: RUN "npm install" FIRST
-----------------------------------------------------------
Step 1 (REQUIRED):

    npm install

  >> You MUST run this before anything else. Without it the demos
     and tests will crash with errors such as "Cannot find module
     'dotenv'". This one command installs every dependency.

Step 2 (OPTIONAL): environment file
  The demos and tests run WITHOUT any .env file (they use a mock
  IPFS uploader and a local blockchain). You only need a .env if you
  want real IPFS uploads or to run against the public testnet:

    - copy  .env.example  to  .env
    - fill in the values you need (Pinata keys / Amoy RPC URL / key)

-----------------------------------------------------------
4. HOW TO RUN
-----------------------------------------------------------
Compile the smart contracts:

    npx hardhat compile
    (prints "Nothing to compile" if already compiled - that is fine)

Run all unit tests (off-chain modules + contracts):

    npx jest
    -> expected: 89 passed

Run the contract tests on a local chain:

    npx hardhat test test/contracts/CredentialRegistry.test.js test/contracts/IssuerRegistry.test.js
    -> expected: 42 passing

    NOTE for Windows PowerShell: do NOT write test/contracts/*.test.js
    PowerShell does not expand the "*" wildcard. List both files as shown
    above (or run:  npm run test:contracts).

Full end-to-end demo (the main demo, members A -> B -> C -> D -> E):

    npm run demo:full
    -> A credential first verifies as valid; the oracle then revokes
       the issuer's accreditation and pushes it on-chain; the SAME
       credential now verifies as invalid. Ends with: PASS.

Other demos:

    npm run demo:oracle              (offline oracle demo, no chain needed)
    npm run demo:oracle-integration  (oracle pushing status on a local chain)
    npm run demo:data                (AES-256 encryption demo)
    npm run demo:ipfs                (IPFS demo - needs PINATA_* in .env)

-----------------------------------------------------------
5. DEPLOYED CONTRACTS (Polygon Amoy testnet)
-----------------------------------------------------------
  Network : Polygon Amoy Testnet
  Chain ID: 80002
  Explorer: https://amoy.polygonscan.com

  IssuerRegistry     : 0xcC93f684a9CE47920C13678Ce358d0EbdFE84f23
  CredentialRegistry : 0x2ecA539c901006B96a97B996Ef21cc6f089EAcE3

  (See addresses.txt for the explorer links and more detail.)

-----------------------------------------------------------
6. PROJECT STRUCTURE
-----------------------------------------------------------
  contracts/
    IssuerRegistry.sol       authorised issuers + oracle interface (B)
    CredentialRegistry.sol   issue / verify / revoke credentials (A)
  src/
    oracle/        accreditation oracle (E)
    storage/       W3C Verifiable Credential format + IPFS (C)
    data-module/   AES-256-GCM encryption + SHA-256 hashing (D)
  scripts/         demo scripts and deployment
  test/            unit tests and contract tests
  addresses.txt    deployed contract addresses (Polygon Amoy)

-----------------------------------------------------------
7. TEAM  --  WHO DID WHAT
-----------------------------------------------------------
  A - CredentialRegistry contract: issue / verify / revoke
  B - IssuerRegistry contract + on-chain deployment (Polygon Amoy)
  C - Off-chain storage: W3C Verifiable Credential + IPFS (Pinata)
  D - Off-chain compute: AES-256-GCM encryption of PII
  E - Accreditation Oracle + end-to-end integration + demo

===========================================================
Quick start:  npm install  ->  npm run demo:full
===========================================================
