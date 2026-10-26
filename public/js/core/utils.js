/*
 * BarangayCert shared pure utilities.
 * Side-effect-free helpers reused by resident and administrator features.
 * Exposed on globalThis for compatibility with existing classic scripts.
 */
(function (global) {
function escapeHtmlText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
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

function formatReportDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(+date) ? "—" : date.toLocaleDateString("en-PH");
}

function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

  global.escapeHtmlText = escapeHtmlText;
  global.escapeReportText = escapeReportText;
  global.csvCell = csvCell;
  global.formatReportDate = formatReportDate;
  global.toDateInputValue = toDateInputValue;
  global.normalizeReportStatus = normalizeReportStatus;
  global.inDateRange = inDateRange;
})(globalThis);
