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
                b.style.backgroundColor = '';
                if (!b.classList.contains('btn-outline-danger')) {
                    b.classList.add('btn-outline-secondary');
                }
            });

            this.classList.add('active', 'text-white');
            if (this.classList.contains('btn-outline-danger')) {
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

    function aplicarFiltros() {
        const textoBusqueda = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';

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
            fila.style.display = (coincideCategoria && coincideTexto) ? '' : 'none';
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

    // 4. Botón individual "Desactivar obra" en la columna Acciones
    document.querySelectorAll('.btn-desactivar-obra').forEach(btn => {
        btn.addEventListener('click', function () {
            const obraId = this.getAttribute('data-id');

            if (!confirm('¿Estás segura o seguro de desactivar esta orden?')) {
                return;
            }

            fetch("/obras/gestion/ocultar/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({ ids: [obraId] })
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    location.reload();
                } else {
                    alert(data.error || 'Ocurrió un problema al desactivar la orden.');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Error de conexión al intentar desactivar la orden.');
            });
        });
    });
});