document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Clear local data first so the UI is instantly "logged out"
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_role');

                // Tell backend to invalidate refresh token + clear cookie
                await fetch('http://localhost:8082/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                console.error('Logout failed:', err);
            } finally {
                // Always redirect to login page
                window.location.href = 'index.html';
            }
        });
    }
});
