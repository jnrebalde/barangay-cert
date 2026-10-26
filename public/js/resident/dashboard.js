/*
 * Resident dashboard feature module.
 * Renders the authenticated resident's request summary using shared application helpers.
 */
(function (global) {
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
  global.loadResidentDashboard = loadResidentDashboard;
})(globalThis);
