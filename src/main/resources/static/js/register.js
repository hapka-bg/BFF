document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

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
