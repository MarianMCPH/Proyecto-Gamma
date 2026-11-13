/* =================================================
   JS Exclusivo - Pantalla 1: Formulario Técnico (Validación Visual)
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('observaciones_tecnicas');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    const botonesNavegacion = document.querySelectorAll('a.btn');
    botonesNavegacion.forEach(btn => {
        if (btn.textContent.includes('Siguiente') || btn.textContent.includes('Consumo')) {
            btn.addEventListener('click', (e) => {
                const selects = document.querySelectorAll('.checklist-container select');
                let formValido = true;

                selects.forEach(select => {
                    if (!select.value || select.value === "") {
                        formValido = false;
                        select.style.borderColor = '#EF4444'; // Resalta en rojo el cuadro vacío
                    } else {
                        select.style.borderColor = '#D1D5DB';
                    }
                });

                if (!formValido) {
                    e.preventDefault(); // Bloquea el avance visualmente sin mostrar alertas
                }
            });
        }
    });
});