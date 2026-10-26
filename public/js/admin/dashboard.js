/*
 * Administrator dashboard feature.
 * Loads and renders administrator summary metrics using shared application services.
 */
(function (global) {
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

  global.loadAdminDashboard = loadAdminDashboard;
})(globalThis);
