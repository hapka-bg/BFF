document.addEventListener("DOMContentLoaded", () => {
    const detailsForm = document.getElementById("details-form");

    const streetInput = document.getElementById("street");
    const cityInput = document.getElementById("city");
    const streetError = document.getElementById("street-error");
    const cityError = document.getElementById("city-error");
    const captchaError = document.getElementById("captcha-error");

    if (detailsForm) {
        detailsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            streetError.textContent = "";
            cityError.textContent = "";
            captchaError.textContent = "";
            // Turnstile
            const tokenInput = document.querySelector("input[name='cf-turnstile-response']");
            const turnstileToken = tokenInput?.value;
            let hasError=false;
            if (!turnstileToken) {
                captchaError.textContent = "Please complete the CAPTCHA.";
                hasError = true;
            }
            if (!streetInput.value.trim()) {
                streetError.textContent = "Street address cannot be empty";
                hasError = true;
            }
            if (!cityInput.value.trim()) {
                cityError.textContent = "City cannot be empty";
                hasError = true;
            }
            if (hasError) return;
            // Get initial registration data from localStorage
            const initialData = JSON.parse(localStorage.getItem("user_registration_data") || "{}");

            if (!initialData.email || !initialData.password) {
                window.location.href = "/register";
                return;
            }

            const fullData = {
                ...initialData,
                street: streetInput.value.trim(),
                city: cityInput.value.trim(),
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
                    captchaError.textContent = error.message || "Registration failed";
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
                captchaError.textContent = "Error completing registration. Please try again.";
                window.turnstile.reset();
            }
        });
    }
});
