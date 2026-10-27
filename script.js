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
   DATA SYNCHRONIZATION
   ========================================================= */

function notifyDataChange(dataType) {

    window.dispatchEvent(
        new CustomEvent(
            "barangayCertDataChanged",
            {
                detail: {
                    type: dataType,
                    timestamp: Date.now()
                }
            }
        )
    );

}

/* =========================================================
   CROSS-TAB DATA SYNCHRONIZATION
   ========================================================= */

window.addEventListener(
    "storage",
    function (event) {

        if (
            event.key !== "requests" &&
            event.key !== "residents"
        ) {
            return;
        }


        window.dispatchEvent(
            new CustomEvent(
                "barangayCertDataChanged",
                {
                    detail: {
                        type:
                            event.key,
                        timestamp:
                            Date.now()
                    }
                }
            )
        );

    }
);


/* =========================================================
   BACKEND REQUEST HELPERS
   ========================================================= */

async function getBackendRequests() {
    const response = await fetch("/api/requests", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.requests)) {
        throw new Error(result.message || "Unable to load document requests.");
    }
    return result.requests;
}

async function saveBackendRequestStatus(requestId, status, remarks = "", processedBy = "Administrator") {
    const response = await fetch(`/api/requests/${encodeURIComponent(requestId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks, processedBy })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to update request status.");
    return result.request;
}

/* =========================================================
   3. RESIDENT LOGIN (BACKEND)
   ========================================================= */

const residentLoginForm = document.querySelector(".login-box form");

if (residentLoginForm) {
    residentLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
        const password = document.getElementById("password")?.value || "";
        const rememberCheckbox = residentLoginForm.querySelector('input[type="checkbox"]');
        if (!email || !password) {
            showAlert("Error", "Please enter your email and password.");
            return;
        }
        const submitButton = residentLoginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ email, password, rememberMe: Boolean(rememberCheckbox?.checked) })
            });
            const result = await response.json();
            if (!response.ok) {
                showAlert("Login Failed", result.message || "Unable to log in.");
                return;
            }
            const resident = result.resident;
            const residentSession = {
                residentId: resident.id, email: resident.email,
                firstName: resident.firstName, lastName: resident.lastName, loggedIn: true
            };
            if (rememberCheckbox?.checked) {
                localStorage.setItem("residentSession", JSON.stringify(residentSession));
                sessionStorage.removeItem("residentSession");
            } else {
                sessionStorage.setItem("residentSession", JSON.stringify(residentSession));
                localStorage.removeItem("residentSession");
            }
            const residents = getResidents();
            const index = residents.findIndex((item) => String(item.id) === String(resident.id));
            if (index >= 0) residents[index] = { ...residents[index], ...resident };
            else residents.push(resident);
            saveResidents(residents);
            window.location.href = "resident-dashboard.html";
        } catch (error) {
            console.error("Resident login error:", error);
            showAlert("Connection Error", "Could not connect to the server. Make sure BarangayCert is running and try again.");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}


/* =========================================================
   4. ADMIN LOGIN
   ========================================================= */

const adminLoginForm =
    document.getElementById("adminLoginForm");


if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const username = document.getElementById("adminUsername")?.value.trim() || "";
        const password = document.getElementById("adminPassword")?.value || "";
        const rememberMe = document.getElementById("rememberAdmin")?.checked || false;
        if (!username || !password) {
            showAlert("Error", "Please enter your username and password.");
            return;
        }
        try {
            const response = await fetch("/api/admin/login", {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "same-origin", body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (!response.ok) {
                showAlert("Error", result.message || "Invalid admin username or password.");
                return;
            }
            const adminSession = { username, loggedIn: true };
            const storage = rememberMe ? localStorage : sessionStorage;
            const otherStorage = rememberMe ? sessionStorage : localStorage;
            storage.setItem("adminSession", JSON.stringify(adminSession));
            otherStorage.removeItem("adminSession");
            window.location.href = "admin-dashboard.html";
        } catch (error) {
            console.error("Admin login error:", error);
            showAlert("Connection Error", "Could not connect to the server. Make sure BarangayCert is running.");
        }
    });
}


/* =========================================================
   5. RESIDENT REGISTRATION (BACKEND)
   ========================================================= */

const registerForm = document.querySelector(".register-box form");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const firstName = document.getElementById("firstName")?.value.trim() || "";
        const lastName = document.getElementById("lastName")?.value.trim() || "";
        const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
        const password = document.getElementById("password")?.value || "";
        const confirmPassword = document.getElementById("confirmPassword")?.value || "";
        const terms = document.getElementById("terms");
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            showAlert("Error", "Please complete all required fields."); return;
        }
        if (terms && !terms.checked) {
            showAlert("Error", "Please agree to the Terms and Conditions."); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert("Error", "Please enter a valid email address."); return;
        }
        if (password.length < 8) {
            showAlert("Error", "Password must be at least 8 characters."); return;
        }
        if (password !== confirmPassword) {
            showAlert("Error", "Passwords do not match."); return;
        }
        const submitButton = registerForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "same-origin", body: JSON.stringify({ firstName, lastName, email, password })
            });
            const result = await response.json();
            if (!response.ok) {
                showAlert("Registration Failed", result.message || "Unable to create your account."); return;
            }
            // Compatibility cache only. The backend stores the actual account and password hash.
            const residents = getResidents();
            if (!residents.some((item) => String(item.email).toLowerCase() === email)) {
                residents.push(result.resident);
                saveResidents(residents);
            }
            showAlert("Success", result.message || "Registration submitted. Your account is pending admin approval.");
            window.location.href = "resident-login.html";
        } catch (error) {
            console.error("Resident registration error:", error);
            showAlert("Connection Error", "Could not connect to the server. Make sure BarangayCert is running and try again.");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}


/* =========================================================
   6. ADMIN - RESIDENT MANAGEMENT
   ========================================================= */

const residentTableBody =
    document.getElementById(
        "residentTableBody"
    );


if (residentTableBody) {

    /* =====================================================
       LOAD RESIDENTS
       ===================================================== */

    loadResidents();


    async function loadResidents() {
        try {
            const response = await fetch("/api/admin/residents", {
                credentials: "same-origin", cache: "no-store"
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Unable to load residents.");
            const residents = Array.isArray(result.residents) ? result.residents : [];
            // Keep a browser cache for legacy pages, but the server is the source of truth.
            saveResidents(residents);
            updateResidentSummary(residents);

            if (residents.length === 0) {
                residentTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No resident accounts registered yet.</td></tr>`;
                return;
            }

            residentTableBody.innerHTML = residents.map((resident) => {
                const fullName = `${resident.firstName || ""} ${resident.lastName || ""}`.trim();
                const registrationDate = resident.createdAt
                    ? new Date(resident.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                    : "-";
                const action = resident.status === RESIDENT_STATUS.PENDING
                    ? `<button type="button" class="resident-action approve-button" data-id="${String(resident.id)}">Approve</button>`
                    : `<span class="approved-label">Approved</span>`;
                return `<tr>
                    <td>${resident.id}</td>
                    <td><a href="admin-residents-details.html?id=${encodeURIComponent(resident.id)}" class="resident-name-link">${escapeHtml(fullName)}</a></td>
                    <td>${escapeHtml(resident.email || "-")}</td>
                    <td>${registrationDate}</td>
                    <td><span class="status-badge ${getResidentStatusClass(resident.status)}">${escapeHtml(resident.status || RESIDENT_STATUS.PENDING)}</span></td>
                    <td>${action}</td>
                </tr>`;
            }).join("");
            setupApprovalButtons();
        } catch (error) {
            console.error("Loading residents failed:", error);
            residentTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(error.message || "Unable to load residents. Please log in again.")}</td></tr>`;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[character]));
    }


    /* =====================================================
       UPDATE RESIDENT SUMMARY
       ===================================================== */

    function updateResidentSummary(
        residents
    ) {

        /* ---------------------------------------------
           SUMMARY ELEMENTS
           --------------------------------------------- */

        const totalResidentsElement =
            document.getElementById(
                "totalResidents"
            );


        const verifiedResidentsElement =
            document.getElementById(
                "verifiedResidents"
            );


        const pendingResidentsElement =
            document.getElementById(
                "pendingResidents"
            );


        const activeResidentsElement =
            document.getElementById(
                "activeResidents"
            );


        /* ---------------------------------------------
           TOTAL RESIDENTS
           --------------------------------------------- */

        const totalCount =
            residents.length;


        if (totalResidentsElement) {

            totalResidentsElement.textContent =
                totalCount;

        }


        /* ---------------------------------------------
           VERIFIED RESIDENTS
           --------------------------------------------- */

        const verifiedCount =
            residents.filter(
                function (resident) {

                    return (
                        resident.status ===
                        RESIDENT_STATUS.APPROVED
                    );

                }
            ).length;


        if (verifiedResidentsElement) {

            verifiedResidentsElement.textContent =
                verifiedCount;

        }


        /* ---------------------------------------------
           PENDING VERIFICATION
           --------------------------------------------- */

        const pendingCount =
            residents.filter(
                function (resident) {

                    return (
                        resident.status ===
                        RESIDENT_STATUS.PENDING
                    );

                }
            ).length;


        if (pendingResidentsElement) {

            pendingResidentsElement.textContent =
                pendingCount;

        }


        /* ---------------------------------------------
           ACTIVE ACCOUNTS
           
           Currently, an approved resident is treated
           as an active account because the system does
           not yet have a separate active/inactive status.
           --------------------------------------------- */

        if (activeResidentsElement) {

            activeResidentsElement.textContent =
                verifiedCount;

        }

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

    async function approveResident(residentId) {
        const residents = getResidents();
        const resident = residents.find((account) => String(account.id) === String(residentId));
        if (!resident) {
            showAlert("Error", "Resident account could not be found. Refresh the page and try again.");
            await loadResidents();
            return;
        }
        if (resident.status === RESIDENT_STATUS.APPROVED) return;
        if (!confirm(`Approve ${resident.firstName || ""} ${resident.lastName || ""}'s account?`)) return;

        const button = document.querySelector(`.approve-button[data-id="${CSS.escape(String(residentId))}"]`);
        if (button) button.disabled = true;
        try {
            const response = await fetch(`/api/admin/residents/${encodeURIComponent(residentId)}/status`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                credentials: "same-origin", body: JSON.stringify({ status: RESIDENT_STATUS.APPROVED })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Resident approval failed.");
            showAlert("Success", result.message || "Resident account approved successfully.");
            await loadResidents();
        } catch (error) {
            console.error("Resident approval failed:", error);
            showAlert("Approval Failed", error.message || "Unable to approve resident. Please try again.");
            if (button) button.disabled = false;
        }
    }


    /* =====================================================
       RESIDENT STATUS CLASS
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
   ADMIN - RESIDENT REQUEST HISTORY
   ========================================================= */

async function loadResidentRequestHistory(resident) {
    const tbody = document.getElementById("residentRequestHistory");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading request history...</td></tr>';

    try {
        const requests = await getBackendRequests();
        const residentId = String(resident.id ?? "");
        const residentEmail = String(resident.email ?? "").trim().toLowerCase();

        const history = requests.filter((request) => {
            const requestResidentId = String(request.residentId ?? "");
            const requestEmail = String(request.residentEmail ?? request.email ?? "").trim().toLowerCase();

            return (residentId && requestResidentId && requestResidentId === residentId)
                || (residentEmail && requestEmail && requestEmail === residentEmail);
        }).sort((a, b) => new Date(b.dateRequested || 0) - new Date(a.dateRequested || 0));

        if (!history.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No document requests found for this resident.</td></tr>';
            return;
        }

        tbody.innerHTML = history.map((request) => {
            const requestId = String(request.requestId || request.requestReference || "—");
            const documentName = typeof getAdminDocumentName === "function"
                ? getAdminDocumentName(request.documentType)
                : (request.documentType || "Unknown");
            const dateRequested = request.dateRequested
                ? new Date(request.dateRequested).toLocaleDateString("en-PH", {
                    year: "numeric", month: "short", day: "numeric"
                })
                : "—";
            const status = String(request.status || "Pending");
            const safeId = requestId.replace(/[&<>"']/g, (char) => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            })[char]);

            return `<tr>
                <td><a class="resident-name-link" href="admin-request-details.html?id=${encodeURIComponent(requestId)}">${safeId}</a></td>
                <td>${escapeHtmlText(documentName)}</td>
                <td>${escapeHtmlText(dateRequested)}</td>
                <td><span class="status-badge ${typeof getRequestStatusClass === "function" ? getRequestStatusClass(status) : ""}">${escapeHtmlText(status)}</span></td>
            </tr>`;
        }).join("");
    } catch (error) {
        console.error("Unable to load resident request history:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Unable to load request history. Please refresh and try again.</td></tr>';
    }
}

function escapeHtmlText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
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

            showAlert(
                "Error",
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

            showAlert(
                "Error",
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

        // Load the resident's request history from backend storage, not localStorage.
        loadResidentRequestHistory(resident);


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

        /* =========================================================
        AUTO-COMPUTE AGE FROM BIRTHDATE
        ========================================================= */

        function calculateAgeFromBirthdate() {

            const birthdateField =
                document.getElementById("birthdate");

            const ageField =
                document.getElementById("age");

            if (!birthdateField || !ageField) {
                return;
            }

            const birthdate =
                birthdateField.value;

            if (!birthdate) {
                ageField.value = "";
                return;
            }

            const birthDate =
                new Date(birthdate + "T00:00:00");

            const today =
                new Date();

            let age =
                today.getFullYear() -
                birthDate.getFullYear();

            const monthDifference =
                today.getMonth() -
                birthDate.getMonth();

            if (
                monthDifference < 0 ||
                (
                    monthDifference === 0 &&
                    today.getDate() < birthDate.getDate()
                )
            ) {
                age--;
            }

            ageField.value =
                age >= 0 ? age : "";
        }

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                const birthdateField =
                    document.getElementById("birthdate");

                if (birthdateField) {
                    birthdateField.addEventListener(
                        "change",
                        calculateAgeFromBirthdate
                    );

                    calculateAgeFromBirthdate();
                }

            }
        );
    /* =========================================================
        PROFILE INPUT VALIDATION
        ========================================================= */

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                const occupationField =
                    document.getElementById("occupation");

                const idNumberField =
                    document.getElementById("idNumber");


                /* Occupation - no numeric characters */
                if (occupationField) {

                    occupationField.addEventListener(
                        "input",
                        function () {

                            this.value =
                                this.value.replace(/[0-9]/g, "");

                        }
                    );

                }


                /* ID Number - numbers only */
                if (idNumberField) {

                    idNumberField.addEventListener(
                        "input",
                        function () {

                            this.value =
                                this.value.replace(/\D/g, "");

                        }
                    );

                }

            }
        );




/* =========================================================
   SAVE RESIDENT PROFILE
   ========================================================= */

async function saveResidentProfile() {

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


    // The backend is the source of truth. A resident may not exist in the
    // legacy localStorage cache, so do not block saving when that cache is empty.
    const resident = residentIndex >= 0
        ? residents[residentIndex]
        : { id: session.residentId, profile: {} };



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


        showAlert(
            "Error",
            "That email address is already being used by another resident."
        );

        return;

    }

    const relationship =
    document.getElementById("relationship").value.trim();

    if (/[0-9]/.test(relationship)) {

        showAlert(
            "Error",
            "Relationship should not contain numbers."
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


    /* SAVE TO BACKEND */
    const profilePayload = {};
    [
        "middleName", "birthdate", "age", "gender", "civilStatus", "birthplace", "nationality",
        "house", "street", "purok", "residencyYears", "residentStatus", "mobile", "voterStatus",
        "householdHead", "familyMembers", "employment", "occupation", "businessName", "businessAddress",
        "idType", "idNumber", "emergencyName", "emergencyNumber", "relationship"
    ].forEach(function (fieldId) {
        profilePayload[fieldId] = getProfileValue(fieldId);
    });

    const saveButton = document.getElementById("saveProfileButton");
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        const response = await fetch("/api/resident/profile", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: getProfileValue("firstName"),
                lastName: getProfileValue("lastName"),
                email: newEmail,
                profile: profilePayload
            })
        });
        const result = await response.json().catch(function () { return {}; });
        if (!response.ok || !result.resident) {
            throw new Error(result.message || "Unable to save your profile.");
        }

        // Refresh the local compatibility cache only after the backend confirms success.
        const savedResident = result.resident;
        const cachedResidents = getResidents();
        const cachedIndex = cachedResidents.findIndex(function (account) {
            return String(account.id) === String(savedResident.id);
        });
        if (cachedIndex >= 0) cachedResidents[cachedIndex] = savedResident;
        else cachedResidents.push(savedResident);
        saveResidents(cachedResidents);
        notifyDataChange("residents");

        const updatedSession = {
            ...session,
            residentId: savedResident.id,
            firstName: savedResident.firstName,
            lastName: savedResident.lastName,
            email: savedResident.email
        };
        if (localStorage.getItem("residentSession")) {
            localStorage.setItem("residentSession", JSON.stringify(updatedSession));
        } else {
            sessionStorage.setItem("residentSession", JSON.stringify(updatedSession));
        }

        // Refill from the saved backend response and return to read-only mode.
        const savedProfile = savedResident.profile || {};
        Object.keys(savedProfile).forEach(function (key) {
            setProfileValue(key, savedProfile[key]);
        });
        setProfileValue("firstName", savedResident.firstName);
        setProfileValue("lastName", savedResident.lastName);
        setProfileValue("email", savedResident.email);
        setProfileEditing(false);
        showAlert("Success", "Your profile has been saved successfully.");
    } catch (error) {
        showAlert("Unable to Save", error.message || "Please check your connection and try again.");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    }
}
/* =========================================================
   RESIDENT REQUEST - DOCUMENT SELECTION
   ========================================================= */

const documentType =
    document.getElementById("documentType");

const documentForms =
    document.querySelectorAll(".document-form");


if (documentType) {

    documentType.addEventListener(
        "change",
        function () {

            documentForms.forEach(
                function (form) {

                    form.style.display = "none";

                }
            );


            if (this.value === "clearance") {

                document.getElementById(
                    "clearanceForm"
                ).style.display = "block";

            }


            else if (this.value === "residency") {

                document.getElementById(
                    "residencyForm"
                ).style.display = "block";

            }


            else if (this.value === "indigency") {

                document.getElementById(
                    "indigencyForm"
                ).style.display = "block";

            }


            else if (this.value === "business") {

                document.getElementById(
                    "businessForm"
                ).style.display = "block";

            }

        }
    );

}
/* =========================================================
   RESIDENT REQUEST - LOAD RESIDENT INFORMATION
   ========================================================= */

function loadResidentRequestProfile() {

    const fullNameField =
        document.getElementById("fullName");

    const mobileField =
        document.getElementById("mobile");

    const addressField =
        document.getElementById("address");
    
    const idTypeField =
    document.getElementById("idType");

    const idNumberField =
        document.getElementById("idNumber");



    /* ---------------------------------------------------------
       ONLY RUN ON REQUEST PAGE
       --------------------------------------------------------- */

    if (
        !fullNameField ||
        !mobileField ||
        !addressField
    ) {
        return;
    }


    /* ---------------------------------------------------------
       GET LOGGED-IN RESIDENT
       --------------------------------------------------------- */

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

                return String(account.id) ===
                    String(session.residentId);

            }
        );


    if (!resident) {

        showAlert(
            "Error",
            "Resident account could not be found."
        );

        return;

    }

    
    /* ---------------------------------------------------------
       PROFILE DATA
       --------------------------------------------------------- */

    const profile =
        resident.profile || {};


    /* ---------------------------------------------------------
       FULL NAME
       --------------------------------------------------------- */

    const nameParts = [

        resident.firstName,
        profile.middleName,
        resident.lastName

    ].filter(
        function (value) {

            return value &&
                String(value).trim() !== "";

        }
    );


    const fullName =
        nameParts.join(" ").trim();


    /* ---------------------------------------------------------
       MOBILE NUMBER
       --------------------------------------------------------- */

    const mobile =
        String(
            profile.mobile || ""
        ).trim();


    /* ---------------------------------------------------------
       COMPLETE ADDRESS
       --------------------------------------------------------- */

    const addressFields = [

        profile.house,
        profile.street,
        profile.barangay,
        profile.municipality,
        profile.province

    ];


    const addressParts =
        addressFields.filter(
            function (value) {

                return value &&
                    String(value).trim() !== "" &&
                    String(value).trim() !== "-";

            }
        );


    const completeAddress =
        addressParts.join(", ").trim();

    /* ---------------------------------------------------------
    PROFILE ID INFORMATION
    --------------------------------------------------------- */

    const idType =
        String(
            profile.idType || ""
        ).trim();

    const idNumber =
        String(
            profile.idNumber || ""
        ).trim();


    /* ---------------------------------------------------------
       DISPLAY INFORMATION
       --------------------------------------------------------- */

    fullNameField.value =
        fullName || "—";

    mobileField.value =
        mobile || "—";

    addressField.value =
        completeAddress || "—";

    /* ---------------------------------------------------------
    REFLECT PROFILE ID IN DOCUMENT REQUEST FORMS
    --------------------------------------------------------- */

    const requestIdTypes = [
        "clearanceIdType",
        "residencyIdType",
        "indigencyIdType"
    ];

    const requestIdNumbers = [
        "clearanceIdNumber",
        "residencyIdNumber",
        "indigencyIdNumber"
    ];


    requestIdTypes.forEach(
        function (fieldId) {

            const field =
                document.getElementById(fieldId);

            if (!field) {
                return;
            }

            field.value =
                idType;

            field.disabled =
                true;

        }
    );


    requestIdNumbers.forEach(
        function (fieldId) {

            const field =
                document.getElementById(fieldId);

            if (!field) {
                return;
            }

            field.value =
                idNumber;

            field.readOnly =
                true;

        }
    );

}

/* =========================================================
   RESIDENT DOCUMENT REQUEST - SUBMIT
   ========================================================= */

const residentRequestForm =
    document.getElementById("residentRequestForm");
    /* =========================================================
   DOCUMENT REQUEST - ACCESSIBLE VALIDATION
   ========================================================= */

function clearRequestValidation() {

    const fields =
        document.querySelectorAll(
            "#residentRequestForm .input-error"
        );

    fields.forEach(
        function(field) {

            field.classList.remove(
                "input-error"
            );

            field.removeAttribute(
                "aria-invalid"
            );

        }
    );

}


function markRequestFieldError(
    field
) {

    if (!field) {
        return;
    }

    field.classList.add(
        "input-error"
    );

    field.setAttribute(
        "aria-invalid",
        "true"
    );

}


function focusFirstRequestError() {

    const firstError =
        document.querySelector(
            "#residentRequestForm .input-error"
        );

    if (firstError) {

        firstError.focus();

    }

}
const requestForm =
    document.getElementById(
        "residentRequestForm"
    );


if (requestForm) {

    requestForm.addEventListener(
        "input",
        function(event) {

            const field =
                event.target;

            if (
                field.classList &&
                field.classList.contains(
                    "input-error"
                )
            ) {

                field.classList.remove(
                    "input-error"
                );

                field.removeAttribute(
                    "aria-invalid"
                );

            }

        }
    );


    requestForm.addEventListener(
        "change",
        function(event) {

            const field =
                event.target;

            if (
                field.classList &&
                field.classList.contains(
                    "input-error"
                )
            ) {

                field.classList.remove(
                    "input-error"
                );

                field.removeAttribute(
                    "aria-invalid"
                );

            }

        }
    );

}

    loadResidentRequestProfile();

if (residentRequestForm) {

    residentRequestForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =================================================
               GET RESIDENT SESSION
               ================================================= */

            const session =
                getResidentSession();


            if (!session) {

                showAlert(
                    "Session Expired",
                    "Your session has expired. Please log in again."
                );

                window.location.href =
                    "resident-login.html";

                return;

            }


            /* =================================================
               GET RESIDENT
               ================================================= */

            const residents =
                getResidents();


            const resident =
                residents.find(
                    function (account) {

                        return Number(account.id) ===
                            Number(session.residentId);

                    }
                );


            if (!resident) {

                showAlert(
                    "Error",
                    "Resident account could not be found."
                );

                return;

            }

            /* =================================================
            VALIDATE RESIDENT PROFILE BEFORE REQUEST
            ================================================= */

            const profile =
                resident.profile || {};

            const mobile =
                String(
                    profile.mobile || ""
                ).trim();

            const mobileDigits =
                mobile.replace(/\D/g, "");


            const addressFields = [

                profile.house,
                profile.street,
                profile.barangay,
                profile.municipality,
                profile.province

            ];


            const incompleteAddress =
                addressFields.some(
                    function (value) {

                        const text =
                            String(
                                value || ""
                            ).trim();

                        return (
                            text === "" ||
                            text === "-"
                        );

                    }
                );


            const invalidMobile =
                (
                    mobile === "" ||
                    mobile === "-"
                );


            if (
                invalidMobile ||
                incompleteAddress
            ) {

                showAlert(
                    "Incomplete Profile",
                    "Please complete your My Profile first.\n\n" +
                    "A valid 11-digit mobile number, complete address, " +
                    "submitting a document request."
                );

                window.location.href =
                    "resident-profile.html";

                return;

            }


            /* =================================================
               DOCUMENT TYPE
               ================================================= */

            const documentType =
                document.getElementById(
                    "documentType"
                ).value;


            if (!documentType) {

                const documentTypeField =
                    document.getElementById(
                        "documentType"
                    );

                markRequestFieldError(
                    documentTypeField
                );

                showAlert(
                    "Error",
                    "Please select a document type."
                );

                focusFirstRequestError();

                return;

            }


            /* =================================================
               VALIDATE SELECTED DOCUMENT
               ================================================= */

            let documentData = {};


            if (documentType === "clearance") {

                const purpose =
                    document.getElementById(
                        "clearancePurpose"
                    ).value.trim();

                const idType =
                    document.getElementById(
                        "clearanceIdType"
                    ).value;

                const idNumber =
                    document.getElementById(
                        "clearanceIdNumber"
                    ).value.trim();


               if (
                    !purpose ||
                    !idType ||
                    !idNumber
                ) {

                    const purposeField =
                        document.getElementById(
                            "clearancePurpose"
                        );

                    const idTypeField =
                        document.getElementById(
                            "clearanceIdType"
                        );

                    const idNumberField =
                        document.getElementById(
                            "clearanceIdNumber"
                        );


                    if (!purpose) {

                        markRequestFieldError(
                            purposeField
                        );

                    }

                    if (!idType) {

                        markRequestFieldError(
                            idTypeField
                        );

                    }

                    if (!idNumber) {

                        markRequestFieldError(
                            idNumberField
                        );

                    }


                    showAlert(
                        "Error",
                        "Please complete all required Barangay Clearance information."
                    );

                    focusFirstRequestError();

                    return;

                }


                documentData = {

                    purpose: purpose,

                    validIdType: idType,

                    validIdNumber: idNumber

                };

            }


            else if (documentType === "residency") {

                const years =
                    document.getElementById(
                        "residencyYears"
                    ).value;

                const purpose =
                    document.getElementById(
                        "residencyPurpose"
                    ).value.trim();

                const idType =
                    document.getElementById(
                        "residencyIdType"
                    ).value;

                const idNumber =
                    document.getElementById(
                        "residencyIdNumber"
                    ).value.trim();


                if (
                    !years ||
                    !purpose ||
                    !idType ||
                    !idNumber
                ) {

                    const yearsField =
                        document.getElementById(
                            "residencyYears"
                        );

                    const purposeField =
                        document.getElementById(
                            "residencyPurpose"
                        );

                    const idTypeField =
                        document.getElementById(
                            "residencyIdType"
                        );

                    const idNumberField =
                        document.getElementById(
                            "residencyIdNumber"
                        );


                    if (!years) {

                        markRequestFieldError(
                            yearsField
                        );

                    }

                    if (!purpose) {

                        markRequestFieldError(
                            purposeField
                        );

                    }

                    if (!idType) {

                        markRequestFieldError(
                            idTypeField
                        );

                    }

                    if (!idNumber) {

                        markRequestFieldError(
                            idNumberField
                        );

                    }


                    showAlert(
                        "Error",
                        "Please complete all required Certificate of Residency information."
                    );

                    focusFirstRequestError();

                    return;

                }


                documentData = {

                    yearsOfResidency:
                        Number(years),

                    purpose: purpose,

                    validIdType: idType,

                    validIdNumber: idNumber

                };

            }


            else if (documentType === "indigency") {

                const reason =
                    document.getElementById(
                        "indigencyReason"
                    ).value.trim();

                const employmentStatus =
                    document.getElementById(
                        "employmentStatus"
                    ).value;

                const householdMembers =
                    document.getElementById(
                        "householdMembers"
                    ).value;

                const idType =
                    document.getElementById(
                        "indigencyIdType"
                    ).value;

                const idNumber =
                    document.getElementById(
                        "indigencyIdNumber"
                    ).value.trim();


                if (
                    !reason ||
                    !employmentStatus ||
                    !householdMembers ||
                    !idType ||
                    !idNumber
                ) {

                    const reasonField =
                        document.getElementById(
                            "indigencyReason"
                        );

                    const employmentStatusField =
                        document.getElementById(
                            "employmentStatus"
                        );

                    const householdMembersField =
                        document.getElementById(
                            "householdMembers"
                        );

                    const idTypeField =
                        document.getElementById(
                            "indigencyIdType"
                        );

                    const idNumberField =
                        document.getElementById(
                            "indigencyIdNumber"
                        );


                    if (!reason) {

                        markRequestFieldError(
                            reasonField
                        );

                    }

                    if (!employmentStatus) {

                        markRequestFieldError(
                            employmentStatusField
                        );

                    }

                    if (!householdMembers) {

                        markRequestFieldError(
                            householdMembersField
                        );

                    }

                    if (!idType) {

                        markRequestFieldError(
                            idTypeField
                        );

                    }

                    if (!idNumber) {

                        markRequestFieldError(
                            idNumberField
                        );

                    }


                    showAlert(
                        "Error",
                        "Please complete all required Certificate of Indigency information."
                    );

                    focusFirstRequestError();

                    return;

                }


                documentData = {

                    reason: reason,

                    employmentStatus:
                        employmentStatus,

                    occupation:
                        document.getElementById(
                            "occupation"
                        ).value.trim(),

                    incomeSource:
                        document.getElementById(
                            "incomeSource"
                        ).value.trim(),

                    monthlyIncome:
                        document.getElementById(
                            "monthlyIncome"
                        ).value,

                    householdMembers:
                        Number(householdMembers),

                    householdHead:
                        document.getElementById(
                            "householdHead"
                        ).value,

                    validIdType:
                        idType,

                    validIdNumber:
                        idNumber

                };

            }


            else if (documentType === "business") {

                const businessName =
                    document.getElementById(
                        "businessName"
                    ).value.trim();

                const businessType =
                    document.getElementById(
                        "businessType"
                    ).value;

                const businessNature =
                    document.getElementById(
                        "businessNature"
                    ).value.trim();

                const businessAddress =
                    document.getElementById(
                        "businessAddress"
                    ).value.trim();


                if (
                    !businessName ||
                    !businessType ||
                    !businessNature ||
                    !businessAddress
                ) {

                    const businessNameField =
                        document.getElementById(
                            "businessName"
                        );

                    const businessTypeField =
                        document.getElementById(
                            "businessType"
                        );

                    const businessNatureField =
                        document.getElementById(
                            "businessNature"
                        );

                    const businessAddressField =
                        document.getElementById(
                            "businessAddress"
                        );


                    if (!businessName) {

                        markRequestFieldError(
                            businessNameField
                        );

                    }

                    if (!businessType) {

                        markRequestFieldError(
                            businessTypeField
                        );

                    }

                    if (!businessNature) {

                        markRequestFieldError(
                            businessNatureField
                        );

                    }

                    if (!businessAddress) {

                        markRequestFieldError(
                            businessAddressField
                        );

                    }


                    showAlert(
                        "Error",
                        "Please complete all required Business Clearance information."
                    );

                    focusFirstRequestError();

                    return;

                }


                documentData = {

                    businessName:
                        businessName,

                    businessType:
                        businessType,

                    businessNature:
                        businessNature,

                    businessAddress:
                        businessAddress,

                    registrationType:
                        document.getElementById(
                            "registrationType"
                        ).value,

                    registrationNumber:
                        document.getElementById(
                            "registrationNumber"
                        ).value.trim()

                };

            }


            /* =================================================
               SAVE REQUEST THROUGH BACKEND API
               ================================================= */

            const profileAddress = [
                profile.house, profile.street, profile.purok,
                profile.barangay, profile.municipality, profile.province
            ].filter((value) => value && String(value).trim() && String(value).trim() !== "-").join(", ");
            const residentName = [resident.firstName, profile.middleName, resident.lastName]
                .filter((value) => value && String(value).trim()).join(" ");

            const requestPayload = {
                residentId: Number(resident.id),
                residentEmail: String(resident.email || "").trim().toLowerCase(),
                residentName,
                mobile: mobileDigits,
                address: profileAddress,
                documentType,
                documentData
            };

            try {
                const response = await fetch("/api/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestPayload)
                });
                const result = await response.json();
                if (!response.ok) {
                    const validationMessages = result.errors ? Object.values(result.errors).join("\n") : "";
                    throw new Error(validationMessages || result.message || "The server could not save your request.");
                }
                notifyDataChange("requests");
            } catch (error) {
                console.error("Document request submission failed:", error);
                showAlert("Submission Failed", error.message || "Your request could not be saved to the server. Please try again.");
                return;
            }


            /* =================================================
               SUCCESS
               ================================================= */

            showAlert(
                "Success",
                "Your document request has been submitted successfully."
            );


            /* =================================================
               RESET FORM
               ================================================= */

            residentRequestForm.reset();


            /* Hide document sections */

            document.querySelectorAll(
                ".document-form"
            ).forEach(
                function (section) {

                    section.style.display = "none";

                }
            );


            /* Reload resident information */

            loadResidentRequestProfile();


            /* =================================================
               GO TO TRACK REQUEST
               ================================================= */

            window.location.href =
                "resident-track.html";

        }
    );

}

/* =========================================================
   RESIDENT - TRACK REQUESTS
   ========================================================= */

async function loadResidentRequests() {

    const tableBody =
        document.getElementById(
            "requestTableBody"
        );


    /*
     * Only run on the track request page
     */

    if (!tableBody) {
        return;
    }


    /* =====================================================
       GET RESIDENT SESSION
       ===================================================== */

    const session =
        getResidentSession();


    if (!session) {

        window.location.href =
            "resident-login.html";

        return;

    }


    /* =====================================================
       GET ALL REQUESTS
       ===================================================== */

    let requests = [];
    try {
        requests = await getBackendRequests();
        localStorage.setItem("requests", JSON.stringify(requests));
    } catch (error) {
        console.error("Unable to load requests from backend:", error);
        tableBody.innerHTML = `<tr><td colspan="5">Unable to load requests. Please refresh or try again later.</td></tr>`;
        return;
    }


    /* =====================================================
       GET CURRENT RESIDENT'S REQUESTS
       ===================================================== */

    const residentRequests =
        requests.filter(
            function (request) {

                return Number(request.residentId) ===
                    Number(session.residentId);

            }
        );


    /* =====================================================
       NO REQUESTS
       ===================================================== */

    if (residentRequests.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="5">

                    No document requests yet.

                </td>

            </tr>

        `;

        return;

    }


    /* =====================================================
       SORT - MOST RECENT FIRST
       ===================================================== */

    residentRequests.sort(
        function (a, b) {

            return new Date(b.dateRequested) -
                new Date(a.dateRequested);

        }
    );


    /* =====================================================
       DISPLAY REQUESTS
       ===================================================== */

    tableBody.innerHTML = "";


    residentRequests.forEach(
        function (request) {

            const row =
                document.createElement("tr");


            /* DOCUMENT NAME */

            const documentName =
                getDocumentName(
                    request.documentType
                );


            /* PURPOSE */

            const purpose =
                getRequestPurpose(
                    request
                );


            /* DATE */

            const dateRequested =
                request.dateRequested
                    ? new Date(
                        request.dateRequested
                    ).toLocaleDateString(
                        "en-PH",
                        {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }
                    )
                    : "—";


            /* STATUS */

            const status =
                request.status || "Pending";


            row.innerHTML = `

                <td>

                    <button
                        type="button"
                        class="request-reference-button"
                        data-request-id="${request.requestId}">

                        ${request.requestId}

                    </button>

                </td>


                <td>
                    ${documentName}
                </td>


                <td>
                    ${purpose}
                </td>


                <td>
                    ${dateRequested}
                </td>


                <td>

                    <span class="request-status-badge">

                        ${status}

                    </span>

                </td>

            `;


            tableBody.appendChild(row);

        }
    );


    /* =====================================================
       REQUEST SELECTION
       ===================================================== */

    const requestButtons =
        document.querySelectorAll(
            ".request-reference-button"
        );


    requestButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const requestId =
                        this.dataset.requestId;


                    const selectedRequest =
                        residentRequests.find(
                            function (request) {

                                return request.requestId ===
                                    requestId;

                            }
                        );


                    if (selectedRequest) {

                        displayRequestStatus(
                            selectedRequest
                        );

                    }

                }
            );

        }
    );


    /* =====================================================
       DISPLAY MOST RECENT REQUEST
       ===================================================== */

    displayRequestStatus(
        residentRequests[0]
    );

}


/* =========================================================
   DOCUMENT NAME
   ========================================================= */

function getDocumentName(documentType) {

    const documentNames = {

        clearance:
            "Barangay Clearance",

        residency:
            "Certificate of Residency",

        indigency:
            "Certificate of Indigency",

        business:
            "Business Clearance"

    };


    return documentNames[documentType]
        || documentType
        || "Unknown Document";

}


/* =========================================================
   REQUEST PURPOSE
   ========================================================= */

function getRequestPurpose(request) {

    const data =
        request.documentData || {};


    if (request.documentType === "clearance") {

        return data.purpose || "—";

    }


    if (request.documentType === "residency") {

        return data.purpose || "—";

    }


    if (request.documentType === "indigency") {

        return data.reason || "—";

    }


    if (request.documentType === "business") {

        return data.businessNature ||
            data.businessName ||
            "—";

    }


    return "—";

}


/* =========================================================
   DISPLAY REQUEST STATUS
   ========================================================= */

function displayRequestStatus(request) {

    const statusContainer =
        document.getElementById(
            "requestStatus"
        );


    const message =
        document.getElementById(
            "selectedRequestMessage"
        );


    if (
        !statusContainer ||
        !message ||
        !request
    ) {
        return;
    }


    message.textContent =
        `${request.requestId} — ${
            getDocumentName(
                request.documentType
            )
        }`;


    const steps =
        statusContainer.querySelectorAll(
            ".status-step"
        );


    /*
     * Status sequence
     */

    const statusOrder = [

        "Pending",

        "Under Review",

        "Approved",

        "Ready for Pickup",

        "Released"

    ];


    let currentIndex =
        statusOrder.indexOf(
            request.status
        );


    /*
     * If an unknown status is encountered,
     * keep Pending as the default.
     */

    if (currentIndex < 0) {

        currentIndex = 0;

    }


    steps.forEach(
        function (step, index) {

            step.classList.remove(
                "active"
            );

            if (index <= currentIndex) {

                step.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   INITIALIZE TRACK REQUEST PAGE
   ========================================================= */

loadResidentRequests();

window.addEventListener(
    "barangayCertDataChanged",
    function (event) {

        if (
            !event.detail ||
            event.detail.type !== "requests"
        ) {
            return;
        }

        loadResidentRequests();

    }
);


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
   ADMIN - DOCUMENT REQUEST MANAGEMENT
   ========================================================= */

const adminRequestTableBody =
    document.getElementById("adminRequestTableBody");


if (adminRequestTableBody) {

    loadAdminRequests();
    window.addEventListener(
    "barangayCertDataChanged",
    function (event) {

        if (
            !event.detail ||
            event.detail.type !== "requests"
        ) {
            return;
        }

        loadAdminRequests();

    }
);

    /* =====================================================
       LOAD REQUESTS
       ===================================================== */

    async function loadAdminRequests() {

        let requests = [];
        try {
            requests = await getBackendRequests();
            localStorage.setItem("requests", JSON.stringify(requests));
        } catch (error) {
            console.error("Unable to load requests from backend:", error);
            adminRequestTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Unable to load requests. Please refresh or try again later.</td></tr>`;
            return;
        }


        /* SUMMARY */

        updateRequestSummary(requests);


        /* NO REQUESTS */

        if (requests.length === 0) {

            adminRequestTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state">

                        No document requests yet.

                    </td>

                </tr>

            `;

            return;

        }


        /* MOST RECENT FIRST */

        requests.sort(
            function (a, b) {

                return new Date(
                    b.dateRequested
                ) -
                new Date(
                    a.dateRequested
                );

            }
        );


        /* DISPLAY */

        adminRequestTableBody.innerHTML =
            requests.map(
                function (request) {

                    const documentName =
                        getAdminDocumentName(
                            request.documentType
                        );


                    const dateRequested =
                        request.dateRequested
                            ? new Date(
                                request.dateRequested
                            ).toLocaleDateString(
                                "en-PH",
                                {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                }
                            )
                            : "—";


                    const status =
                        request.status ||
                        "Pending";


                    return `

                        <tr>

                            <td>

                                <a
                                    href="admin-request-details.html?id=${encodeURIComponent(request.requestId)}"
                                    class="resident-name-link">

                                    ${request.requestId}

                                </a>

                            </td>


                            <td>

                                ${request.residentName || "—"}

                            </td>


                            <td>

                                ${documentName}

                            </td>


                            <td>

                                ${dateRequested}

                            </td>


                            <td>

                                <span
                                    class="status-badge ${getRequestStatusClass(status)}">

                                    ${status}

                                </span>

                            </td>


                            <td>

                                ${getRequestActions(request)}

                            </td>

                        </tr>

                    `;

                }
            ).join("");


        setupRequestActionButtons();

    }



    /* =====================================================
       REQUEST ACTIONS
       ===================================================== */

    function getRequestActions(request) {

        const status =
            request.status || "Pending";


        /* PENDING */

        if (status === "Pending") {

            return `

                <div class="request-actions">

                    <button
                        type="button"
                        class="resident-action approve-request-button"
                        data-id="${request.requestId}">

                        Approve

                    </button>


                    <button
                        type="button"
                        class="resident-action reject-request-button"
                        data-id="${request.requestId}">

                        Reject

                    </button>

                </div>

            `;

        }


        /* APPROVED */

        if (status === "Approved") {

            return `

                <button
                    type="button"
                    class="resident-action ready-request-button"
                    data-id="${request.requestId}">

                    Ready for Pickup

                </button>

            `;

        }


        /* READY FOR PICKUP */

        if (status === "Ready for Pickup") {

            return `

                <button
                    type="button"
                    class="resident-action release-request-button"
                    data-id="${request.requestId}">

                    Released

                </button>

            `;

        }


        /* RELEASED */

        if (status === "Released") {

            return `

                <span class="approved-label">

                    Completed

                </span>

            `;

        }


        /* REJECTED */

        if (status === "Rejected") {

            return `

                <span class="approved-label">

                    Rejected

                </span>

            `;

        }


        return "—";

    }



    /* =====================================================
       ACTION BUTTON EVENTS
       ===================================================== */

    function setupRequestActionButtons() {


        /* APPROVE */

        document
            .querySelectorAll(
                ".approve-request-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            updateDocumentRequestStatus(
                                this.dataset.id,
                                "Approved"
                            );

                        }
                    );

                }
            );


        /* REJECT */

        document
            .querySelectorAll(
                ".reject-request-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            rejectDocumentRequest(
                                this.dataset.id
                            );

                        }
                    );

                }
            );


        /* READY FOR PICKUP */

        document
            .querySelectorAll(
                ".ready-request-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            updateDocumentRequestStatus(
                                this.dataset.id,
                                "Ready for Pickup"
                            );

                        }
                    );

                }
            );


        /* RELEASE */

        document
            .querySelectorAll(
                ".release-request-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            updateDocumentRequestStatus(
                                this.dataset.id,
                                "Released"
                            );

                        }
                    );

                }
            );

    }



    /* =====================================================
       UPDATE REQUEST STATUS
       ===================================================== */

    async function updateDocumentRequestStatus(requestId, newStatus) {
        let requests;
        try { requests = await getBackendRequests(); }
        catch (error) { showAlert("Error", "Unable to load the request from the server."); return; }
        const request = requests.find((item) => String(item.requestId) === String(requestId));
        if (!request) { showAlert("Error", "Document request could not be found."); return; }
        if (!confirm(`Change ${request.requestId} to "${newStatus}"?`)) return;

        const adminSession = getAdminSession();
        try {
            await saveBackendRequestStatus(requestId, newStatus, `Request status updated to ${newStatus}.`, adminSession ? adminSession.username : "Administrator");
            notifyDataChange("requests");
            await loadAdminRequests();
            showAlert("Success", `Request ${request.requestId} is now ${newStatus}.`);
        } catch (error) { showAlert("Error", error.message || "Unable to save the request status."); }
    }


    /* =====================================================
       REJECT REQUEST
       ===================================================== */

    async function rejectDocumentRequest(requestId) {
        let requests;
        try { requests = await getBackendRequests(); }
        catch (error) { showAlert("Error", "Unable to load the request from the server."); return; }
        const request = requests.find((item) => String(item.requestId) === String(requestId));
        if (!request) { showAlert("Error", "Document request could not be found."); return; }
        if (request.status !== "Pending") { showAlert("Error", "Only pending requests can be rejected."); return; }
        const reason = prompt("Enter the reason for rejecting this request:");
        if (reason === null) return;
        if (!reason.trim()) { showAlert("Error", "A rejection reason is required."); return; }
        if (!confirm(`Reject ${request.requestId}?`)) return;

        const adminSession = getAdminSession();
        try {
            await saveBackendRequestStatus(requestId, "Rejected", reason.trim(), adminSession ? adminSession.username : "Administrator");
            notifyDataChange("requests");
            await loadAdminRequests();
            showAlert("Success", `Request ${request.requestId} has been rejected.`);
        } catch (error) { showAlert("Error", error.message || "Unable to reject the request."); }
    }


    /* =====================================================
       SUMMARY
       ===================================================== */

    function updateRequestSummary(
        requests
    ) {

        const total =
            requests.length;


        const pending =
            requests.filter(
                function (request) {

                    return request.status ===
                        "Pending";

                }
            ).length;


        const approved =
            requests.filter(
                function (request) {

                    return request.status ===
                        "Approved";

                }
            ).length;


        const released =
            requests.filter(
                function (request) {

                    return request.status ===
                        "Released";

                }
            ).length;


        const totalElement =
            document.getElementById(
                "totalRequests"
            );

        const pendingElement =
            document.getElementById(
                "pendingRequests"
            );

        const approvedElement =
            document.getElementById(
                "approvedRequests"
            );

        const releasedElement =
            document.getElementById(
                "releasedRequests"
            );


        if (totalElement) {

            totalElement.textContent =
                total;

        }


        if (pendingElement) {

            pendingElement.textContent =
                pending;

        }


        if (approvedElement) {

            approvedElement.textContent =
                approved;

        }


        if (releasedElement) {

            releasedElement.textContent =
                released;

        }

    }



    /* =====================================================
       DOCUMENT NAME
       ===================================================== */

    function getAdminDocumentName(
        documentType
    ) {

        const names = {

            clearance:
                "Barangay Clearance",

            residency:
                "Certificate of Residency",

            indigency:
                "Certificate of Indigency",

            business:
                "Business Clearance"

        };


        return names[documentType]
            || documentType
            || "Unknown";

    }



    /* =====================================================
       STATUS CLASS
       ===================================================== */

    function getRequestStatusClass(
        status
    ) {

        if (
            status === "Pending"
        ) {

            return "status-pending";

        }


        if (
            status === "Approved"
        ) {

            return "status-approved";

        }


        if (
            status === "Ready for Pickup"
        ) {

            return "status-approved";

        }


        if (
            status === "Released"
        ) {

            return "status-approved";

        }


        if (
            status === "Rejected"
        ) {

            return "status-rejected";

        }


        return "status-default";

    }

}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

/*
 * Load the Admin Dashboard.
 *
 * This function handles:
 * 1. Request Summary
 * 2. Recent Document Requests
 *
 * It uses the same "requests" data used by
 * admin-requests.html.
 */

async function loadAdminDashboard() {

    /* ---------------------------------------------------------
       GET DASHBOARD ELEMENTS
       --------------------------------------------------------- */

    const totalElement =
        document.getElementById(
            "dashboardTotalRequests"
        );

    const pendingElement =
        document.getElementById(
            "dashboardPendingRequests"
        );

    const processingElement =
        document.getElementById(
            "dashboardProcessingRequests"
        );

    const readyElement =
        document.getElementById(
            "dashboardReadyRequests"
        );

    const tableBody =
        document.getElementById(
            "dashboardRequestTableBody"
        );


    /*
     * If this is not the Admin Dashboard,
     * stop here.
     */
    if (
        !totalElement &&
        !pendingElement &&
        !processingElement &&
        !readyElement &&
        !tableBody
    ) {
        return;
    }


    /* ---------------------------------------------------------
       GET REQUESTS
       --------------------------------------------------------- */

    let requests = [];
    try {
        requests = await getBackendRequests();
        localStorage.setItem("requests", JSON.stringify(requests));
    } catch (error) {
        console.error("Unable to load dashboard requests from backend:", error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Unable to load document requests.</td></tr>`;
        return;
    }


    /* ---------------------------------------------------------
       REQUEST COUNTS
       --------------------------------------------------------- */

    const total =
        requests.length;


    const pending =
        requests.filter(
            function (request) {

                return request.status ===
                    "Pending";

            }
        ).length;


    /*
     * Approved requests are currently
     * considered Processing.
     */
    const processing =
        requests.filter(
            function (request) {

                return request.status ===
                    "Approved";

            }
        ).length;


    const ready =
        requests.filter(
            function (request) {

                return request.status ===
                    "Ready for Pickup";

            }
        ).length;


    /* ---------------------------------------------------------
       UPDATE SUMMARY
       --------------------------------------------------------- */

    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }


    if (processingElement) {

        processingElement.textContent =
            processing;

    }


    if (readyElement) {

        readyElement.textContent =
            ready;

    }


    /* ---------------------------------------------------------
       UPDATE REQUEST TABLE
       --------------------------------------------------------- */

    if (!tableBody) {

        return;

    }


    /*
     * No requests
     */
    if (requests.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state">

                    No document requests yet.

                </td>

            </tr>

        `;

        return;
    }


    /* ---------------------------------------------------------
       SORT REQUESTS
       --------------------------------------------------------- */

    requests.sort(
        function (a, b) {

            return (
                new Date(
                    b.dateRequested || 0
                ) -
                new Date(
                    a.dateRequested || 0
                )
            );

        }
    );


    /*
     * Show only the five most recent requests
     * on the dashboard.
     *
     * The complete list remains in
     * admin-requests.html.
     */
    const recentRequests =
        requests.slice(0, 5);


    /* ---------------------------------------------------------
       DOCUMENT NAME
       --------------------------------------------------------- */

    function getDashboardDocumentName(
        documentType
    ) {

        const documentNames = {

            clearance:
                "Barangay Clearance",

            residency:
                "Certificate of Residency",

            indigency:
                "Certificate of Indigency",

            business:
                "Business Clearance"

        };


        return (
            documentNames[documentType] ||
            documentType ||
            "Unknown Document"
        );

    }


    /* ---------------------------------------------------------
       STATUS CLASS
       --------------------------------------------------------- */

    function getDashboardStatusClass(
        status
    ) {

        if (status === "Pending") {

            return "status-pending";

        }


        if (
            status === "Approved" ||
            status === "Ready for Pickup" ||
            status === "Released"
        ) {

            return "status-approved";

        }


        if (status === "Rejected") {

            return "status-rejected";

        }


        return "status-default";

    }


    /* ---------------------------------------------------------
       DISPLAY REQUESTS
       --------------------------------------------------------- */

    tableBody.innerHTML =
        recentRequests.map(
            function (request) {

                const requestId =
                    request.requestId ||
                    "—";


                const residentName =
                    request.residentName ||
                    "—";


                const documentName =
                    getDashboardDocumentName(
                        request.documentType
                    );


                const dateRequested =
                    request.dateRequested
                        ? new Date(
                            request.dateRequested
                        ).toLocaleDateString(
                            "en-PH",
                            {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            }
                        )
                        : "—";


                const status =
                    request.status ||
                    "Pending";


                return `

                    <tr>

                        <td>

                            <a
                                href="admin-request-details.html?id=${encodeURIComponent(requestId)}"
                                class="resident-name-link">

                                ${requestId}

                            </a>

                        </td>


                        <td>
                            ${residentName}
                        </td>


                        <td>
                            ${documentName}
                        </td>


                        <td>
                            ${dateRequested}
                        </td>


                        <td>

                            <span
                                class="status-badge ${getDashboardStatusClass(status)}">

                                ${status}

                            </span>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =========================================================
   INITIALIZE ADMIN DASHBOARD
   ========================================================= */

loadAdminDashboard();

window.addEventListener(
    "barangayCertDataChanged",
    function (event) {

        if (
            !event.detail ||
            event.detail.type !== "requests"
        ) {
            return;
        }

        loadAdminDashboard();

    }
);

/* =========================================================
   RESIDENT DASHBOARD
   ========================================================= */

/*
 * Loads the resident's dashboard summary
 * and recent document requests.
 *
 * IMPORTANT:
 * This uses the same request filtering logic
 * as the Track Request page.
 */

async function loadResidentDashboard() {

    /* ---------------------------------------------------------
       GET DASHBOARD ELEMENTS
       --------------------------------------------------------- */

    const totalElement =
        document.getElementById(
            "residentTotalRequests"
        );

    const pendingElement =
        document.getElementById(
            "residentPendingRequests"
        );

    const readyElement =
        document.getElementById(
            "residentReadyRequests"
        );

    const completedElement =
        document.getElementById(
            "residentCompletedRequests"
        );

    const tableBody =
        document.getElementById(
            "residentDashboardRequestTableBody"
        );


    /*
     * If this is not the Resident Dashboard,
     * do nothing.
     */

    if (
        !totalElement &&
        !pendingElement &&
        !readyElement &&
        !completedElement &&
        !tableBody
    ) {
        return;
    }


    /* ---------------------------------------------------------
       GET LOGGED-IN RESIDENT
       --------------------------------------------------------- */

    const session =
        getResidentSession();


    if (!session) {

        window.location.href =
            "resident-login.html";

        return;
    }


    /* ---------------------------------------------------------
       GET ALL REQUESTS
       --------------------------------------------------------- */

    let requests = [];
    try {
        requests = await getBackendRequests();
        localStorage.setItem("requests", JSON.stringify(requests));
    } catch (error) {
        console.error("Unable to load resident dashboard requests from backend:", error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">Unable to load document requests.</td></tr>`;
        return;
    }


    /* ---------------------------------------------------------
       GET CURRENT RESIDENT'S REQUESTS
       --------------------------------------------------------- */

    const residentRequests =
        requests.filter(
            function (request) {

                return Number(
                    request.residentId
                ) === Number(
                    session.residentId
                );

            }
        );


    /* ---------------------------------------------------------
       REQUEST SUMMARY
       --------------------------------------------------------- */

    const total =
        residentRequests.length;


    const pending =
        residentRequests.filter(
            function (request) {

                return request.status ===
                    "Pending";

            }
        ).length;


    const ready =
        residentRequests.filter(
            function (request) {

                return request.status ===
                    "Ready for Pickup";

            }
        ).length;


    const completed =
        residentRequests.filter(
            function (request) {

                return request.status ===
                    "Released";

            }
        ).length;


    /* ---------------------------------------------------------
       UPDATE SUMMARY
       --------------------------------------------------------- */

    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }


    if (readyElement) {

        readyElement.textContent =
            ready;

    }


    if (completedElement) {

        completedElement.textContent =
            completed;

    }


    /* ---------------------------------------------------------
       UPDATE RECENT REQUESTS
       --------------------------------------------------------- */

    if (!tableBody) {

        return;

    }


    /* ---------------------------------------------------------
       NO REQUESTS
       --------------------------------------------------------- */

    if (residentRequests.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty-state">

                    No document requests yet.

                </td>

            </tr>

        `;

        return;
    }


    /* ---------------------------------------------------------
       SORT - MOST RECENT FIRST
       --------------------------------------------------------- */

    residentRequests.sort(
        function (a, b) {

            return new Date(
                b.dateRequested || 0
            ) -
            new Date(
                a.dateRequested || 0
            );

        }
    );


    /* ---------------------------------------------------------
       SHOW ONLY RECENT REQUESTS
       --------------------------------------------------------- */

    const recentRequests =
        residentRequests.slice(0, 5);


    /* ---------------------------------------------------------
       DISPLAY REQUESTS
       --------------------------------------------------------- */

    tableBody.innerHTML =
        recentRequests.map(
            function (request) {

                const documentName =
                    getDocumentName(
                        request.documentType
                    );


                const dateRequested =
                    request.dateRequested
                        ? new Date(
                            request.dateRequested
                        ).toLocaleDateString(
                            "en-PH",
                            {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            }
                        )
                        : "—";


                const status =
                    request.status ||
                    "Pending";


                return `

                    <tr>

                        <td>

                            <button
                                type="button"
                                class="request-reference-button"
                                data-request-id="${request.requestId}">

                                ${request.requestId}

                            </button>

                        </td>


                        <td>

                            ${documentName}

                        </td>


                        <td>

                            ${dateRequested}

                        </td>


                        <td>

                            <span
                                class="request-status-badge">

                                ${status}

                            </span>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    /* ---------------------------------------------------------
       REQUEST CLICK
       --------------------------------------------------------- */

    const requestButtons =
        tableBody.querySelectorAll(
            ".request-reference-button"
        );


    requestButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const requestId =
                        this.dataset.requestId;


                    const selectedRequest =
                        residentRequests.find(
                            function (request) {

                                return String(
                                    request.requestId
                                ) === String(
                                    requestId
                                );

                            }
                        );


                    if (selectedRequest) {

                        /*
                         * Send the resident to
                         * Track Request.
                         *
                         * The Track Request page
                         * will load the request
                         * using its existing logic.
                         */

                        window.location.href =
                            "resident-track.html";

                    }

                }
            );

        }
    );

}

/* =========================================================
   CUSTOM ALERT
   ========================================================= */

function showAlert(
    title,
    message,
    buttonText = "OK",
    type = ""
) {

    const modal =
        document.getElementById(
            "customAlert"
        );

    const titleField =
        document.getElementById(
            "customAlertTitle"
        );

    const messageField =
        document.getElementById(
            "customAlertMessage"
        );

    const button =
        document.getElementById(
            "customAlertButton"
        );

    const icon =
        document.getElementById(
            "customAlertIcon"
        );

    const closeButton =
        document.getElementById(
            "customAlertClose"
        );


    /* ---------------------------------------------------------
       FALLBACK
       --------------------------------------------------------- */

    if (
        !modal ||
        !titleField ||
        !messageField ||
        !button ||
        !icon
    ) {

        alert(message);

        return;

    }


    /* ---------------------------------------------------------
       AUTOMATIC ALERT TYPE
       --------------------------------------------------------- */

    if (!type) {

        const normalizedTitle =
            String(title)
                .toLowerCase()
                .trim();


        if (
            normalizedTitle.includes("success") ||
            normalizedTitle.includes("successful") ||
            normalizedTitle.includes("approved") ||
            normalizedTitle.includes("updated") ||
            normalizedTitle.includes("submitted")
        ) {

            type = "success";

        }

        else if (
            normalizedTitle.includes("error") ||
            normalizedTitle.includes("invalid") ||
            normalizedTitle.includes("incomplete") ||
            normalizedTitle.includes("failed") ||
            normalizedTitle.includes("expired")
        ) {

            type = "error";

        }

        else if (
            normalizedTitle.includes("warning") ||
            normalizedTitle.includes("confirm") ||
            normalizedTitle.includes("are you sure")
        ) {

            type = "warning";

        }

        else {

            type = "info";

        }

    }


   const alertCard =
    modal.querySelector(
        ".custom-alert"
    );


if (alertCard) {

    alertCard.classList.remove(
        "alert-error",
        "alert-warning",
        "alert-success",
        "alert-info"
    );

    alertCard.classList.add(
        "alert-" + type
    );

}


    /* ---------------------------------------------------------
       CONTENT
       --------------------------------------------------------- */

    titleField.textContent =
        title;

    messageField.textContent =
        message;

    button.textContent =
        buttonText;


    /* ---------------------------------------------------------
       ICON
       --------------------------------------------------------- */

    if (type === "success") {

        icon.textContent = "✓";
        icon.setAttribute(
            "aria-label",
            "Success"
        );

    }

    else if (type === "error") {

        icon.textContent = "!";
        icon.setAttribute(
            "aria-label",
            "Error"
        );

    }

    else if (type === "warning") {

        icon.textContent = "!";
        icon.setAttribute(
            "aria-label",
            "Warning"
        );

    }

    else {

        icon.textContent = "i";
        icon.setAttribute(
            "aria-label",
            "Information"
        );

    }


    /* ---------------------------------------------------------
       ACCESSIBILITY
       --------------------------------------------------------- */

    modal.setAttribute(
        "role",
        "alertdialog"
    );

    modal.setAttribute(
        "aria-modal",
        "true"
    );

    modal.setAttribute(
        "aria-labelledby",
        "customAlertTitle"
    );

    modal.setAttribute(
        "aria-describedby",
        "customAlertMessage"
    );

    


    /* ---------------------------------------------------------
       SHOW ALERT
       --------------------------------------------------------- */

    modal.style.display =
        "flex";


    /* ---------------------------------------------------------
       CLOSE FUNCTION
       --------------------------------------------------------- */

    function closeAlert() {

        modal.style.display =
            "none";

        document.removeEventListener(
            "keydown",
            handleAlertKeydown
        );

    }


    /* ---------------------------------------------------------
       KEYBOARD SUPPORT
       --------------------------------------------------------- */

    function handleAlertKeydown(event) {

        if (
            event.key === "Escape"
        ) {

            closeAlert();

            return;

        }


        if (
            event.key === "Enter" &&
            document.activeElement === button
        ) {

            closeAlert();

        }

    }


    document.addEventListener(
        "keydown",
        handleAlertKeydown
    );


    /* ---------------------------------------------------------
       BUTTON EVENTS
       --------------------------------------------------------- */

    button.onclick =
        closeAlert;


    if (closeButton) {

        closeButton.onclick =
            closeAlert;

    }


    /* ---------------------------------------------------------
       FOCUS
       --------------------------------------------------------- */

    if (closeButton) {

        closeButton.focus();

    }

    else {

        button.focus();

    }

}

/* =========================================================
   INITIALIZE RESIDENT DASHBOARD
   ========================================================= */

loadResidentDashboard();

window.addEventListener(
    "barangayCertDataChanged",
    function (event) {

        if (
            !event.detail ||
            event.detail.type !== "requests"
        ) {
            return;
        }

        loadResidentDashboard();

    }
);

/* =========================================================
   ADMIN - REQUEST DETAILS PAGE (BACKEND)
   ========================================================= */

if (currentPage === "admin-request-details.html") {
    loadAdminRequestDetails();

    async function loadAdminRequestDetails() {
        const params = new URLSearchParams(window.location.search);
        const requestId = params.get("id");

        if (!requestId) {
            showAlert("Error", "No request reference was provided.");
            return;
        }

        try {
            const response = await fetch(`/api/requests/${encodeURIComponent(requestId)}`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || !result.request) {
                throw new Error(result.message || "Request not found.");
            }

            const request = result.request;
            const docData = request.documentData || {};
            const residentName = request.residentName || "—";
            const residentEmail = request.residentEmail || request.email || "—";

            setRequestDetailText("requestDetailId", request.requestId || requestId);
            setRequestDetailText("requestDetailDate", request.dateRequested
                ? new Date(request.dateRequested).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                : "—");
            setRequestDetailText("requestDetailDocumentType", typeof getAdminDocumentName === "function"
                ? getAdminDocumentName(request.documentType) : (request.documentType || "—"));
            setRequestDetailText("requestDetailPurpose", docData.purpose || docData.reason || docData.businessNature || "—");
            setRequestDetailText("requestDetailResidentName", residentName);
            setRequestDetailText("requestDetailResidentEmail", residentEmail);
            setRequestDetailText("requestDetailResidentMobile", request.mobile || "—");
            setRequestDetailText("requestDetailResidentAddress", request.address || "—");

            const statusSelect = document.getElementById("requestStatus");
            if (statusSelect) {
                const status = request.status || "Pending";
                const option = Array.from(statusSelect.options).find((item) => item.value === status);
                if (option) statusSelect.value = status;
                else statusSelect.value = status;
            }

            const remarks = document.getElementById("adminRemarks");
            if (remarks) remarks.value = request.remarks || "";

            const saveButton = document.getElementById("saveRequestChanges");
            if (saveButton) {
                saveButton.addEventListener("click", async (event) => {
                    event.preventDefault();
                    const newStatus = statusSelect ? statusSelect.value : request.status;
                    const newRemarks = remarks ? remarks.value.trim() : "";
                    try {
                        await saveBackendRequestStatus(
                            requestId,
                            newStatus,
                            newRemarks || (newStatus === "Rejected" ? "" : `Request status updated to ${newStatus}.`),
                            (getAdminSession() || {}).username || "Administrator"
                        );
                        showAlert("Success", "Request details have been updated.");
                        await loadAdminRequestDetails();
                    } catch (error) {
                        showAlert("Error", error.message || "Unable to save request changes.");
                    }
                }, { once: true });
            }
        } catch (error) {
            console.error("Unable to load admin request details:", error);
            showAlert("Error", error.message || "Unable to load request details.");
        }
    }

    function setRequestDetailText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value ?? "—");
    }
}


/* =========================================================
   ADMIN SETTINGS - BACKEND INTEGRATION
   ========================================================= */

if (currentPage === "admin-settings.html") {
    initializeAdminSettings();
}

async function initializeAdminSettings() {
    const nameInput = document.getElementById("adminName");
    const emailInput = document.getElementById("adminEmail");
    const saveProfileButton = document.getElementById("saveAdminProfile");
    const updatePasswordButton = document.getElementById("updateAdminPassword");

    try {
        const result = await adminSettingsRequest("/api/admin/settings", { method: "GET" });
        if (nameInput) nameInput.value = result.settings.name || "";
        if (emailInput) emailInput.value = result.settings.email || "";
    } catch (error) {
        showAlert("Unable to Load Settings", error.message || "Could not load administrator settings.");
    }

    if (saveProfileButton) {
        saveProfileButton.addEventListener("click", async () => {
            const name = nameInput?.value.trim() || "";
            const email = emailInput?.value.trim() || "";
            saveProfileButton.disabled = true;
            try {
                const result = await adminSettingsRequest("/api/admin/settings/profile", {
                    method: "PATCH",
                    body: JSON.stringify({ name, email })
                });
                if (nameInput) nameInput.value = result.settings.name;
                if (emailInput) emailInput.value = result.settings.email;
                showAlert("Success", result.message || "Administrator account updated.");
            } catch (error) {
                showAlert("Unable to Save", error.message || "Could not save administrator account settings.");
            } finally {
                saveProfileButton.disabled = false;
            }
        });
    }

    if (updatePasswordButton) {
        updatePasswordButton.addEventListener("click", async () => {
            const currentPassword = document.getElementById("currentPassword")?.value || "";
            const newPassword = document.getElementById("newPassword")?.value || "";
            const confirmPassword = document.getElementById("confirmPassword")?.value || "";

            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert("Missing Information", "Complete all password fields.");
                return;
            }
            if (newPassword !== confirmPassword) {
                showAlert("Password Mismatch", "The new password and confirmation do not match.");
                return;
            }
            if (newPassword.length < 8 || newPassword.length > 128) {
                showAlert("Invalid Password", "The new password must be between 8 and 128 characters.");
                return;
            }

            updatePasswordButton.disabled = true;
            try {
                const result = await adminSettingsRequest("/api/admin/settings/password", {
                    method: "PATCH",
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
                    const input = document.getElementById(id);
                    if (input) input.value = "";
                });
                showAlert("Success", result.message || "Administrator password updated.");
            } catch (error) {
                showAlert("Unable to Update Password", error.message || "Could not update the password.");
            } finally {
                updatePasswordButton.disabled = false;
            }
        });
    }
}

async function adminSettingsRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem("adminSession");
            sessionStorage.removeItem("adminSession");
            window.location.href = "admin-login.html";
        }
        throw new Error(result.message || "The server could not complete this action.");
    }
    return result;
}


/* =========================================================
   ADMIN REPORTS - LIVE BACKEND DATA
   ========================================================= */
if (currentPage === "admin-reports.html") {
    initializeAdminReports();
}

async function initializeAdminReports() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    const typeInput = document.getElementById("reportType");
    const generateButton = document.getElementById("generateReport");
    const exportButton = document.getElementById("exportReportCsv");
    let currentReport = null;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (startInput && !startInput.value) startInput.value = toDateInputValue(monthStart);
    if (endInput && !endInput.value) endInput.value = toDateInputValue(today);

    if (generateButton) generateButton.addEventListener("click", generate);
    if (exportButton) exportButton.addEventListener("click", exportCsv);
    await generate();

    async function generate() {
        const startDate = startInput?.value || "";
        const endDate = endInput?.value || "";
        if (startDate && endDate && startDate > endDate) {
            reportMessage("The start date must be on or before the end date.");
            return;
        }

        if (generateButton) generateButton.disabled = true;
        reportMessage("Generating report from backend records…");
        try {
            const reportType = typeInput?.value || "requests";
            const requests = reportType === "residents" ? [] : await getReportData("/api/requests", "requests");
            const residents = reportType === "requests" ? [] : await getReportData("/api/admin/residents", "residents");
            const filteredRequests = requests.filter(item => inDateRange(item.dateRequested || item.createdAt, startDate, endDate));
            const filteredResidents = residents.filter(item => inDateRange(item.createdAt || item.registeredAt, startDate, endDate));

            currentReport = { reportType, startDate, endDate, requests: filteredRequests, residents: filteredResidents };
            if (reportType === "residents") renderResidentReport(filteredResidents);
            else if (reportType === "processing") renderProcessingReport(filteredRequests);
            else renderRequestReport(filteredRequests);
            reportMessage(`Report generated: ${reportType === "residents" ? filteredResidents.length + " resident account(s)" : filteredRequests.length + " document request(s)"}.`);
        } catch (error) {
            console.error("Admin report generation failed:", error);
            reportMessage(error.message || "Unable to generate report. Check your admin session and server.");
        } finally {
            if (generateButton) generateButton.disabled = false;
        }
    }

    async function getReportData(url, key) {
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
            window.location.href = "admin-login.html";
            throw new Error("Your admin session has expired. Please sign in again.");
        }
        if (!response.ok || !Array.isArray(result[key])) throw new Error(result.message || `Unable to load ${key}.`);
        return result[key];
    }

    function renderRequestReport(requests) {
        const statuses = requests.map(r => normalizeReportStatus(r.status));
        setReportValue("reportTotalRequests", requests.length);
        setReportValue("reportCompleted", statuses.filter(s => s === "Released").length);
        setReportValue("reportPending", statuses.filter(s => s === "Pending" || s === "Under Review" || s === "Approved").length);
        setReportValue("reportRejected", statuses.filter(s => s === "Rejected").length);

        const typeMap = [
            ["clearance", "Barangay Clearance"],
            ["residency", "Certificate of Residency"],
            ["indigency", "Certificate of Indigency"],
            ["business", "Business Clearance"]
        ];
        const tbody = document.getElementById("reportDocumentTypeRows");
        if (tbody) tbody.innerHTML = typeMap.map(([key, label]) => {
            const group = requests.filter(r => String(r.documentType || "").toLowerCase() === key);
            const complete = group.filter(r => normalizeReportStatus(r.status) === "Released").length;
            const pending = group.filter(r => ["Pending", "Under Review", "Approved"].includes(normalizeReportStatus(r.status))).length;
            return `<tr><td>${escapeReportText(label)}</td><td>${group.length}</td><td>${complete}</td><td>${pending}</td></tr>`;
        }).join("");

        const statusRows = [
            ["Pending", ["Pending"]],
            ["Under Review / Processing", ["Under Review", "Processing"]],
            ["Approved", ["Approved"]],
            ["Ready for Pickup", ["Ready for Pickup"]],
            ["Released / Completed", ["Released", "Completed"]],
            ["Rejected", ["Rejected"]]
        ];
        const statusBody = document.getElementById("reportStatusRows");
        if (statusBody) statusBody.innerHTML = statusRows.map(([label, values]) => {
            const count = requests.filter(r => values.includes(normalizeReportStatus(r.status))).length;
            return `<tr><td>${escapeReportText(label)}</td><td>${count}</td></tr>`;
        }).join("");
    }

    function renderProcessingReport(requests) {
        renderRequestReport(requests);
        const tbody = document.getElementById("reportDocumentTypeRows");
        if (tbody) tbody.innerHTML = requests.map(r => {
            const requested = r.dateRequested ? new Date(r.dateRequested) : null;
            const processed = r.dateProcessed ? new Date(r.dateProcessed) : null;
            const days = requested && processed && !Number.isNaN(+requested) && !Number.isNaN(+processed)
                ? Math.max(0, Math.round((processed - requested) / 86400000)) : "In progress";
            return `<tr><td>${escapeReportText(r.requestId || "—")}</td><td>${escapeReportText(r.documentType || "—")}</td><td>${escapeReportText(normalizeReportStatus(r.status))}</td><td>${days}</td></tr>`;
        }).join("");
        const table = tbody?.closest("table");
        if (table) table.querySelector("thead").innerHTML = "<tr><th>Request Reference</th><th>Document Type</th><th>Status</th><th>Processing Days</th></tr>";
    }

    function renderResidentReport(residents) {
        setReportValue("reportTotalRequests", residents.length);
        setReportValue("reportCompleted", residents.filter(r => String(r.status).toLowerCase() === "approved").length);
        setReportValue("reportPending", residents.filter(r => String(r.status).toLowerCase().includes("pending")).length);
        setReportValue("reportRejected", residents.filter(r => String(r.status).toLowerCase() === "rejected").length);
        const tbody = document.getElementById("reportDocumentTypeRows");
        if (tbody) {
            const table = tbody.closest("table");
            if (table) table.querySelector("thead").innerHTML = "<tr><th>Resident</th><th>Email</th><th>Status</th><th>Registered</th></tr>";
            tbody.innerHTML = residents.map(r => `<tr><td>${escapeReportText([r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || r.name || "—")}</td><td>${escapeReportText(r.email || "—")}</td><td>${escapeReportText(r.status || "Pending Verification")}</td><td>${escapeReportText(formatReportDate(r.createdAt || r.registeredAt))}</td></tr>`).join("");
        }
        const statusBody = document.getElementById("reportStatusRows");
        if (statusBody) statusBody.innerHTML = ["Approved", "Pending Verification", "Rejected"].map(status => {
            const count = residents.filter(r => String(r.status || "Pending Verification").toLowerCase() === status.toLowerCase()).length;
            return `<tr><td>${status}</td><td>${count}</td></tr>`;
        }).join("");
    }

    function exportCsv() {
        if (!currentReport) {
            reportMessage("Generate a report before exporting.");
            return;
        }
        const rows = currentReport.reportType === "residents" ? currentReport.residents : currentReport.requests;
        const columns = currentReport.reportType === "residents"
            ? ["id", "firstName", "lastName", "email", "status", "createdAt"]
            : ["requestId", "residentName", "residentEmail", "documentType", "status", "dateRequested", "dateProcessed", "remarks"];
        const csv = [columns.join(","), ...rows.map(row => columns.map(key => csvCell(row[key])).join(","))].join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `barangaycert-${currentReport.reportType}-${currentReport.startDate || "all"}-to-${currentReport.endDate || "all"}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    function reportMessage(message) {
        const element = document.getElementById("reportMessage");
        if (element) element.textContent = message;
    }
    function setReportValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    }
}

function normalizeReportStatus(value) {
    const status = String(value || "Pending").trim();
    if (status.toLowerCase() === "completed") return "Released";
    if (status.toLowerCase() === "processing") return "Under Review";
    return status;
}
function inDateRange(value, start, end) {
    if (!start && !end) return true;
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(+date)) return false;
    const day = toDateInputValue(date);
    return (!start || day >= start) && (!end || day <= end);
}
function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function formatReportDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(+date) ? "—" : date.toLocaleDateString("en-PH");
}
function escapeReportText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}
function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}


/* =========================================================
   12. PAGE ACCESS PROTECTION
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
   13. LOGOUT
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
   ACCESSIBILITY - KEYBOARD NAVIGATION
   ========================================================= */

(function initializeAccessibility() {

    /* -----------------------------------------------------
       CREATE SKIP TO CONTENT LINK
       ----------------------------------------------------- */

    if (
        !document.querySelector(
            ".skip-to-content"
        )
    ) {

        const mainContent =
            document.querySelector(
                "main"
            );

        if (mainContent) {

            if (!mainContent.id) {

                mainContent.id =
                    "main-content";

            }

            const skipLink =
                document.createElement(
                    "a"
                );

            skipLink.href =
                "#" + mainContent.id;

            skipLink.className =
                "skip-to-content";

            skipLink.textContent =
                "Skip to main content";

            document.body.prepend(
                skipLink
            );

        }

    }


    /* -----------------------------------------------------
       LABEL SIDEBAR NAVIGATION
       ----------------------------------------------------- */

    const sidebarNavs =
        document.querySelectorAll(
            ".sidebar nav, .sidebar-nav"
        );

    sidebarNavs.forEach(
        function(nav) {

            if (
                !nav.hasAttribute(
                    "aria-label"
                )
            ) {

                nav.setAttribute(
                    "aria-label",
                    "Main navigation"
                );

            }

        }
    );


    /* -----------------------------------------------------
       LABEL SIDEBARS
       ----------------------------------------------------- */

    const sidebars =
        document.querySelectorAll(
            ".sidebar"
        );

    sidebars.forEach(
        function(sidebar) {

            if (
                !sidebar.hasAttribute(
                    "aria-label"
                )
            ) {

                sidebar.setAttribute(
                    "aria-label",
                    "Sidebar navigation"
                );

            }

        }
    );


    /* -----------------------------------------------------
       LABEL LOGOUT LINKS
       ----------------------------------------------------- */

    const logoutLinks =
        document.querySelectorAll(
            ".logout-link, .logout"
        );

    logoutLinks.forEach(
        function(link) {

            if (
                !link.hasAttribute(
                    "aria-label"
                )
            ) {

                link.setAttribute(
                    "aria-label",
                    "Log out of BarangayCert"
                );

            }

        }
    );


    /* -----------------------------------------------------
       ADD ACCESSIBLE LABELS TO ICON-ONLY BUTTONS
       ----------------------------------------------------- */

    const buttons =
        document.querySelectorAll(
            "button"
        );

    buttons.forEach(
        function(button) {

            const visibleText =
                button.textContent
                    .trim();

            const ariaLabel =
                button.getAttribute(
                    "aria-label"
                );

            if (
                !visibleText &&
                !ariaLabel
            ) {

                button.setAttribute(
                    "aria-label",
                    "Action"
                );

            }

        }
    );


    /* -----------------------------------------------------
       ACCESSIBLE FORM ERRORS
       ----------------------------------------------------- */

    const invalidFields =
        document.querySelectorAll(
            ".input-error"
        );

    invalidFields.forEach(
        function(field) {

            field.setAttribute(
                "aria-invalid",
                "true"
            );

        }
    );

    /* -----------------------------------------------------
   WATCH VALIDATION STATES
   ----------------------------------------------------- */

const validationObserver =
    new MutationObserver(
        function(mutations) {

            mutations.forEach(
                function(mutation) {

                    if (
                        mutation.type !==
                        "attributes"
                    ) {
                        return;
                    }

                    const field =
                        mutation.target;

                    if (
                        field.classList &&
                        field.classList.contains(
                            "input-error"
                        )
                    ) {

                        field.setAttribute(
                            "aria-invalid",
                            "true"
                        );

                    }
                    else {

                        field.removeAttribute(
                            "aria-invalid"
                        );

                    }

                }
            );

        }
    );


document
    .querySelectorAll(
        "input, select, textarea"
    )
    .forEach(
        function(field) {

            validationObserver.observe(
                field,
                {
                    attributes: true,
                    attributeFilter: [
                        "class"
                    ]
                }
            );

        }
    );

})();


/* =========================================================
   END OF JAVASCRIPT
   ========================================================= */