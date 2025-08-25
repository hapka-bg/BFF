function logout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(() => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/login'; // or update UI
        })
        .catch(err => {
            console.error('Logout failed:', err);
            localStorage.removeItem('jwt_token');
            window.location.href = '/login';
        });
}