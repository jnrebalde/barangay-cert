/*
 * Shared backend request helpers. These are client utilities, not authorization controls.
 * Server-side authentication and authorization must independently validate every action.
 */
(function (global) {
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

  global.getBackendRequests = getBackendRequests;
  global.saveBackendRequestStatus = saveBackendRequestStatus;
})(globalThis);
