const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { readRequests, updateRequests } = require("./request-store");
const { validateRequest } = require("./request-validation");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/api/health", async (req, res) => {
    try {
        await readRequests();
        return res.json({ status: "ok", service: "BarangayCert API", storage: "ready" });
    } catch (error) {
        console.error("Storage health check failed:", error);
        return res.status(500).json({ status: "error", message: "Request storage could not be read." });
    }
});

// The frontend expects { requests: [...] }; keep exactly one list endpoint.
app.get("/api/requests", async (req, res) => {
    try {
        const requests = await readRequests();
        requests.sort((a, b) => new Date(b.dateRequested || 0) - new Date(a.dateRequested || 0));
        res.set("Cache-Control", "no-store");
        return res.json({ requests });
    } catch (error) {
        console.error("Request retrieval failed:", error);
        return res.status(500).json({ message: "Unable to retrieve document requests." });
    }
});

app.get("/api/requests/:requestId", async (req, res) => {
    try {
        const requests = await readRequests();
        const request = requests.find((item) => String(item.requestId) === String(req.params.requestId));
        if (!request) return res.status(404).json({ message: "Document request not found." });
        res.set("Cache-Control", "no-store");
        return res.json({ request });
    } catch (error) {
        console.error("Request retrieval failed:", error);
        return res.status(500).json({ message: "Unable to retrieve the document request." });
    }
});

app.post("/api/requests", async (req, res) => {
    const errors = validateRequest(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: "Please correct the highlighted information.", errors });
    }

    try {
        const body = req.body;
        const request = {
            requestId: `REQ-${new Date().getFullYear()}-${randomUUID()}`,
            residentId: Number.isSafeInteger(body.residentId) ? body.residentId : Number(body.residentId) || null,
            residentEmail: body.residentEmail.trim().toLowerCase(),
            residentName: body.residentName.trim(),
            mobile: body.mobile,
            address: body.address.trim(),
            documentType: body.documentType,
            documentData: body.documentData,
            status: "Pending",
            dateRequested: new Date().toISOString(),
            dateProcessed: null,
            processedBy: null,
            remarks: ""
        };

        await updateRequests((requests) => { requests.push(request); });
        return res.status(201).json({ message: "Your document request has been saved.", request });
    } catch (error) {
        console.error("Request submission failed:", error);
        return res.status(500).json({ message: "Your request could not be saved. Please try again." });
    }
});

app.patch("/api/requests/:requestId/status", async (req, res) => {
    const { status, remarks = "", processedBy = "Administrator" } = req.body || {};
    const allowedStatuses = ["Under Review", "Approved", "Ready for Pickup", "Released", "Rejected"];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Please select a supported request status." });
    }
    if (typeof remarks !== "string" || remarks.length > 500) {
        return res.status(400).json({ message: "Remarks must contain no more than 500 characters." });
    }
    if (status === "Rejected" && !remarks.trim()) {
        return res.status(400).json({ message: "Please provide a reason for rejection." });
    }

    try {
        const updated = await updateRequests((requests) => {
            const request = requests.find((item) => String(item.requestId) === String(req.params.requestId));
            if (!request) throw Object.assign(new Error("Request not found."), { statusCode: 404 });

            const transitions = {
                Pending: ["Under Review", "Approved", "Rejected"],
                "Under Review": ["Approved", "Rejected"],
                Approved: ["Ready for Pickup", "Rejected"],
                "Ready for Pickup": ["Released"],
                Released: [],
                Rejected: []
            };
            if (!(transitions[request.status] || []).includes(status)) {
                throw Object.assign(new Error(`Cannot change a ${request.status} request to ${status}.`), { statusCode: 409 });
            }

            request.status = status;
            request.dateProcessed = new Date().toISOString();
            request.processedBy = String(processedBy || "Administrator").slice(0, 100);
            request.remarks = remarks.trim() || `Request status updated to ${status}.`;
            return request;
        });
        return res.json({ message: "Request status has been saved.", request: updated });
    } catch (error) {
        console.error("Status update failed:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Unable to save the status. Please try again."
        });
    }
});

app.use("/api", (req, res) => res.status(404).json({ message: "API endpoint not found." }));

async function startServer() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(REQUESTS_FILE);
    } catch {
        await fs.writeFile(REQUESTS_FILE, "[]\n", "utf8");
    }
    app.listen(PORT, () => console.log(`BarangayCert is running at http://localhost:${PORT}`));
}

startServer().catch((error) => {
    console.error("Unable to start BarangayCert:", error);
    process.exitCode = 1;
});
