/*
 * Resident profile feature module.
 *
 * Owns profile field access, loading, edit-mode behavior, business-field visibility,
 * and profile validation. It relies on shared application services and page markup
 * already used by the legacy frontend. Exports are attached to globalThis temporarily
 * to preserve classic-script and inline-handler compatibility.
 */
(function (global) {
function getProfileField(
    fieldId
) {

    return document.getElementById(
        fieldId
    );

}

function getProfileValue(
    fieldId
) {

    const field =
        getProfileField(
            fieldId
        );


    if (!field) {

        return "";

    }


    return field.value.trim();

}

function setProfileValue(
    fieldId,
    value
) {

    const field =
        getProfileField(
            fieldId
        );


    if (!field) {

        return;

    }


    field.value =
        value !== undefined &&
        value !== null
            ? value
            : "";

}

async function loadResidentProfile() {

    const session =
        getResidentSession();


    if (!session) {

        window.location.href =
            "resident-login.html";

        return;

    }


    let resident = null;

    // Prefer the server record so saved profile details persist across devices
    // and are not overwritten by stale localStorage data.
    try {
        const response = await fetch("/api/auth/me", {
            credentials: "same-origin",
            cache: "no-store"
        });
        if (response.ok) {
            const result = await response.json();
            resident = result.resident || null;
        }
    } catch (error) {
        console.warn("Could not load profile from backend:", error);
    }

    if (!resident) {
        const residents = getResidents();
        resident = residents.find(function (account) {
            return String(account.id) === String(session.residentId);
        }) || null;
    }

    if (!resident) {

        showAlert(
            "Error",
            "Resident account could not be found."
        );

        return;

    }


    /*
     * IMPORTANT:
     *
     * Profile information is now
     * stored inside resident.profile.
     */

    const profile =
        resident.profile || {};


    /* ACCOUNT-OWNED FIELDS */

    setProfileValue(
        "firstName",
        resident.firstName
    );

    setProfileValue(
        "lastName",
        resident.lastName
    );

    setProfileValue(
        "email",
        resident.email
    );


    /* PROFILE FIELDS */

    setProfileValue(
        "middleName",
        profile.middleName
    );

    setProfileValue(
        "birthdate",
        profile.birthdate
    );

    setProfileValue(
        "age",
        profile.age
    );

    setProfileValue(
        "gender",
        profile.gender
    );

    setProfileValue(
        "civilStatus",
        profile.civilStatus
    );

    setProfileValue(
        "birthplace",
        profile.birthplace
    );

    setProfileValue(
        "nationality",
        profile.nationality ||
        "Filipino"
    );


    /* ADDRESS */

    setProfileValue(
        "house",
        profile.house
    );

    setProfileValue(
        "street",
        profile.street
    );

    setProfileValue(
        "purok",
        profile.purok
    );

    setProfileValue(
        "barangay",
        profile.barangay ||
        "Poblacion"
    );

    setProfileValue(
        "municipality",
        profile.municipality ||
        "Pandi"
    );

    setProfileValue(
        "province",
        profile.province ||
        "Bulacan"
    );

    setProfileValue(
        "residencyYears",
        profile.residencyYears
    );

    setProfileValue(
        "residentStatus",
        profile.residentStatus
    );


    /* CONTACT */

    setProfileValue(
        "mobile",
        profile.mobile
    );


    /* HOUSEHOLD */

    setProfileValue(
        "voterStatus",
        profile.voterStatus
    );

    setProfileValue(
        "householdHead",
        profile.householdHead
    );

    setProfileValue(
        "familyMembers",
        profile.familyMembers
    );


    /* EMPLOYMENT */

    setProfileValue(
        "employment",
        profile.employment
    );

    setProfileValue(
        "occupation",
        profile.occupation
    );

    setProfileValue(
        "businessName",
        profile.businessName
    );

    setProfileValue(
        "businessAddress",
        profile.businessAddress
    );


    /* IDENTIFICATION */

    setProfileValue(
        "idType",
        profile.idType
    );

    setProfileValue(
        "idNumber",
        profile.idNumber
    );


    /* EMERGENCY */

    setProfileValue(
        "emergencyName",
        profile.emergencyName
    );

    setProfileValue(
        "emergencyNumber",
        profile.emergencyNumber
    );

    setProfileValue(
        "relationship",
        profile.relationship
    );


    /*
     * Start in read-only mode.
     */

    setProfileEditing(
        false
    );

}

function setProfileEditing(
    editing
) {

    editableProfileFields.forEach(
        function (fieldId) {

            const field =
                getProfileField(
                    fieldId
                );


            if (!field) {

                return;

            }


            field.disabled =
                !editing;

        }
    );


    /*
     * These fields are
     * always system-controlled.
     */

    [
        "barangay",
        "municipality",
        "province"
    ].forEach(
        function (fieldId) {

            const field =
                getProfileField(
                    fieldId
                );


            if (field) {

                field.disabled =
                    true;

            }

        }
    );


    updateBusinessFields(
        editing
    );


    const editButton =
        document.getElementById(
            "editProfileButton"
        );


    const saveButton =
        document.getElementById(
            "saveProfileButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelProfileButton"
        );


    if (editButton) {

        editButton.hidden =
            editing;

    }


    if (saveButton) {

        saveButton.hidden =
            !editing;

    }


    if (cancelButton) {

        cancelButton.hidden =
            !editing;

    }

}

function updateBusinessFields(
    editing
) {

    const employment =
        getProfileField(
            "employment"
        );


    const businessName =
        getProfileField(
            "businessName"
        );


    const businessAddress =
        getProfileField(
            "businessAddress"
        );


    if (
        !employment ||
        !businessName ||
        !businessAddress
    ) {

        return;

    }


    const hasBusiness =
        employment.value ===
            "Self-Employed" ||
        employment.value ===
            "Business Owner";


    if (!editing) {

        businessName.disabled =
            true;

        businessAddress.disabled =
            true;

        return;

    }


    businessName.disabled =
        !hasBusiness;


    businessAddress.disabled =
        !hasBusiness;


    businessName.required =
        hasBusiness;


    businessAddress.required =
        hasBusiness;


    if (!hasBusiness) {

        businessName.value =
            "";

        businessAddress.value =
            "";

    }

}

function validateResidentProfile() {

    let valid =
        true;


    /* CLEAR OLD ERRORS */

    editableProfileFields.forEach(
        function (fieldId) {

            const field =
                getProfileField(
                    fieldId
                );


            if (field) {

                field.classList.remove(
                    "input-error"
                );

            }

        }
    );


    /* REQUIRED FIELDS */

    editableProfileFields.forEach(
        function (fieldId) {

            const field =
                getProfileField(
                    fieldId
                );


            if (!field) {

                return;

            }


            /*
             * Business fields are
             * conditionally required.
             */

            if (
                fieldId ===
                    "businessName" ||
                fieldId ===
                    "businessAddress"
            ) {

                return;

            }


            if (
                field.value.trim() === ""
            ) {

                field.classList.add(
                    "input-error"
                );

                valid =
                    false;

            }

        }
    );
    


    /* MOBILE */

    const mobile =
        getProfileField(
            "mobile"
        );


    if (
        mobile &&
        !/^09\d{9}$/.test(
            mobile.value.trim()
        )
    ) {

        mobile.classList.add(
            "input-error"
        );

        valid =
            false;

    }


    /* EMERGENCY NUMBER */

    const emergencyNumber =
        getProfileField(
            "emergencyNumber"
        );


    if (
        emergencyNumber &&
        !/^09\d{9}$/.test(
            emergencyNumber.value.trim()
        )
    ) {

        emergencyNumber.classList.add(
            "input-error"
        );

        valid =
            false;

    }


    /* EMAIL */

    const email =
        getProfileField(
            "email"
        );


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
        email &&
        !emailPattern.test(
            email.value.trim()
        )
    ) {

        email.classList.add(
            "input-error"
        );

        valid =
            false;

    }


    /* AGE */

    const age =
        getProfileField(
            "age"
        );


    if (age) {

        const value =
            Number(
                age.value
            );


        if (
            !Number.isInteger(value) ||
            value < 1 ||
            value > 120
        ) {

            age.classList.add(
                "input-error"
            );

            valid =
                false;

        }

    }


    /* RESIDENCY YEARS */

    const residencyYears =
        getProfileField(
            "residencyYears"
        );


    if (residencyYears) {

        const value =
            Number(
                residencyYears.value
            );


        if (
            !Number.isInteger(value) ||
            value < 0 ||
            value > 120
        ) {

            residencyYears.classList.add(
                "input-error"
            );

            valid =
                false;

        }

    }


    /* FAMILY MEMBERS */

    const familyMembers =
        getProfileField(
            "familyMembers"
        );


    if (familyMembers) {

        const value =
            Number(
                familyMembers.value
            );


        if (
            !Number.isInteger(value) ||
            value < 1
        ) {

            familyMembers.classList.add(
                "input-error"
            );

            valid =
                false;

        }

    }

    /* OCCUPATION */

        const occupationField =
        document.getElementById("occupation");

    if (occupationField) {
        occupationField.addEventListener(
            "input",
            function () {
                this.value =
                    this.value.replace(/[0-9]/g, "");
            }
        );
    }

    /* RELATIONSHIP*/
    const relationshipField =
    document.getElementById("relationship");

    if (relationshipField) {

        relationshipField.addEventListener(
            "input",
            function () {

                this.value =
                    this.value.replace(/[0-9]/g, "");

            }
        );

    }

    /* ID NUMBER */

    const idNumberField =
    document.getElementById("idNumber");

    if (idNumberField) {
        idNumberField.addEventListener(
            "input",
            function () {
                this.value =
                    this.value.replace(/\D/g, "");
            }
        );
    }


    /* BUSINESS */

    const employment =
        getProfileField(
            "employment"
        );


    const businessName =
        getProfileField(
            "businessName"
        );


    const businessAddress =
        getProfileField(
            "businessAddress"
        );


    const hasBusiness =
        employment &&
        (
            employment.value ===
                "Self-Employed" ||
            employment.value ===
                "Business Owner"
        );


    if (hasBusiness) {

        if (
            !businessName ||
            !businessName.value.trim()
        ) {

            if (businessName) {

                businessName.classList.add(
                    "input-error"
                );

            }

            valid =
                false;

        }


        if (
            !businessAddress ||
            !businessAddress.value.trim()
        ) {

            if (businessAddress) {

                businessAddress.classList.add(
                    "input-error"
                );

            }

            valid =
                false;

        }

    }


    if (!valid) {

        showAlert(
            "Error",
            "Please complete all required fields and correct the highlighted information."
        );

    }


    return valid;

}

  global.getProfileField = getProfileField;
  global.getProfileValue = getProfileValue;
  global.setProfileValue = setProfileValue;
  global.loadResidentProfile = loadResidentProfile;
  global.setProfileEditing = setProfileEditing;
  global.updateBusinessFields = updateBusinessFields;
  global.validateResidentProfile = validateResidentProfile;
})(globalThis);
