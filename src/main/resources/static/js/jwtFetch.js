// we use fetch again but first we simply check if the token is expired or not
import { isJwtExpired, refreshToken } from './auth.js';
export async function apiFetch(input, init = {}) {
    let token = localStorage.getItem('jwt_token');

    if (isJwtExpired(token)) {
        token = await refreshToken();
    }

    init.headers = init.headers || {};
    init.headers['Authorization'] = 'Bearer ' + token;
    init.credentials = 'include'; // to send cookies if needed

    let response = await fetch(input, init);

    // Optional: if backend returns 401 Unauthorized, try refresh once more
    if (response.status === 401) {
        try{
            token = await refreshToken();
            init.headers['Authorization'] = 'Bearer ' + token;
            response = await fetch(input, init);
        }catch(e){
            window.location.href = 'index.html';
        }
    }

    return response;
}
