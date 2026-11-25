document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('observaciones_tecnicas');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    const formPaso1 = document.getElementById('form-paso1');
    if (formPaso1) {
        formPaso1.addEventListener('submit', (e) => {
            const selects = formPaso1.querySelectorAll('.checklist-container select');
            let formValido = true;

            selects.forEach(select => {
                if (!select.value || select.value === "") {
                    formValido = false;
                    select.style.borderColor = '#EF4444';
                } else {
                    select.style.borderColor = '#D1D5DB';
                }
            });

            if (!formValido) {
                e.preventDefault();
            }
        });
    }
});