document.addEventListener("DOMContentLoaded", () => {

    const detailsForm = document.getElementById("details-form");

    if (detailsForm) {
        detailsForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Turnstile
            const tokenInput = document.querySelector("input[name='cf-turnstile-response']");
            const turnstileToken = tokenInput?.value;
            if (!turnstileToken) {
                alert("Please complete the CAPTCHA.");
                return;
            }

            // Get initial registration data from localStorage
            const initialData = JSON.parse(localStorage.getItem("user_registration_data") || "{}");

            if (!initialData.email || !initialData.password) {
                alert("Missing registration data. Please register again.");
                window.location.href = "/register";
                return;
            }

            const fullData = {
                ...initialData,
                street: document.getElementById("street").value,
                city: document.getElementById("city").value,
                turnstileToken: turnstileToken,
            };


            try {
                const response = await fetch("http://localhost:8082/api/auth/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(fullData),
                    credentials: "include",
                });

                if (!response.ok) {
                    const error = await response.json();
                    alert("Registration failed: " + (error.message || response.statusText));
                    return;
                }

                const data = await response.json();
                if (data.accessToken) {// Store final JWT
                    localStorage.setItem("jwt_token", data.accessToken);
                }
                if (data.role) {
                    localStorage.setItem("user_role", data.role);
                }
                localStorage.removeItem("user_registration_data"); // Clean up

                window.location.href = "home.html";

            } catch (err) {
                alert("Error completing registration: " + err.message);
                window.turnstile.reset();
            }
        });
    }
});
