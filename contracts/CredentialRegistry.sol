// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIssuerRegistry {
    function isAuthorised(address issuerAddress)
        external
        view
        returns (bool);
}

contract CredentialRegistry {
    struct Credential {
        bytes32 credentialHash;
        address issuer;
        uint256 issuedAt;
        string cid;
        bool revoked;
        bool exists;
    }

    IIssuerRegistry public immutable issuerRegistry;

    mapping(bytes32 => Credential) private credentials;

    error InvalidIssuerRegistry();
    error NotAuthorisedIssuer();
    error InvalidCredentialHash();
    error EmptyCID();
    error CredentialAlreadyExists();
    error CredentialNotFound();
    error NotCredentialIssuer();
    error CredentialAlreadyRevoked();

    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed issuer,
        string cid,
        uint256 issuedAt
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed issuer
    );

    constructor(address issuerRegistryAddress) {
        if (issuerRegistryAddress == address(0)) {
            revert InvalidIssuerRegistry();
        }

        issuerRegistry = IIssuerRegistry(issuerRegistryAddress);
    }

    function issueCredential(
        bytes32 credentialHash,
        string calldata cid
    ) external {
        if (!issuerRegistry.isAuthorised(msg.sender)) {
            revert NotAuthorisedIssuer();
        }

        if (credentialHash == bytes32(0)) {
            revert InvalidCredentialHash();
        }

        if (bytes(cid).length == 0) {
            revert EmptyCID();
        }

        if (credentials[credentialHash].exists) {
            revert CredentialAlreadyExists();
        }

        credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            cid: cid,
            revoked: false,
            exists: true
        });

        emit CredentialIssued(
            credentialHash,
            msg.sender,
            cid,
            block.timestamp
        );
    }

    function revokeCredential(bytes32 credentialHash) external {
        Credential storage credential =
            credentials[credentialHash];

        if (!credential.exists) {
            revert CredentialNotFound();
        }

        if (credential.issuer != msg.sender) {
            revert NotCredentialIssuer();
        }

        if (credential.revoked) {
            revert CredentialAlreadyRevoked();
        }

        credential.revoked = true;

        emit CredentialRevoked(
            credentialHash,
            msg.sender
        );
    }

    function verifyCredential(bytes32 credentialHash)
        external
        view
        returns (
            bool valid,
            address issuer,
            uint256 issuedAt,
            string memory cid,
            bool revoked
        )
    {
        Credential memory credential =
            credentials[credentialHash];

        if (!credential.exists) {
            return (
                false,
                address(0),
                0,
                "",
                false
            );
        }

        bool issuerStillAuthorised =
            issuerRegistry.isAuthorised(
                credential.issuer
            );

        valid =
            issuerStillAuthorised &&
            !credential.revoked;

        return (
            valid,
            credential.issuer,
            credential.issuedAt,
            credential.cid,
            credential.revoked
        );
    }

    function getCredential(bytes32 credentialHash)
        external
        view
        returns (Credential memory)
    {
        Credential memory credential =
            credentials[credentialHash];

        if (!credential.exists) {
            revert CredentialNotFound();
        }

        return credential;
    }
}