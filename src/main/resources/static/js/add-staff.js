// add-staff.js
import { apiFetch } from "./jwtFetch.js";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");

    const form = document.getElementById("add-staff-form");
    const roleSelect = document.getElementById("role");
    const salaryGroup = document.getElementById("salary-group");
    const snackbar = document.getElementById("snackbar");

    // --- EDIT MODE: Fetch and populate ---
    if (userId) {
        document.querySelector(".save-btn").textContent = "Update Staff";

        apiFetch(`http://localhost:8082/api/v1/staff/user/${userId}`)
            .then(res => {
                if (!res.ok) throw new Error("User not found");
                return res.json();
            })
            .then(data => {
                const roleValue = (data.role || "admin").trim().toLowerCase();

                document.getElementById("firstName").value = data.firstName || "";
                document.getElementById("lastName").value = data.lastName || "";
                document.getElementById("email").value = data.email || "";
                document.getElementById("phone").value = data.phone || "";
                document.getElementById("role").value = roleValue;
                document.getElementById("salary").value = data.salary ?? "";

                if (["waiter", "bartender", "chef"].includes(roleValue)) {
                    salaryGroup.style.display = "block";
                }
                else {
                    salaryGroup.style.display = "none";
                }
            })
            .catch(err => console.error(err));
    }

    // --- Role change toggle for salary field ---
    roleSelect.addEventListener("change", () => {
        const role = roleSelect.value.toLowerCase();
        salaryGroup.style.display = ["waiter", "bartender", "chef"].includes(role)
            ? "block"
            : "none";
    });


    // --- Form submit handler ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const staffData = {
            firstName: document.getElementById("firstName").value.trim(),
            lastName: document.getElementById("lastName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            role: document.getElementById("role").value.toLowerCase(),
            salary: document.getElementById("salary").value || null
        };

        try {
            const url = userId
                ? `http://localhost:8082/api/v1/staff/update/${userId}`
                : `http://localhost:8082/api/v1/staff/add`;

            const method = userId ? "PUT" : "POST";

            const res = await apiFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(staffData)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to save staff: ${res.status} ${errText}`);
            }

            snackbar.textContent = userId
                ? "Staff member updated successfully!"
                : "Staff member added successfully!";
            snackbar.classList.add("show");

            setTimeout(() => {
                snackbar.classList.remove("show");
                window.location.href = "/admin.html";
            }, 2000);

        } catch (err) {
            console.error(err);
            snackbar.textContent = "Error saving staff. Please try again.";
            snackbar.classList.add("show");
            setTimeout(() => snackbar.classList.remove("show"), 3000);
        }
    });
});
