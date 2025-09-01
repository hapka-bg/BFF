import {isJwtExpired,refreshToken} from "./auth.js";
(async function () {
    try {
        let token = localStorage.getItem('jwt_token');

        if (!token || isJwtExpired(token)) {
            token = await refreshToken();
        }

        if (!token) {
            window.location.href = 'index.html';
        }
        if (window.location.pathname.endsWith('admin.html')) {
            const role = localStorage.getItem('user_role');
            if (!role || role.toLowerCase() !== 'admin') {
                window.location.href = 'index.html';
            }
        }
    } catch {
        window.location.href = 'index.html';
    }
})();