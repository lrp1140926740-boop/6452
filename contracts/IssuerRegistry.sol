// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IssuerRegistry
 * @notice Stores and manages institutions authorised to issue academic credentials.
 */
contract IssuerRegistry {
    address public owner;

    struct Issuer {
        string name;
        bool authorised;
    }

    mapping(address => Issuer) private issuers;

    event IssuerAdded(address indexed issuerAddress, string name);
    event IssuerRemoved(address indexed issuerAddress);
    event IssuerNameUpdated(address indexed issuerAddress, string newName);

    error NotOwner();
    error InvalidIssuerAddress();
    error EmptyIssuerName();
    error IssuerAlreadyAuthorised();
    error IssuerNotAuthorised();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }

        _;
    }

    /**
     * @notice Adds a university or institution as an authorised issuer.
     * @param issuerAddress Wallet address controlled by the institution.
     * @param name Name of the institution.
     */
    function addIssuer(
        address issuerAddress,
        string calldata name
    ) external onlyOwner {
        if (issuerAddress == address(0)) {
            revert InvalidIssuerAddress();
        }

        if (bytes(name).length == 0) {
            revert EmptyIssuerName();
        }

        if (issuers[issuerAddress].authorised) {
            revert IssuerAlreadyAuthorised();
        }

        issuers[issuerAddress] = Issuer({
            name: name,
            authorised: true
        });

        emit IssuerAdded(issuerAddress, name);
    }

    /**
     * @notice Removes an institution's authority to issue credentials.
     * @param issuerAddress Address of the institution.
     */
    function removeIssuer(address issuerAddress) external onlyOwner {
        if (!issuers[issuerAddress].authorised) {
            revert IssuerNotAuthorised();
        }

        issuers[issuerAddress].authorised = false;

        emit IssuerRemoved(issuerAddress);
    }

    /**
     * @notice Updates the displayed name of an authorised institution.
     * @param issuerAddress Address of the institution.
     * @param newName New institution name.
     */
    function updateIssuerName(
        address issuerAddress,
        string calldata newName
    ) external onlyOwner {
        if (!issuers[issuerAddress].authorised) {
            revert IssuerNotAuthorised();
        }

        if (bytes(newName).length == 0) {
            revert EmptyIssuerName();
        }

        issuers[issuerAddress].name = newName;

        emit IssuerNameUpdated(issuerAddress, newName);
    }

    /**
     * @notice Checks whether an institution can currently issue credentials.
     * @param issuerAddress Address to check.
     */
    function isAuthorised(
        address issuerAddress
    ) external view returns (bool) {
        return issuers[issuerAddress].authorised;
    }

    /**
     * @notice Returns the stored information for an institution.
     * @param issuerAddress Address of the institution.
     */
    function getIssuer(
        address issuerAddress
    ) external view returns (string memory name, bool authorised) {
        Issuer memory issuer = issuers[issuerAddress];

        return (issuer.name, issuer.authorised);
    }
}