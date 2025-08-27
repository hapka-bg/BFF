// add-staff.js
import {apiFetch} from "./jwtFetch.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("add-staff-form");
    const roleSelect = document.getElementById("role");
    const salaryGroup = document.getElementById("salary-group");
    const snackbar = document.getElementById("snackbar");

    roleSelect.addEventListener("change", () => {
        const role = roleSelect.value;
        if (["waiter", "bartender", "chef"].includes(role)) {
            salaryGroup.style.display = "block";
        } else {
            salaryGroup.style.display = "none";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newUser = {
            firstName: document.getElementById("firstName").value,
            lastName: document.getElementById("lastName").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            role: document.getElementById("role").value,
            salary: document.getElementById("salary").value || null
        };
        try {
            const res=await apiFetch("http://localhost:8082/api/v1/staff/add",{
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser)
            });
            if(!res.ok){
                const errText=await res.text();
                throw new Error(`Failed to add staff: ${res.status} ${errText}`);
            }
            snackbar.textContent = "Staff member added successfully!";
            snackbar.classList.add("show");

            setTimeout(() => {
                snackbar.classList.remove("show");
                window.location.href = "/admin.html";
            }, 2000);

        }catch (err) {
            console.error(err);
            snackbar.textContent = "Error adding staff. Please try again.";
            snackbar.classList.add("show");
            setTimeout(() => snackbar.classList.remove("show"), 3000);
        }


    });
});
