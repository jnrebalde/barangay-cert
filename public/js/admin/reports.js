/*
 * Administrator reporting feature.
 * Owns report filters, rendering, and export orchestration.
 */
(function (global) {
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

  global.initializeAdminReports = initializeAdminReports;
})(globalThis);
