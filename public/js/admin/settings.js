/*
 * Administrator settings feature.
 * Owns settings form behavior and delegates server requests to the existing helper.
 */
(function (global) {
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

  global.initializeAdminSettings = initializeAdminSettings;
})(globalThis);
