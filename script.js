/* =========================================================
   BARANGAYCERT - MAIN JAVASCRIPT
   ========================================================= */


/* =========================================================
   1. CONSTANTS
   ========================================================= */

const RESIDENT_STATUS = {
    PENDING: "Pending Verification",
    APPROVED: "Approved"
};

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const currentPage =
    window.location.pathname.split("/").pop();


/* =========================================================
   2. STORAGE HELPERS
   ========================================================= */

function getResidents() {

    try {

        return JSON.parse(
            localStorage.getItem("residents")
        ) || [];

    } catch (error) {

        return [];

    }
}


function saveResidents(residents) {

    localStorage.setItem(
        "residents",
        JSON.stringify(residents)
    );

}


/* =========================================================
   3. RESIDENT LOGIN
   ========================================================= */

const residentLoginForm =
    document.getElementById("residentLoginForm");


if (residentLoginForm) {

    residentLoginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById("password")
                    .value;


            const rememberCheckbox =
                residentLoginForm.querySelector(
                    'input[type="checkbox"]'
                );


            const rememberMe =
                rememberCheckbox
                    ? rememberCheckbox.checked
                    : false;


            if (!email || !password) {

                alert(
                    "Please enter your email and password."
                );

                return;

            }


            const residents =
                getResidents();


            const resident =
                residents.find(
                    function (account) {

                        return (
                            account.email === email &&
                            account.password === password
                        );

                    }
                );


            if (!resident) {

                alert(
                    "Invalid email or password."
                );

                return;

            }


            /* ACCOUNT APPROVAL */

            if (
                resident.status !==
                RESIDENT_STATUS.APPROVED
            ) {

                alert(
                    "Your account is still pending admin approval."
                );

                return;

            }


            /* CREATE SESSION */

            const residentSession = {

                residentId:
                    resident.id,

                email:
                    resident.email,

                firstName:
                    resident.firstName,

                lastName:
                    resident.lastName,

                loggedIn:
                    true

            };


            if (rememberMe) {

                localStorage.setItem(
                    "residentSession",
                    JSON.stringify(
                        residentSession
                    )
                );

                sessionStorage.removeItem(
                    "residentSession"
                );

            } else {

                sessionStorage.setItem(
                    "residentSession",
                    JSON.stringify(
                        residentSession
                    )
                );

                localStorage.removeItem(
                    "residentSession"
                );

            }


            window.location.href =
                "resident-dashboard.html";

        }
    );

}


/* =========================================================
   4. ADMIN LOGIN
   ========================================================= */

const adminLoginForm =
    document.getElementById("adminLoginForm");


if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const username =
                document
                    .getElementById("adminUsername")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("adminPassword")
                    .value;


            const rememberCheckbox =
                document.getElementById(
                    "rememberAdmin"
                );


            const rememberMe =
                rememberCheckbox
                    ? rememberCheckbox.checked
                    : false;


            if (!username || !password) {

                alert(
                    "Please enter your username and password."
                );

                return;

            }


            if (
                username !== ADMIN_USERNAME ||
                password !== ADMIN_PASSWORD
            ) {

                alert(
                    "Invalid admin username or password."
                );

                return;

            }


            const adminSession = {

                username:
                    username,

                loggedIn:
                    true

            };


            if (rememberMe) {

                localStorage.setItem(
                    "adminSession",
                    JSON.stringify(
                        adminSession
                    )
                );

                sessionStorage.removeItem(
                    "adminSession"
                );

            } else {

                sessionStorage.setItem(
                    "adminSession",
                    JSON.stringify(
                        adminSession
                    )
                );

                localStorage.removeItem(
                    "adminSession"
                );

            }


            window.location.href =
                "admin-dashboard.html";

        }
    );

}


/* =========================================================
   5. RESIDENT REGISTRATION
   ========================================================= */

const registerForm =
    document.querySelector(
        ".register-box form"
    );


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const firstName =
                document
                    .getElementById("firstName")
                    .value
                    .trim();


            const lastName =
                document
                    .getElementById("lastName")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById("password")
                    .value;


            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;


            const terms =
                document.getElementById("terms");


            /* REQUIRED */

            if (
                !firstName ||
                !lastName ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                alert(
                    "Please complete all required fields."
                );

                return;

            }


            /* TERMS */

            if (
                terms &&
                !terms.checked
            ) {

                alert(
                    "Please agree to the Terms and Conditions."
                );

                return;

            }


            /* EMAIL */

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(email)
            ) {

                alert(
                    "Please enter a valid email address."
                );

                return;

            }


            /* PASSWORD */

            if (
                password.length < 8
            ) {

                alert(
                    "Password must be at least 8 characters."
                );

                return;

            }


            if (
                password !== confirmPassword
            ) {

                alert(
                    "Passwords do not match."
                );

                return;

            }


            const residents =
                getResidents();


            /* DUPLICATE EMAIL */

            const existingResident =
                residents.find(
                    function (resident) {

                        return (
                            resident.email ===
                            email
                        );

                    }
                );


            if (existingResident) {

                alert(
                    "An account with this email already exists."
                );

                return;

            }


            /*
             * ACCOUNT ONLY
             *
             * Registration does NOT contain
             * the full resident profile.
             */

            const resident = {

                id:
                    Date.now(),

                firstName:
                    firstName,

                lastName:
                    lastName,

                email:
                    email,

                password:
                    password,

                status:
                    RESIDENT_STATUS.PENDING,

                createdAt:
                    new Date().toISOString(),

                /*
                 * Profile starts empty.
                 * The resident completes this
                 * after logging in.
                 */

                profile: {

                    middleName: "",
                    birthdate: "",
                    age: "",
                    gender: "",
                    civilStatus: "",
                    birthplace: "",
                    nationality: "",

                    house: "",
                    street: "",
                    purok: "",

                    barangay: "Poblacion",
                    municipality: "Pandi",
                    province: "Bulacan",

                    residencyYears: "",
                    residentStatus: "",

                    mobile: "",

                    voterStatus: "",
                    householdHead: "",
                    familyMembers: "",

                    employment: "",
                    occupation: "",
                    businessName: "",
                    businessAddress: "",

                    idType: "",
                    idNumber: "",

                    emergencyName: "",
                    emergencyNumber: "",
                    relationship: ""

                }

            };


            residents.push(
                resident
            );


            saveResidents(
                residents
            );


            alert(
                "Registration submitted successfully. " +
                "Your account is now pending admin approval."
            );


            window.location.href =
                "resident-login.html";

        }
    );

}


/* =========================================================
   6. ADMIN - RESIDENT MANAGEMENT
   ========================================================= */

const residentTableBody =
    document.getElementById(
        "residentTableBody"
    );


if (residentTableBody) {

    loadResidents();


    function loadResidents() {

        const residents =
            getResidents();


        /* NO RESIDENTS */

        if (
            residents.length === 0
        ) {

            residentTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state">

                        No resident accounts
                        registered yet.

                    </td>

                </tr>

            `;

            return;

        }


        /* DISPLAY RESIDENTS */

        residentTableBody.innerHTML =
            residents
                .map(
                    function (resident) {

                        const fullName =
                            `${resident.firstName || ""}
                            ${resident.lastName || ""}`
                                .trim();


                        const registrationDate =
                            resident.createdAt
                                ? new Date(
                                    resident.createdAt
                                ).toLocaleDateString(
                                    "en-PH",
                                    {
                                        year:
                                            "numeric",

                                        month:
                                            "short",

                                        day:
                                            "numeric"
                                    }
                                )
                                : "-";


                        let action;


                        if (
                            resident.status ===
                            RESIDENT_STATUS.PENDING
                        ) {

                            action = `

                                <button
                                    type="button"
                                    class="resident-action approve-button"
                                    data-id="${resident.id}">

                                    Approve

                                </button>

                            `;

                        } else {

                            action = `

                                <span
                                    class="approved-label">

                                    Approved

                                </span>

                            `;

                        }


                        return `

                            <tr>

                                <td>
                                    ${resident.id}
                                </td>


                                <td>

                                    <a
                                        href="admin-residents-details.html?id=${encodeURIComponent(resident.id)}"
                                        class="resident-name-link">

                                        ${fullName}

                                    </a>

                                </td>


                                <td>
                                    ${resident.email || "-"}
                                </td>


                                <td>
                                    ${registrationDate}
                                </td>


                                <td>

                                    <span
                                        class="status-badge
                                        ${getResidentStatusClass(
                                            resident.status
                                        )}">

                                        ${resident.status}

                                    </span>

                                </td>


                                <td>
                                    ${action}
                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");


        setupApprovalButtons();

    }


    /* =====================================================
       APPROVAL BUTTONS
       ===================================================== */

    function setupApprovalButtons() {

        const approveButtons =
            document.querySelectorAll(
                ".approve-button"
            );


        approveButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const residentId =
                            button.dataset.id;


                        approveResident(
                            residentId
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       APPROVE RESIDENT
       ===================================================== */

    function approveResident(
        residentId
    ) {

        const residents =
            getResidents();


        const resident =
            residents.find(
                function (account) {

                    return (
                        String(account.id) ===
                        String(residentId)
                    );

                }
            );


        if (!resident) {

            alert(
                "Resident account could not be found."
            );

            return;

        }


        if (
            resident.status ===
            RESIDENT_STATUS.APPROVED
        ) {

            return;

        }


        const confirmed =
            confirm(
                `Approve ${resident.firstName} ${resident.lastName}'s account?`
            );


        if (!confirmed) {

            return;

        }


        resident.status =
            RESIDENT_STATUS.APPROVED;


        saveResidents(
            residents
        );


        alert(
            "Resident account approved successfully."
        );


        loadResidents();

    }


    /* =====================================================
       STATUS CLASS
       ===================================================== */

    function getResidentStatusClass(
        status
    ) {

        if (
            status ===
            RESIDENT_STATUS.APPROVED
        ) {

            return "status-approved";

        }


        if (
            status ===
            RESIDENT_STATUS.PENDING
        ) {

            return "status-pending";

        }


        return "status-default";

    }

}


/* =========================================================
   7. ADMIN - RESIDENT DETAILS
   ========================================================= */

const adminResidentDetailPage =
    document.getElementById(
        "detailFirstName"
    );


if (adminResidentDetailPage) {

    loadAdminResidentDetails();


    function loadAdminResidentDetails() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const residentId =
            params.get("id");


        if (!residentId) {

            alert(
                "No resident account was selected."
            );

            window.location.href =
                "admin-residents.html";

            return;

        }


        const residents =
            getResidents();


        const resident =
            residents.find(
                function (account) {

                    return (
                        String(account.id) ===
                        String(residentId)
                    );

                }
            );


        if (!resident) {

            alert(
                "Resident account could not be found."
            );

            window.location.href =
                "admin-residents.html";

            return;

        }


        /*
         * IMPORTANT:
         *
         * Account information comes
         * directly from resident.
         *
         * Profile information comes
         * from resident.profile.
         */

        const profile =
            resident.profile || {};

        /* ACCOUNT */
        setAdminDetail(
            "detailAccountFirstName",
            resident.firstName
        );

        setAdminDetail(
            "detailAccountLastName",
            resident.lastName
        );

        setAdminDetail(
            "detailAccountEmail",
            resident.email
        );

        /* PERSONAL */

        setAdminDetail(
            "detailFirstName",
            resident.firstName
        );

        setAdminDetail(
            "detailMiddleName",
            profile.middleName
        );

        setAdminDetail(
            "detailLastName",
            resident.lastName
        );

        setAdminDetail(
            "detailBirthdate",
            formatDetailDate(
                profile.birthdate
            )
        );

        setAdminDetail(
            "detailAge",
            profile.age
        );

        setAdminDetail(
            "detailGender",
            profile.gender
        );

        setAdminDetail(
            "detailCivilStatus",
            profile.civilStatus
        );

        setAdminDetail(
            "detailBirthplace",
            profile.birthplace
        );

        setAdminDetail(
            "detailNationality",
            profile.nationality
        );


        /* ADDRESS */

        setAdminDetail(
            "detailHouse",
            profile.house
        );

        setAdminDetail(
            "detailStreet",
            profile.street
        );

        setAdminDetail(
            "detailPurok",
            profile.purok
        );

        setAdminDetail(
            "detailBarangay",
            profile.barangay ||
            "Poblacion"
        );

        setAdminDetail(
            "detailMunicipality",
            profile.municipality ||
            "Pandi"
        );

        setAdminDetail(
            "detailProvince",
            profile.province ||
            "Bulacan"
        );

        setAdminDetail(
            "detailResidencyYears",
            profile.residencyYears
        );

        setAdminDetail(
            "detailResidentStatus",
            profile.residentStatus
        );


        /* CONTACT */

        setAdminDetail(
            "detailMobile",
            profile.mobile
        );

        setAdminDetail(
            "detailEmailContact",
            resident.email
        );


        /* HOUSEHOLD */

        setAdminDetail(
            "detailVoterStatus",
            profile.voterStatus
        );

        setAdminDetail(
            "detailHouseholdHead",
            profile.householdHead
        );

        setAdminDetail(
            "detailFamilyMembers",
            profile.familyMembers
        );


        /* EMPLOYMENT */

        setAdminDetail(
            "detailEmployment",
            profile.employment
        );

        setAdminDetail(
            "detailOccupation",
            profile.occupation
        );

        setAdminDetail(
            "detailBusinessName",
            profile.businessName
        );

        setAdminDetail(
            "detailBusinessAddress",
            profile.businessAddress
        );


        /* IDENTIFICATION */

        setAdminDetail(
            "detailIdType",
            profile.idType
        );

        setAdminDetail(
            "detailIdNumber",
            profile.idNumber
        );


        /* EMERGENCY */

        setAdminDetail(
            "detailEmergencyName",
            profile.emergencyName
        );

        setAdminDetail(
            "detailEmergencyNumber",
            profile.emergencyNumber
        );

        setAdminDetail(
            "detailRelationship",
            profile.relationship
        );


        /* ACCOUNT */

        setAdminDetail(
            "detailAccountId",
            resident.id
        );

        setAdminDetail(
            "detailCreatedAt",
            formatDetailDate(
                resident.createdAt
            )
        );


        /* STATUS */

        const statusContainer =
            document.getElementById(
                "residentDetailStatus"
            );


        if (statusContainer) {

            const status =
                resident.status ||
                RESIDENT_STATUS.PENDING;


            const statusClass =
                status ===
                RESIDENT_STATUS.APPROVED
                    ? "status-approved"
                    : "status-pending";


            statusContainer.innerHTML = `

                <span class="${statusClass}">

                    ${status}

                </span>

            `;

        }

    }


    function setAdminDetail(
        elementId,
        value
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {

            return;

        }


        element.textContent =
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
                ? value
                : "—";

    }


    function formatDetailDate(
        value
    ) {

        if (!value) {

            return "—";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

        }


        return date.toLocaleDateString(
            "en-PH",
            {
                year:
                    "numeric",

                month:
                    "long",

                day:
                    "numeric"
            }
        );

    }

}


/* =========================================================
   8. RESIDENT PROFILE
   ========================================================= */

const editableProfileFields = [

    "firstName",
    "middleName",
    "lastName",

    "birthdate",
    "age",
    "gender",
    "civilStatus",
    "birthplace",
    "nationality",

    "house",
    "street",
    "purok",

    "residencyYears",
    "residentStatus",

    "mobile",
    "email",

    "voterStatus",
    "householdHead",
    "familyMembers",

    "employment",
    "occupation",
    "businessName",
    "businessAddress",

    "idType",
    "idNumber",

    "emergencyName",
    "emergencyNumber",
    "relationship"

];


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


/* =========================================================
   LOAD RESIDENT PROFILE
   ========================================================= */

function loadResidentProfile() {

    const session =
        getResidentSession();


    if (!session) {

        window.location.href =
            "resident-login.html";

        return;

    }


    const residents =
        getResidents();


    const resident =
        residents.find(
            function (account) {

                return (
                    String(account.id) ===
                    String(session.residentId)
                );

            }
        );


    if (!resident) {

        alert(
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


/* =========================================================
   PROFILE EDIT MODE
   ========================================================= */

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


/* =========================================================
   BUSINESS FIELD CONTROL
   ========================================================= */

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


/* =========================================================
   PROFILE VALIDATION
   ========================================================= */

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

        alert(
            "Please complete all required fields and correct the highlighted information."
        );

    }


    return valid;

}


/* =========================================================
   SAVE RESIDENT PROFILE
   ========================================================= */

function saveResidentProfile() {

    if (
        !validateResidentProfile()
    ) {

        return;

    }


    const session =
        getResidentSession();


    if (!session) {

        window.location.href =
            "resident-login.html";

        return;

    }


    const residents =
        getResidents();


    const residentIndex =
        residents.findIndex(
            function (resident) {

                return (
                    String(resident.id) ===
                    String(session.residentId)
                );

            }
        );


    if (
        residentIndex === -1
    ) {

        alert(
            "Resident account could not be found."
        );

        return;

    }


    const resident =
        residents[
            residentIndex
        ];


    /*
     * EMAIL REMAINS PART OF THE
     * ACCOUNT, NOT THE PROFILE.
     */

    const newEmail =
        getProfileValue(
            "email"
        )
            .toLowerCase();


    /* DUPLICATE EMAIL */

    const duplicateEmail =
        residents.some(
            function (
                account,
                index
            ) {

                return (
                    index !==
                        residentIndex &&
                    account.email ===
                        newEmail
                );

            }
        );


    if (duplicateEmail) {

        const email =
            getProfileField(
                "email"
            );


        if (email) {

            email.classList.add(
                "input-error"
            );

        }


        alert(
            "That email address is already being used by another resident."
        );

        return;

    }


    /*
     * ACCOUNT FIELDS
     */

    resident.firstName =
        getProfileValue(
            "firstName"
        );


    resident.lastName =
        getProfileValue(
            "lastName"
        );


    resident.email =
        newEmail;


    /*
     * PROFILE FIELDS
     *
     * Everything else goes inside
     * resident.profile.
     */

    if (!resident.profile) {

        resident.profile = {};

    }


    const profile =
        resident.profile;

    
    /* PERSONAL */

    profile.middleName =
        getProfileValue(
            "middleName"
        );

    profile.birthdate =
        getProfileValue(
            "birthdate"
        );

    profile.age =
        getProfileValue(
            "age"
        );

    profile.gender =
        getProfileValue(
            "gender"
        );

    profile.civilStatus =
        getProfileValue(
            "civilStatus"
        );

    profile.birthplace =
        getProfileValue(
            "birthplace"
        );

    profile.nationality =
        getProfileValue(
            "nationality"
        );


    /* ADDRESS */

    profile.house =
        getProfileValue(
            "house"
        );

    profile.street =
        getProfileValue(
            "street"
        );

    profile.purok =
        getProfileValue(
            "purok"
        );


    /*
     * SYSTEM CONTROLLED
     */

    profile.barangay =
        profile.barangay ||
        "Poblacion";


    profile.municipality =
        profile.municipality ||
        "Pandi";


    profile.province =
        profile.province ||
        "Bulacan";


    profile.residencyYears =
        getProfileValue(
            "residencyYears"
        );

    profile.residentStatus =
        getProfileValue(
            "residentStatus"
        );


    /* CONTACT */

    /*
     * Email is intentionally NOT
     * duplicated in profile.
     */

    profile.mobile =
        getProfileValue(
            "mobile"
        );


    /* HOUSEHOLD */

    profile.voterStatus =
        getProfileValue(
            "voterStatus"
        );

    profile.householdHead =
        getProfileValue(
            "householdHead"
        );

    profile.familyMembers =
        getProfileValue(
            "familyMembers"
        );


    /* EMPLOYMENT */

    profile.employment =
        getProfileValue(
            "employment"
        );

    profile.occupation =
        getProfileValue(
            "occupation"
        );

    profile.businessName =
        getProfileValue(
            "businessName"
        );

    profile.businessAddress =
        getProfileValue(
            "businessAddress"
        );


    /* IDENTIFICATION */

    profile.idType =
        getProfileValue(
            "idType"
        );

    profile.idNumber =
        getProfileValue(
            "idNumber"
        );


    /* EMERGENCY */

    profile.emergencyName =
        getProfileValue(
            "emergencyName"
        );

    profile.emergencyNumber =
        getProfileValue(
            "emergencyNumber"
        );

    profile.relationship =
        getProfileValue(
            "relationship"
        );


    /* SAVE */

    saveResidents(
        residents
    );


    /* UPDATE SESSION */

    const updatedSession = {

        ...session,

        firstName:
            resident.firstName,

        lastName:
            resident.lastName,

        email:
            resident.email

    };


    if (
        localStorage.getItem(
            "residentSession"
        )
    ) {

        localStorage.setItem(
            "residentSession",
            JSON.stringify(
                updatedSession
            )
        );

    } else {

        sessionStorage.setItem(
            "residentSession",
            JSON.stringify(
                updatedSession
            )
        );

    }


    /* RETURN TO READ-ONLY */

    setProfileEditing(
        false
    );


    alert(
        "Your profile has been updated successfully."
    );

}


/* =========================================================
   9. RESIDENT PROFILE EVENTS
   ========================================================= */

const editProfileButton =
    document.getElementById(
        "editProfileButton"
    );


const saveProfileButton =
    document.getElementById(
        "saveProfileButton"
    );


const cancelProfileButton =
    document.getElementById(
        "cancelProfileButton"
    );


const isProfilePage =
    editProfileButton ||
    saveProfileButton ||
    cancelProfileButton;


if (isProfilePage) {

    loadResidentProfile();


    /* EDIT */

    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            function () {

                setProfileEditing(
                    true
                );

            }
        );

    }


    /* SAVE */

    if (saveProfileButton) {

        saveProfileButton.addEventListener(
            "click",
            function () {

                saveResidentProfile();

            }
        );

    }


    /* CANCEL */

    if (cancelProfileButton) {

        cancelProfileButton.addEventListener(
            "click",
            function () {

                loadResidentProfile();

            }
        );

    }


    /* EMPLOYMENT */

    const employment =
        getProfileField(
            "employment"
        );


    if (employment) {

        employment.addEventListener(
            "change",
            function () {

                updateBusinessFields(
                    true
                );

            }
        );

    }

}


/* =========================================================
   10. SESSION HELPERS
   ========================================================= */

function getResidentSession() {

    const localSession =
        localStorage.getItem(
            "residentSession"
        );


    const session =
        sessionStorage.getItem(
            "residentSession"
        );


    try {

        return localSession
            ? JSON.parse(
                localSession
            )
            : session
                ? JSON.parse(
                    session
                )
                : null;

    } catch (error) {

        return null;

    }

}


function getAdminSession() {

    const localSession =
        localStorage.getItem(
            "adminSession"
        );


    const session =
        sessionStorage.getItem(
            "adminSession"
        );


    try {

        return localSession
            ? JSON.parse(
                localSession
            )
            : session
                ? JSON.parse(
                    session
                )
                : null;

    } catch (error) {

        return null;

    }

}


/* =========================================================
   11. PAGE ACCESS PROTECTION
   ========================================================= */

const residentPages = [

    "resident-dashboard.html",
    "resident-profile.html",
    "resident-request.html",
    "resident-review.html",
    "resident-track.html",
    "resident-notifications.html"

];


const adminPages = [

    "admin-dashboard.html",
    "admin-requests.html",
    "admin-request-details.html",
    "admin-residents.html",
    "admin-residents-details.html",
    "admin-notifications.html",
    "admin-reports.html",
    "admin-settings.html"

];


function protectResidentPage() {

    const residentSession =
        getResidentSession();


    if (!residentSession) {

        window.location.href =
            "resident-login.html";

    }

}


function protectAdminPage() {

    const adminSession =
        getAdminSession();


    if (!adminSession) {

        window.location.href =
            "admin-login.html";

    }

}


if (
    residentPages.includes(
        currentPage
    )
) {

    protectResidentPage();

}


if (
    adminPages.includes(
        currentPage
    )
) {

    protectAdminPage();

}


/* =========================================================
   12. LOGOUT
   ========================================================= */

function logout() {

    /* RESIDENT */

    localStorage.removeItem(
        "residentSession"
    );

    sessionStorage.removeItem(
        "residentSession"
    );


    /* ADMIN */

    localStorage.removeItem(
        "adminSession"
    );

    sessionStorage.removeItem(
        "adminSession"
    );


    window.location.href =
        "home.html";

}


/* =========================================================
   END OF JAVASCRIPT
   ========================================================= */