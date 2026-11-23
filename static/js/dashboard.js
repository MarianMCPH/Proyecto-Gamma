document.addEventListener('DOMContentLoaded', function () {
    // 1. Buscador rápido en tiempo real para la tabla de obras
    const inputBuscador = document.getElementById('buscador');
    if (inputBuscador) {
        inputBuscador.addEventListener('keyup', function () {
            let texto = this.value.toLowerCase();
            document.querySelectorAll('#tablaObras tr').forEach(fila => {
                fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
            });
        });
    }

    // 2. Marcar / desmarcar todos los checkboxes de la tabla
    const checkTodos = document.getElementById('checkTodos');
    if (checkTodos) {
        checkTodos.addEventListener('change', function () {
            document.querySelectorAll('.check-fila').forEach(cb => {
                cb.checked = this.checked;
            });
        });
    }
});