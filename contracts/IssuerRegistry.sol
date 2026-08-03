// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IssuerRegistry
 * @notice Stores and manages institutions authorised to issue academic credentials.
 */
contract IssuerRegistry {
    address public owner;
  // NEW: oracle address used to update issuer accreditation status
    address public oracle;
    struct Issuer {
        string name;
        bool authorised;
    }

    mapping(address => Issuer) private issuers;

    event IssuerAdded(address indexed issuerAddress, string name);
    event IssuerRemoved(address indexed issuerAddress);
    event IssuerNameUpdated(address indexed issuerAddress, string newName);
    //NEW
    event OracleUpdated(address indexed oracleAddress);
    event IssuerStatusUpdated(
        address indexed issuerAddress,
        bool authorised
    );

    error NotOwner();
    error InvalidIssuerAddress();
    error EmptyIssuerName();
    error IssuerAlreadyAuthorised();
    error IssuerNotAuthorised();

    // NEW
    error InvalidOracleAddress();
    error NotOracle();
    error IssuerNotRegistered();
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }

        _;
    }
    //NEW:Only the configured accreditation oracle can update issuer status.
    modifier onlyOracle() {
        if (msg.sender != oracle) {
            revert NotOracle();
        }

        _;
    }

    // NEW:
    // Owner connects the Accreditation Oracle to this registry.
    function setOracle(address oracleAddress) external onlyOwner {
        if (oracleAddress == address(0)) {
            revert InvalidOracleAddress();
        }

        oracle = oracleAddress;

        emit OracleUpdated(oracleAddress);
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
        _authoriseIssuer(issuerAddress, name);
    }

    /**
     * @notice Authorises a university or institution to issue credentials.
     * @param issuerAddress Wallet address controlled by the institution.
     * @param name Name of the institution.
     */
    function authoriseIssuer(
        address issuerAddress,
        string calldata name
    ) external onlyOwner {
        _authoriseIssuer(issuerAddress, name);
    }

    /**
     * @notice Internal logic for authorising an issuer.
     */
    function _authoriseIssuer(
        address issuerAddress,
        string calldata name
    ) internal {
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
        _revokeIssuer(issuerAddress);
    }

    /**
     * @notice Revokes an institution's authority to issue credentials.
     * @param issuerAddress Address of the institution.
     */
    function revokeIssuer(address issuerAddress) external onlyOwner {
        _revokeIssuer(issuerAddress);
    }

    /**
     * @notice Internal logic for revoking an issuer.
     */
    function _revokeIssuer(address issuerAddress) internal {
        if (!issuers[issuerAddress].authorised) {
            revert IssuerNotAuthorised();
        }

        issuers[issuerAddress].authorised = false;

        emit IssuerRemoved(issuerAddress);
    }

    //NEW:Accreditation Oracle -> Update Issuer status.
    function updateIssuerStatus(
        address issuerAddress,
        bool authorised
    ) external onlyOracle {
        if (issuerAddress == address(0)) {
            revert InvalidIssuerAddress();
        }

        if (bytes(issuers[issuerAddress].name).length == 0) {
        revert IssuerNotRegistered();
        }
        
        issuers[issuerAddress].authorised = authorised;

        emit IssuerStatusUpdated(
            issuerAddress,
            authorised
        );
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
     * @notice Checks whether an institution is an authorised issuer.
     * @param issuerAddress Address to check.
     */
    function isAuthorisedIssuer(
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