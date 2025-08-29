import { apiFetch } from "./jwtFetch.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await apiFetch("http://localhost:8082/api/auth/user-details", {
            method: "GET"
        });

        console.log("Response status:", res.status);

        if (!res.ok) {
            const text = await res.text();
            console.error("Server returned error body:", text);
            throw new Error(`Failed to fetch profile: ${res.status}`);
        }

        const profile = await res.json();
        console.log("Profile data:", profile);

        // Populate DOM
        document.getElementById("street").textContent = profile.address || "";
        document.getElementById("city").textContent = profile.city || "";
        document.querySelector("#details-tab .profile-field:nth-child(1) span").textContent = profile.firstName || "";
        document.querySelector("#details-tab .profile-field:nth-child(2) span").textContent = profile.lastName || "";
        document.querySelector("#details-tab .profile-field:nth-child(3) span").textContent = profile.email || "";
        document.querySelector("#details-tab .profile-field:nth-child(4) span").textContent = profile.phone || "";

        initProfileEditing();
    } catch (err) {
        console.error("Profile fetch failed:", err);
       // alert("Could not load profile data");
    }

    // Change password toggle
    const changePassBtn = document.getElementById("change-password-btn");
    const passwordFields = document.getElementById("password-fields");
    const passwordSaveBtn = document.getElementById("password-save-btn");
    const passwordCancelBtn = document.getElementById("password-cancel-btn");

    changePassBtn.addEventListener("click", () => {
        passwordFields.style.display = passwordFields.style.display === "block" ? "none" : "block";
        if (passwordFields.style.display === "none") clearChangePassFields();
    });

    passwordCancelBtn.addEventListener("click", () => {
        passwordFields.style.display = "none";
        clearChangePassFields();
    });

    passwordSaveBtn.addEventListener("click", async () => {
        const oldPass = document.getElementById("old-password").value.trim();
        const newPass = document.getElementById("new-password").value.trim();
        const repeatPass = document.getElementById("repeat-password").value.trim();
         if (!oldPass || !newPass || !repeatPass) {
             //todo change to a red text below the empty fields
            alert("All password fields must be filled.");
            return;
        }
        if (newPass !== repeatPass) {
            //todo show a message on the screen that is not an alert
            alert("New password and repeat password do not match.");
            return;
        }
        try {
            // 3. Send request to backend
            const res = await apiFetch("http://localhost:8082/api/auth/change-password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldPassword: oldPass,
                    newPassword: newPass,
                    confirmNewPassword: repeatPass
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Failed to change password");
            }

            // 4. Hide and clear fields
            passwordFields.style.display = "none";
            clearChangePassFields();

        } catch (err) {
            console.error("Password change failed:", err);
            //alert(`Error: ${err.message}`);
        }
    });

    function clearChangePassFields() {
        passwordFields.querySelectorAll("input").forEach(input => (input.value = ""));
    }

    // Toggle password visibility
    document.querySelectorAll(".toggle-password-btn").forEach(toggleBtn => {
        toggleBtn.addEventListener("click", () => {
            const input = toggleBtn.parentElement.querySelector("input");
            if (input.type === "password") {
                input.type = "text";
                toggleBtn.textContent = "🙈";
            } else {
                input.type = "password";
                toggleBtn.textContent = "👁️";
            }
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

function styleSpan(span) {
    span.style.padding = "8px";
    span.style.background = "#f4faff";
    span.style.borderRadius = "8px";
    span.style.border = "1px solid #d0e4f1";
    span.style.color = "#1a3c6e";
    span.style.flexGrow = "1";
    span.style.marginRight = "10px";
}

function initProfileEditing() {
    document.querySelectorAll(".profile-field").forEach(field => {
        if (field.id === "change-password-container") return;

        const editBtn = field.querySelector(".edit-btn");
        const saveBtn = field.querySelector(".save-btn");
        const cancelBtn = field.querySelector(".cancel-btn");

        let currentSpan = field.querySelector("span");
        let originalValue = currentSpan ? currentSpan.textContent : "";

        editBtn.addEventListener("click", () => {
            if (field.querySelector("input") || field.querySelector("gmpx-place-autocomplete")) return;

            let input;

            if (field.querySelector("label")?.textContent.trim() === "Address") {
                // Create new Google Place Autocomplete element
                input = document.createElement("gmpx-place-autocomplete");
                input.id = "address-autocomplete";
                input.placeholder = "Enter an address";
                input.style.width = "100%";

                // Listen for place change
                input.addEventListener("gmpx-placechange", () => {
                    const place = input.getPlace();
                    if (!place || !place.address_components) return;

                    let cityName = "";
                    place.address_components.forEach(component => {
                        if (component.types.includes("locality")) {
                            cityName = component.long_name;
                        } else if (component.types.includes("postal_town")) {
                            cityName = component.long_name;
                        } else if (!cityName && component.types.includes("administrative_area_level_2")) {
                            cityName = component.long_name;
                        }
                    });

                    if (cityName) {
                        const cityEl = document.getElementById("city");
                        if (cityEl.tagName.toLowerCase() === "span") {
                            const cityInput = document.createElement("input");
                            cityInput.type = "text";
                            cityInput.value = cityName;
                            cityInput.classList.add("edit-input");
                            cityEl.replaceWith(cityInput);
                        } else {
                            cityEl.value = cityName;
                        }
                    }
                });
            } else {
                // Normal text input for other fields
                input = document.createElement("input");
                input.type = "text";
                input.value = originalValue;
                input.classList.add("edit-input");
            }

            currentSpan.replaceWith(input);
            currentSpan = input;

            editBtn.style.display = "none";
            saveBtn.style.display = "inline-block";
            cancelBtn.style.display = "inline-block";
        });

        saveBtn.addEventListener("click", async () => {
            const input = field.querySelector("input, gmpx-place-autocomplete");
            if (!input) return;

            let newValue = "";
            if (input.tagName.toLowerCase() === "gmpx-place-autocomplete") {
                newValue = input.value || originalValue;
            } else {
                newValue = input.value.trim();
            }

            if (newValue === "") {
                alert("Value cannot be empty");
                return;
            }
            const label = field.querySelector("label")?.textContent.trim();
            let payloadKey;
            switch (label) {
                case "First Name": payloadKey = "firstName"; break;
                case "Last Name": payloadKey = "lastName"; break;
                case "Email": payloadKey = "email"; break;
                case "Phone": payloadKey = "phone"; break;
                case "Address": payloadKey = "address"; break;
                case "City": payloadKey = "city"; break;
                default: payloadKey = null;
            }
            if (payloadKey) {
                try {
                    const res = await apiFetch("http://localhost:8082/api/auth/user-details", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ [payloadKey]: newValue })
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`Failed to update: ${errText}`);
                    }
                    const data = await res.json();
                    if(data.token){
                        localStorage.setItem("jwt_token", data.token);
                    }
                    if (data.user && data.user[payloadKey] !== undefined) {
                        newValue = data.user[payloadKey] ?? "";
                    }
                    console.log(`${payloadKey} updated successfully`);
                } catch (err) {
                    console.error(err);
                    return; // Don't update UI if save failed
                }
            }

            originalValue = newValue;
            const newSpan = document.createElement("span");
            newSpan.textContent = newValue;
            styleSpan(newSpan);

            input.replaceWith(newSpan);
            currentSpan = newSpan;

            saveBtn.style.display = "none";
            cancelBtn.style.display = "none";
            editBtn.style.display = "inline-block";
        });

        cancelBtn.addEventListener("click", () => {
            const input = field.querySelector("input, gmpx-place-autocomplete");
            if (!input) return;

            const newSpan = document.createElement("span");
            newSpan.textContent = originalValue;
            styleSpan(newSpan);

            input.replaceWith(newSpan);
            currentSpan = newSpan;

            saveBtn.style.display = "none";
            cancelBtn.style.display = "none";
            editBtn.style.display = "inline-block";
        });
    });
}
