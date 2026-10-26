const DOCUMENT_FIELDS = {
  clearance: ["purpose", "validIdType", "validIdNumber"],
  residency: [
    "yearsOfResidency", "purpose", "validIdType", "validIdNumber"
  ],
  indigency: [
    "reason", "employmentStatus", "householdMembers",
    "validIdType", "validIdNumber"
  ],
  business: [
    "businessName", "businessType", "businessNature",
    "businessAddress"
  ]
};

function validateRequest(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { body: "Please send a valid request object." };
  }

  for (const field of ["residentName", "residentEmail", "address"]) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      errors[field] = "This field is required.";
    } else if (body[field].length > 500) {
      errors[field] = "Please use no more than 500 characters.";
    }
  }

  if (
    typeof body.residentEmail === "string" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.residentEmail.trim())
  ) {
    errors.residentEmail = "Please enter a valid email address.";
  }

  if (typeof body.mobile !== "string" || !/^09\d{9}$/.test(body.mobile)) {
    errors.mobile = "Please enter an 11-digit mobile number starting with 09.";
  }

  const fields = Object.hasOwn(DOCUMENT_FIELDS, body.documentType)
    ? DOCUMENT_FIELDS[body.documentType]
    : null;

  if (!fields) {
    errors.documentType = "Please select a supported document type.";
    return errors;
  }

  const details = body.documentData;

  if (!details || typeof details !== "object" || Array.isArray(details)) {
    errors.documentData = "Document details are required.";
    return errors;
  }

  for (const field of fields) {
    const value = details[field];
    const key = `documentData.${field}`;

    if (field === "yearsOfResidency" || field === "householdMembers") {
      const minimum = field === "householdMembers" ? 1 : 0;

      if (!Number.isInteger(value) || value < minimum || value > 150) {
        errors[key] = `Please enter a whole number from ${minimum} to 150.`;
      }
    } else if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 500
    ) {
      errors[key] = "Please enter between 1 and 500 characters.";
    }
  }

  return errors;
}

module.exports = { validateRequest };