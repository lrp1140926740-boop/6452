/**
 * Create and validate a simplified W3C Verifiable Credential.
 *
 *
 */

const VC_CONTEXT = "https://www.w3.org/2018/credentials/v1";

/**
 * Check a non-empty string.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Create a university credential in W3C VC format.
 *
 * @param {Object} input
 * @param {string} input.credentialId
 * @param {string} input.issuerId
 * @param {string} input.issuerName
 * @param {string} input.studentId
 * @param {string} input.studentName
 * @param {string} input.degree
 * @param {string} input.major
 * @param {string} input.graduationDate
 * @param {string} [input.issuanceDate]
 * @returns {Object}
 */
function createVerifiableCredential(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Credential input must be an object");
  }

  const requiredFields = [
    "credentialId",
    "issuerId",
    "issuerName",
    "studentId",
    "studentName",
    "degree",
    "major",
    "graduationDate",
  ];

  for (const field of requiredFields) {
    if (!isNonEmptyString(input[field])) {
      throw new Error(`Missing or invalid field: ${field}`);
    }
  }

  const issuanceDate = input.issuanceDate || new Date().toISOString();

  if (Number.isNaN(Date.parse(issuanceDate))) {
    throw new Error("Invalid issuanceDate");
  }

  if (Number.isNaN(Date.parse(input.graduationDate))) {
    throw new Error("Invalid graduationDate");
  }

  return {
    "@context": [VC_CONTEXT],
    id: input.credentialId,
    type: [
      "VerifiableCredential",
      "UniversityDegreeCredential",
    ],
    issuer: {
      id: input.issuerId,
      name: input.issuerName,
    },
    issuanceDate,
    credentialSubject: {
      id: input.studentId,
      name: input.studentName,
      degree: {
        type: "UniversityDegree",
        name: input.degree,
      },
      major: input.major,
      graduationDate: input.graduationDate,
    },
  };
}

/**
 * Validate the basic structure of a W3C Verifiable Credential.
 *
 * This function checks required fields only.
 * It does not verify a digital signature.
 *
 */
function validateVerifiableCredential(credential) {
  const errors = [];

  if (!credential || typeof credential !== "object") {
    return {
      valid: false,
      errors: ["Credential must be an object"],
    };
  }

  if (
    !Array.isArray(credential["@context"]) ||
    !credential["@context"].includes(VC_CONTEXT)
  ) {
    errors.push("Missing valid @context");
  }

  if (!isNonEmptyString(credential.id)) {
    errors.push("Missing credential id");
  }

  if (
    !Array.isArray(credential.type) ||
    !credential.type.includes("VerifiableCredential")
  ) {
    errors.push("Missing VerifiableCredential type");
  }

  if (
    !credential.issuer ||
    !isNonEmptyString(credential.issuer.id) ||
    !isNonEmptyString(credential.issuer.name)
  ) {
    errors.push("Missing valid issuer");
  }

  if (
    !isNonEmptyString(credential.issuanceDate) ||
    Number.isNaN(Date.parse(credential.issuanceDate))
  ) {
    errors.push("Missing or invalid issuanceDate");
  }

  const subject = credential.credentialSubject;

  if (!subject || typeof subject !== "object") {
    errors.push("Missing credentialSubject");
  } else {
    if (!isNonEmptyString(subject.id)) {
      errors.push("Missing student id");
    }

    if (!isNonEmptyString(subject.name)) {
      errors.push("Missing student name");
    }

    if (
      !subject.degree ||
      !isNonEmptyString(subject.degree.name)
    ) {
      errors.push("Missing degree");
    }

    if (!isNonEmptyString(subject.major)) {
      errors.push("Missing major");
    }

    if (
      !isNonEmptyString(subject.graduationDate) ||
      Number.isNaN(Date.parse(subject.graduationDate))
    ) {
      errors.push("Missing or invalid graduationDate");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  VC_CONTEXT,
  createVerifiableCredential,
  validateVerifiableCredential,
};
