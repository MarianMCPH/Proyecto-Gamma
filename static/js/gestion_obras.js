document.addEventListener('DOMContentLoaded', function () {
    const botonesFiltro = document.querySelectorAll('#filtrosEstado .filtro-btn');
    const filas = document.querySelectorAll('#tablaGestiónObras tr.fila-obra');
    const inputBuscador = document.getElementById('buscadorObras');
    let categoriaActiva = 'todas';

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