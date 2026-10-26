/*
 * Resident document request views.
 * Owns request history, tracking, document labels, purposes, and status display.
 * Uses existing shared services and keeps a classic-script global interface.
 */
(function (global) {
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

  global.loadResidentRequestHistory = loadResidentRequestHistory;
  global.loadResidentRequests = loadResidentRequests;
  global.getDocumentName = getDocumentName;
  global.getRequestPurpose = getRequestPurpose;
  global.displayRequestStatus = displayRequestStatus;
})(globalThis);
