document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('pwaLoginForm');
    const submitBtn = document.getElementById('btnLoginSubmit');

    if (loginForm && submitBtn) {
        loginForm.addEventListener('submit', () => {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';
        });
    }
});