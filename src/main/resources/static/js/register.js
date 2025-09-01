document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();
            document.querySelectorAll(".error-message").forEach(el => el.remove());

            let hasError = false;

            // Fields to validate: key = id, value = label text for error
            const fields = {
                firstName: "Name",
                lastName: "Last Name",
                phone: "Phone Number",
                email: "Email",
                password: "Password"
            };
            const phonePattern = /^\+?[0-9\s\-]{7,15}$/;
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const [id, label] of Object.entries(fields)) {
                const input = document.getElementById(id);
                const value = input.value.trim();
                if (!value) {
                    showError(input, `${label} cannot be empty`);
                    hasError = true;
                    continue;
                }
                if (id === "phone" && !phonePattern.test(value)) {
                    showError(input, "Please enter a valid phone number");
                    hasError = true;
                }

                if (id === "email" && !emailPattern.test(value)) {
                    showError(input, "Please enter a valid email address");
                    hasError = true;
                }
            }
            if (hasError) {
                return; // Stop form submission if there are errors
            }
            const data = {
                firstName: document.getElementById("firstName").value,
                lastName: document.getElementById("lastName").value,
                phone: document.getElementById("phone").value,
                email: document.getElementById("email").value,
                password: document.getElementById("password").value,
            };

            localStorage.setItem("user_registration_data", JSON.stringify(data));

            window.location.href = "/profile-details";
        });
    }
});
function showError(input, message) {
    const error = document.createElement("div");
    error.classList.add("error-message");
    error.textContent = message;
    error.style.color = "red";
    error.style.fontSize = "0.9em";
    error.style.marginTop = "4px";
    input.insertAdjacentElement("afterend", error);
}