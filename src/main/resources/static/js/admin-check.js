(function (){
    const role=localStorage.getItem('user_role');
    console.log(role);
    if (!role || role.toLowerCase() !== 'admin') {
        window.location.href = 'index.html';
    }

})