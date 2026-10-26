const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const scryptAsync = promisify(scrypt);
const session = require("express-session");
const { readResidents, updateResidents } = require("./repositories/resident-store");
const { readRequests, updateRequests } = require("./repositories/request-store");
const { validateRequest } = require("./validators/request-validation");

const app = express();
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be configured in production.");
}
const SESSION_SECRET = process.env.SESSION_SECRET || "barangaycert-local-development-secret-change-before-deployment";
const DATA_DIR = path.join(__dirname, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");
const RESIDENTS_FILE = path.join(DATA_DIR, "residents.json");
const ADMIN_SETTINGS_FILE = path.join(DATA_DIR, "admin-settings.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

app.use(express.json({ limit: "1mb" }));
app.use(session({
    name: "barangaycert.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }
}));
// Keep JSON storage and backend source files out of public static access.
app.use((req, res, next) => {
    if (/^\/(data|node_modules|repositories|services|validators)(\/|$)/i.test(req.path) ||
        /^\/(app|package(?:-lock)?)(\.js|\.json)?$/i.test(req.path)) {
        return res.sendStatus(404);
    }
    next();
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

let notificationQueue = Promise.resolve();

async function readNotifications() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        const raw = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

function createNotification(notification) {
    const operation = notificationQueue.then(async () => {
        const notifications = await readNotifications();
        notifications.push({
            id: `NTF-${Date.now()}-${randomBytes(4).toString("hex")}`,
            createdAt: new Date().toISOString(),
            read: false,
            ...notification
        });
        // Keep the file bounded while retaining recent history.
        const kept = notifications.slice(-5000);
        const temporaryFile = `${NOTIFICATIONS_FILE}.tmp`;
        await fs.writeFile(temporaryFile, JSON.stringify(kept, null, 2) + "\n", "utf8");
        await fs.rename(temporaryFile, NOTIFICATIONS_FILE);
    });
    notificationQueue = operation.catch((error) => console.error("Notification save failed:", error));
    return operation;
}

function publicResident(resident) {
    const { passwordHash, passwordSalt, ...safeResident } = resident;
    return safeResident;
}

function defaultResidentProfile() {
    return {
        middleName: "", birthdate: "", age: "", gender: "", civilStatus: "",
        birthplace: "", nationality: "", house: "", street: "", purok: "",
        barangay: "Poblacion", municipality: "Pandi", province: "Bulacan",
        residencyYears: "", residentStatus: "", mobile: "", voterStatus: "",
        householdHead: "", familyMembers: "", employment: "", occupation: "",
        businessName: "", businessAddress: "", idType: "", idNumber: "",
        emergencyName: "", emergencyNumber: "", relationship: ""
    };
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
    const derived = await scryptAsync(password, salt, 64);
    return { passwordSalt: salt, passwordHash: derived.toString("hex") };
}

async function passwordMatches(password, resident) {
    if (!resident.passwordHash || !resident.passwordSalt) return false;
    const supplied = await scryptAsync(password, resident.passwordSalt, 64);
    const stored = Buffer.from(resident.passwordHash, "hex");
    return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

// Admin login and resident approval are server-backed so they update the same
// residents.json file used by resident registration and login.
app.post("/api/admin/login", async (req, res) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
        const settings = await readAdminSettings();
        if (username !== settings.username || !(await passwordMatches(password, settings))) {
            return res.status(401).json({ message: "Invalid admin username or password." });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error("Admin session creation failed:", error);
                return res.status(500).json({ message: "Unable to start an admin session." });
            }
            req.session.adminAuthenticated = true;
            req.session.adminUsername = username;
            return res.json({ message: "Admin login successful.", username });
        });
    } catch (error) {
        console.error("Admin login failed:", error);
        return res.status(500).json({ message: "Unable to verify admin credentials." });
    }
});
app.post("/api/admin/logout", (req, res) => {
    if (req.session) {
        delete req.session.adminAuthenticated;
        delete req.session.adminUsername;
    }
    return res.json({ message: "Admin logged out." });
});

function requireAdmin(req, res, next) {
    if (!req.session?.adminAuthenticated) {
        return res.status(401).json({ message: "Admin login required." });
    }
    next();
}

function requireResident(req, res, next) {
    if (req.session?.residentId === undefined || req.session?.residentId === null || req.session?.adminAuthenticated) {
        return res.status(401).json({ message: "Resident login required." });
    }
    next();
}

let adminSettingsQueue = Promise.resolve();

async function readAdminSettings() {
    const contents = await fs.readFile(ADMIN_SETTINGS_FILE, "utf8");
    return JSON.parse(contents);
}

function updateAdminSettings(change) {
    const operation = adminSettingsQueue.then(async () => {
        const settings = await readAdminSettings();
        const result = await change(settings);
        const temporaryFile = `${ADMIN_SETTINGS_FILE}.tmp`;
        try {
            await fs.writeFile(temporaryFile, JSON.stringify(settings, null, 2) + "\n", "utf8");
            await fs.rename(temporaryFile, ADMIN_SETTINGS_FILE);
        } finally {
            await fs.rm(temporaryFile, { force: true });
        }
        return result;
    });
    adminSettingsQueue = operation.catch(() => {});
    return operation;
}

function publicAdminSettings(settings) {
    return {
        name: settings.name,
        email: settings.email,
        username: settings.username
    };
}

app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
        const settings = await readAdminSettings();
        res.set("Cache-Control", "no-store");
        return res.json({ settings: publicAdminSettings(settings) });
    } catch (error) {
        console.error("Admin settings load failed:", error);
        return res.status(500).json({ message: "Unable to load administrator settings." });
    }
});

app.patch("/api/admin/settings/profile", requireAdmin, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!name || name.length > 100) {
        return res.status(400).json({ message: "Name is required and must be 100 characters or fewer." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }

    try {
        const settings = await updateAdminSettings((current) => {
            current.name = name;
            current.email = email;
            current.updatedAt = new Date().toISOString();
            return publicAdminSettings(current);
        });
        return res.json({ message: "Administrator account updated successfully.", settings });
    } catch (error) {
        console.error("Admin profile update failed:", error);
        return res.status(500).json({ message: "Unable to save administrator account settings." });
    }
});

app.patch("/api/admin/settings/password", requireAdmin, async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Enter your current password and a new password." });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ message: "New password must be between 8 and 128 characters." });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ message: "Choose a new password different from your current password." });
    }

    try {
        const changed = await updateAdminSettings(async (settings) => {
            if (!(await passwordMatches(currentPassword, settings))) {
                throw Object.assign(new Error("Current password is incorrect."), { statusCode: 400 });
            }
            const hashed = await hashPassword(newPassword);
            settings.passwordHash = hashed.passwordHash;
            settings.passwordSalt = hashed.passwordSalt;
            settings.passwordUpdatedAt = new Date().toISOString();
            return true;
        });
        return res.json({ message: "Administrator password updated successfully." });
    } catch (error) {
        if (error.statusCode === 400) return res.status(400).json({ message: error.message });
        console.error("Admin password update failed:", error);
        return res.status(500).json({ message: "Unable to update administrator password." });
    }
});

app.get("/api/admin/residents", requireAdmin, async (req, res) => {
    try {
        const residents = await readResidents();
        res.set("Cache-Control", "no-store");
        return res.json({ residents: residents.map(publicResident) });
    } catch (error) {
        console.error("Admin resident list failed:", error);
        return res.status(500).json({ message: "Unable to retrieve residents." });
    }
});

app.patch("/api/admin/residents/:residentId/status", requireAdmin, async (req, res) => {
    const status = req.body?.status;
    if (!['Approved', 'Pending Verification'].includes(status)) {
        return res.status(400).json({ message: "Unsupported resident status." });
    }
    try {
        const resident = await updateResidents((residents) => {
            const target = residents.find((item) => String(item.id) === String(req.params.residentId));
            if (!target) throw Object.assign(new Error("Resident account could not be found."), { statusCode: 404 });
            target.status = status;
            target.updatedAt = new Date().toISOString();
            target.approvedBy = status === "Approved" ? req.session.adminUsername : null;
            target.approvedAt = status === "Approved" ? new Date().toISOString() : null;
            return target;
        });
        await createNotification({
            audience: "resident", residentId: resident.id, type: "account_status",
            title: status === "Approved" ? "Account approved" : "Account status updated",
            message: status === "Approved" ? "Your resident account has been approved. You can now submit document requests." : "Your account has been returned to pending verification.",
            link: "resident-dashboard.html"
        });
        return res.json({ message: status === "Approved" ? "Resident account approved successfully." : "Resident account returned to pending verification.", resident: publicResident(resident) });
    } catch (error) {
        if (error.statusCode === 404) return res.status(404).json({ message: error.message });
        console.error("Resident approval failed:", error);
        return res.status(500).json({ message: "Unable to update resident status." });
    }
});

app.post("/api/auth/register", async (req, res) => {
    const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Please complete all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
    }

    try {
        const credentials = await hashPassword(password);
        const resident = await updateResidents((residents) => {
            if (residents.some((item) => String(item.email).toLowerCase() === email)) {
                throw Object.assign(new Error("An account with this email already exists."), { statusCode: 409 });
            }
            const newResident = {
                id: Date.now(), firstName, lastName, email,
                ...credentials,
                status: "Pending Verification",
                createdAt: new Date().toISOString(),
                profile: defaultResidentProfile()
            };
            residents.push(newResident);
            return newResident;
        });
        await createNotification({
            audience: "admin", type: "resident_registered", title: "New resident registration",
            message: `${resident.firstName} ${resident.lastName} registered and is awaiting verification.`,
            residentId: resident.id, residentName: `${resident.firstName} ${resident.lastName}`, link: "admin-residents.html"
        });
        return res.status(201).json({
            message: "Registration submitted successfully. Your account is pending admin approval.",
            resident: publicResident(resident)
        });
    } catch (error) {
        if (error.statusCode === 409) return res.status(409).json({ message: error.message });
        console.error("Resident registration failed:", error);
        return res.status(500).json({ message: "Unable to create your account. Please try again." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const rememberMe = req.body?.rememberMe === true;
    if (!email || !password) return res.status(400).json({ message: "Please enter your email and password." });

    try {
        const residents = await readResidents();
        const resident = residents.find((item) => String(item.email).toLowerCase() === email);
        if (!resident || !(await passwordMatches(password, resident))) {
            return res.status(401).json({ message: "Invalid email or password." });
        }
        if (resident.status !== "Approved") {
            return res.status(403).json({ message: "Your account is still pending admin approval.", status: resident.status });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error("Resident session creation failed:", error);
                return res.status(500).json({ message: "Unable to start a resident session." });
            }
            req.session.residentId = resident.id;
            req.session.residentEmail = resident.email;
            if (rememberMe) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
            else req.session.cookie.maxAge = null;
            return res.json({ message: "Login successful.", resident: publicResident(resident) });
        });
    } catch (error) {
        console.error("Resident login failed:", error);
        return res.status(500).json({ message: "Unable to log in right now. Please try again." });
    }
});

app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.residentId) return res.status(401).json({ message: "Not logged in." });
    try {
        const residents = await readResidents();
        const resident = residents.find((item) => String(item.id) === String(req.session.residentId));
        if (!resident || resident.status !== "Approved") {
            req.session.destroy(() => {});
            return res.status(401).json({ message: "Resident session is no longer valid." });
        }
        return res.json({ resident: publicResident(resident) });
    } catch (error) {
        console.error("Resident session lookup failed:", error);
        return res.status(500).json({ message: "Unable to verify the current session." });
    }
});

// Save profile changes to the authenticated resident's backend account.
app.patch("/api/resident/profile", async (req, res) => {
    if (!req.session?.residentId) {
        return res.status(401).json({ message: "Please log in again before saving your profile." });
    }

    const body = req.body || {};
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const incomingProfile = body.profile && typeof body.profile === "object" && !Array.isArray(body.profile) ? body.profile : null;
    if (!firstName || !lastName || !email || !incomingProfile) {
        return res.status(400).json({ message: "First name, last name, email, and profile details are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const editableFields = [
        "middleName", "birthdate", "age", "gender", "civilStatus", "birthplace", "nationality",
        "house", "street", "purok", "residencyYears", "residentStatus", "mobile", "voterStatus",
        "householdHead", "familyMembers", "employment", "occupation", "businessName", "businessAddress",
        "idType", "idNumber", "emergencyName", "emergencyNumber", "relationship"
    ];

    try {
        const resident = await updateResidents((residents) => {
            const target = residents.find((item) => String(item.id) === String(req.session.residentId));
            if (!target || target.status !== "Approved") {
                throw Object.assign(new Error("Approved resident account could not be found."), { statusCode: 404 });
            }
            if (residents.some((item) => String(item.id) !== String(target.id) && String(item.email).toLowerCase() === email)) {
                throw Object.assign(new Error("That email address is already being used by another resident."), { statusCode: 409 });
            }
            target.firstName = firstName;
            target.lastName = lastName;
            target.email = email;
            target.profile = target.profile || defaultResidentProfile();
            for (const field of editableFields) {
                if (Object.prototype.hasOwnProperty.call(incomingProfile, field)) {
                    target.profile[field] = String(incomingProfile[field] ?? "").trim();
                }
            }
            // These address fields are fixed by the barangay system.
            target.profile.barangay = "Poblacion";
            target.profile.municipality = "Pandi";
            target.profile.province = "Bulacan";
            target.updatedAt = new Date().toISOString();
            return target;
        });
        req.session.residentEmail = email;
        return res.json({ message: "Profile saved successfully.", resident: publicResident(resident) });
    } catch (error) {
        if ([404, 409].includes(error.statusCode)) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error("Resident profile save failed:", error);
        return res.status(500).json({ message: "Unable to save your profile. Please try again." });
    }
});

app.post("/api/auth/logout", (req, res) => {
    if (!req.session) return res.json({ message: "Logged out." });
    req.session.destroy((error) => {
        if (error) return res.status(500).json({ message: "Unable to log out." });
        res.clearCookie("barangaycert.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
        return res.json({ message: "Logged out." });
    });
});

// Notification API: admins see system-wide events; residents see only their own.
function notificationAudience(req) {
    if (req.session?.adminAuthenticated) return { audience: "admin" };
    if (req.session?.residentId !== undefined && req.session?.residentId !== null) {
        return { audience: "resident", residentId: String(req.session.residentId) };
    }
    return null;
}

app.get("/api/notifications", async (req, res) => {
    const scope = notificationAudience(req);
    if (!scope) return res.status(401).json({ message: "Please sign in to view notifications." });
    try {
        const all = await readNotifications();
        const notifications = all
            .filter((item) => item.audience === scope.audience &&
                (scope.audience === "admin" || String(item.residentId) === scope.residentId))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.set("Cache-Control", "no-store");
        return res.json({ notifications });
    } catch (error) {
        console.error("Notification retrieval failed:", error);
        return res.status(500).json({ message: "Unable to retrieve notifications." });
    }
});

app.patch("/api/notifications/:notificationId/read", async (req, res) => {
    const scope = notificationAudience(req);
    if (!scope) return res.status(401).json({ message: "Please sign in to update notifications." });
    try {
        const notifications = await readNotifications();
        const target = notifications.find((item) => String(item.id) === String(req.params.notificationId) &&
            item.audience === scope.audience &&
            (scope.audience === "admin" || String(item.residentId) === scope.residentId));
        if (!target) return res.status(404).json({ message: "Notification not found." });
        target.read = true;
        const temporaryFile = `${NOTIFICATIONS_FILE}.tmp`;
        await fs.writeFile(temporaryFile, JSON.stringify(notifications, null, 2) + "\n", "utf8");
        await fs.rename(temporaryFile, NOTIFICATIONS_FILE);
        return res.json({ message: "Notification marked as read." });
    } catch (error) {
        console.error("Notification update failed:", error);
        return res.status(500).json({ message: "Unable to update notification." });
    }
});

app.patch("/api/notifications/read-all", async (req, res) => {
    const scope = notificationAudience(req);
    if (!scope) return res.status(401).json({ message: "Please sign in to update notifications." });
    try {
        const notifications = await readNotifications();
        let updated = 0;
        for (const item of notifications) {
            if (item.audience === scope.audience &&
                (scope.audience === "admin" || String(item.residentId) === scope.residentId) && !item.read) {
                item.read = true;
                updated++;
            }
        }
        const temporaryFile = `${NOTIFICATIONS_FILE}.tmp`;
        await fs.writeFile(temporaryFile, JSON.stringify(notifications, null, 2) + "\n", "utf8");
        await fs.rename(temporaryFile, NOTIFICATIONS_FILE);
        return res.json({ message: "Notifications marked as read.", updated });
    } catch (error) {
        console.error("Bulk notification update failed:", error);
        return res.status(500).json({ message: "Unable to update notifications." });
    }
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
    if (!req.session?.adminAuthenticated && (req.session?.residentId === undefined || req.session?.residentId === null)) {
        return res.status(401).json({ message: "Please sign in to view document requests." });
    }
    try {
        let requests = await readRequests();
        if (!req.session.adminAuthenticated) requests = requests.filter((item) => String(item.residentId) === String(req.session.residentId));
        requests.sort((a, b) => new Date(b.dateRequested || 0) - new Date(a.dateRequested || 0));
        res.set("Cache-Control", "no-store");
        return res.json({ requests });
    } catch (error) {
        console.error("Request retrieval failed:", error);
        return res.status(500).json({ message: "Unable to retrieve document requests." });
    }
});

app.get("/api/requests/:requestId", async (req, res) => {
    if (!req.session?.adminAuthenticated && (req.session?.residentId === undefined || req.session?.residentId === null)) {
        return res.status(401).json({ message: "Please sign in to view this document request." });
    }
    try {
        const requests = await readRequests();
        const request = requests.find((item) => String(item.requestId) === String(req.params.requestId));
        if (!request) return res.status(404).json({ message: "Document request not found." });
        if (!req.session.adminAuthenticated && String(request.residentId) !== String(req.session.residentId)) {
            return res.status(404).json({ message: "Document request not found." });
        }
        res.set("Cache-Control", "no-store");
        return res.json({ request });
    } catch (error) {
        console.error("Request retrieval failed:", error);
        return res.status(500).json({ message: "Unable to retrieve the document request." });
    }
});

app.post("/api/requests", requireResident, async (req, res) => {
    const residents = await readResidents();
    const resident = residents.find((item) => String(item.id) === String(req.session.residentId) && item.status === "Approved");
    if (!resident) return res.status(401).json({ message: "Approved resident account required." });
    const profile = resident.profile || {};
    const trustedBody = { ...req.body, residentId: resident.id, residentEmail: resident.email, residentName: `${resident.firstName || ""} ${resident.lastName || ""}`.trim(), mobile: String(profile.mobile || ""), address: [profile.house, profile.street, profile.purok, profile.barangay || "Poblacion", profile.municipality || "Pandi", profile.province || "Bulacan"].filter(Boolean).join(", ") };
    const errors = validateRequest(trustedBody);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: "Please correct the highlighted information.", errors });
    }

    try {
        const body = trustedBody;
        let request;

        // The request-store queue serializes writes, so the next number is
        // selected and saved within the same queued operation.
        await updateRequests((requests) => {
            const year = new Date().getFullYear();
            const prefix = `REQ-${year}-`;
            let highestSequence = 0;

            for (const existing of requests) {
                const id = String(existing.requestId || existing.requestReference || existing.reference || "");
                if (!id.startsWith(prefix)) continue;

                const suffix = id.slice(prefix.length);
                if (/^\d+$/.test(suffix)) {
                    highestSequence = Math.max(highestSequence, Number(suffix));
                }
            }

            const nextSequence = highestSequence + 1;
            if (!Number.isSafeInteger(nextSequence)) {
                throw new Error(`Request reference sequence exhausted for ${year}.`);
            }

            request = {
                requestId: `${prefix}${String(nextSequence).padStart(4, "0")}`,
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

            // Defensive duplicate check before committing the new record.
            if (requests.some((existing) => existing.requestId === request.requestId)) {
                throw new Error(`Duplicate request reference generated: ${request.requestId}`);
            }

            requests.push(request);
        });

        await Promise.all([
            createNotification({ audience: "admin", type: "new_request", title: "New document request", message: `${request.residentName} submitted a ${request.documentType} request (${request.requestId}).`, requestId: request.requestId, residentId: request.residentId, link: "admin-requests.html" }),
            ...(request.residentId ? [createNotification({ audience: "resident", residentId: request.residentId, type: "request_submitted", title: "Request submitted", message: `Your ${request.documentType} request (${request.requestId}) has been submitted and is pending review.`, requestId: request.requestId, link: "resident-track.html" })] : [])
        ]);
        return res.status(201).json({ message: "Your document request has been saved.", request });
    } catch (error) {
        console.error("Request submission failed:", error);
        return res.status(500).json({ message: "Your request could not be saved. Please try again." });
    }
});

app.patch("/api/requests/:requestId/status", requireAdmin, async (req, res) => {
    const { status, remarks = "" } = req.body || {};
    const processedBy = req.session.adminUsername || "Administrator";
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
        if (updated.residentId) {
            await createNotification({
                audience: "resident", residentId: updated.residentId, type: "request_status",
                title: `Request ${updated.status}`, message: `Your ${updated.documentType} request (${updated.requestId}) is now ${updated.status}.${updated.remarks ? ` Note: ${updated.remarks}` : ""}`,
                requestId: updated.requestId, link: "resident-track.html"
            });
        }
        await createNotification({ audience: "admin", type: "request_status", title: "Request status updated", message: `${updated.requestId} status changed to ${updated.status}.`, requestId: updated.requestId, residentId: updated.residentId, link: "admin-requests.html" });
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
        await fs.access(RESIDENTS_FILE);
    } catch {
        await fs.writeFile(RESIDENTS_FILE, "[]\n", "utf8");
    }
    try {
        await fs.access(REQUESTS_FILE);
    } catch {
        await fs.writeFile(REQUESTS_FILE, "[]\n", "utf8");
    }
    try {
        await fs.access(ADMIN_SETTINGS_FILE);
    } catch {
        const initialPassword = process.env.ADMIN_PASSWORD || "admin123";
        const credentials = await hashPassword(initialPassword);
        const initialSettings = {
            username: process.env.ADMIN_USERNAME || "admin",
            name: "Barangay Administrator",
            email: "admin@barangaypandi.gov.ph",
            passwordHash: credentials.passwordHash,
            passwordSalt: credentials.passwordSalt,
            createdAt: new Date().toISOString()
        };
        await fs.writeFile(ADMIN_SETTINGS_FILE, JSON.stringify(initialSettings, null, 2) + "\n", "utf8");
    }
    app.listen(PORT, () => console.log(`BarangayCert is running at http://localhost:${PORT}`));
}

startServer().catch((error) => {
    console.error("Unable to start BarangayCert:", error);
    process.exitCode = 1;
});
