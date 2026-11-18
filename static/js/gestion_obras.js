document.addEventListener('DOMContentLoaded', function () {
    const botonesFiltro = document.querySelectorAll('#filtrosEstado .filtro-btn');
    const filas = document.querySelectorAll('#tablaGestiónObras tr.fila-obra');
    const inputBuscador = document.getElementById('buscadorObras');
    let categoriaActiva = 'todas';

    // 1. Filtrado por botones superiores
    botonesFiltro.forEach(btn => {
        btn.addEventListener('click', function () {
            botonesFiltro.forEach(b => {
                b.classList.remove('active', 'text-white');
                if(!b.classList.contains('btn-outline-danger')) {
                    b.classList.add('btn-outline-secondary');
                }
            });

            this.classList.add('active', 'text-white');
            if(this.classList.contains('btn-outline-danger')) {
                this.style.backgroundColor = '#dc3545';
            } else {
                this.style.backgroundColor = '#3f4268';
                this.classList.remove('btn-outline-secondary');
            }

            categoriaActiva = this.getAttribute('data-filter');
            aplicarFiltros();
        });
    });

    // 2. Búsqueda rápida
    if (inputBuscador) {
        inputBuscador.addEventListener('input', function () {
            aplicarFiltros();
        });
    }

    // Función unificada para filtrar por categoría y texto de búsqueda
    function aplicarFiltros() {
        const textoBusqueda = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
        let visibles = 0;

        filas.forEach(fila => {
            const categoria = fila.getAttribute('data-categoria');
            const esEmergencia = fila.getAttribute('data-emergencia') === 'true';
            const textoFila = fila.textContent.toLowerCase();

            let coincideCategoria = false;
            if (categoriaActiva === 'todas') {
                coincideCategoria = true;
            } else if (categoriaActiva === 'emergencias') {
                coincideCategoria = esEmergencia;
            } else {
                coincideCategoria = (categoria === categoriaActiva);
            }

            const coincideTexto = textoFila.includes(textoBusqueda);

            if (coincideCategoria && coincideTexto) {
                fila.style.display = '';
                visibles++;
            } else {
                fila.style.display = 'none';
            }
        });
    }

    // 3. Seleccionar todos los checkboxes de la tabla
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function () {
            document.querySelectorAll('.check-fila').forEach(cb => {
                if (cb.closest('tr').style.display !== 'none') {
                    cb.checked = selectAll.checked;
                }
            });
        });
    }
});
document.addEventListener('DOMContentLoaded', function () {
    // 1. Seleccionar todos los checkboxes de la tabla
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function () {
            document.querySelectorAll('.check-fila').forEach(cb => {
                if (cb.closest('tr').style.display !== 'none') {
                    cb.checked = selectAll.checked;
                }
            });
        });
    }

    // 2. Lógica del botón Desactivar con mensaje de confirmación
    const btnDesactivar = document.getElementById('btnDesactivarObras');
    if (btnDesactivar) {
        btnDesactivar.addEventListener('click', function () {
            const seleccionadas = Array.from(document.querySelectorAll('.check-fila:checked')).map(cb => cb.value);
            
            if (seleccionadas.length === 0) {
                alert('Por favor, seleccione al menos una orden para desactivar.');
                return;
            }

            // Mensaje de confirmación personalizado
            const mensaje = seleccionadas.length === 1 
                ? '¿Estás segura o seguro de desactivar esta orden?' 
                : `¿Estás segura o seguro de desactivar las ${seleccionadas.length} órdenes seleccionadas?`;

            if (!confirm(mensaje)) {
                return; // Si cancela, no hace nada
            }

            // Petición al backend para ocultarlas de la pantalla
            fetch("/obras/gestion/ocultar/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({ ids: seleccionadas })
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    location.reload();
                } else {
                    alert(data.error || 'Ocurrió un problema al desactivar.');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Error de conexión al intentar desactivar.');
            });
        });
    }
});