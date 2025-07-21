// we use fetch again but first we simply check if the token is expired or not
async function refreshToken() {
    try {
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',  // send cookies (refresh token stored in httpOnly cookie)
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'), // current (expired) JWT
            },
        });

        if (!refreshResponse.ok) throw new Error('Failed to refresh token');

        const data = await refreshResponse.json();
        // Update JWT in localStorage
        localStorage.setItem('jwt_token', data.accessToken);
        return data.accessToken;

    } catch (error) {
        console.error('Refresh token error:', error);
        localStorage.removeItem('jwt_token'); // clear invalid token
        // Optionally redirect to login page:
        // window.location.href = '/login';
        throw error;
    }
}
function isJwtExpired(token) {
    if (!token) return true;

    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;

    try {
        const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        // Consider expired if less than 60 seconds left to expire (to avoid edge issues)
        return payload.exp < now + 60;
    } catch (e) {
        return true;
    }
}
export async function apiFetch(input, init = {}) {
    let token = localStorage.getItem('jwt_token');

    if (isJwtExpired(token)) {
        token = await refreshToken();  // refresh token or throw error
    }

    init.headers = init.headers || {};
    init.headers['Authorization'] = 'Bearer ' + token;
    init.credentials = 'include'; // to send cookies if needed

    const response = await fetch(input, init);

    // Optional: if backend returns 401 Unauthorized, try refresh once more
    if (response.status === 401) {
        token = await refreshToken();
        init.headers['Authorization'] = 'Bearer ' + token;
        return await fetch(input, init);
    }

    return response;
}
