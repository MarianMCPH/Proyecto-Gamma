document.addEventListener('DOMContentLoaded', () => {
    const inputBuscar = document.getElementById('buscarObraCancelada');
    const selectRazon = document.getElementById('filtroRazon');
    const filas = Array.from(document.querySelectorAll('#tablaObrasCanceladas tbody tr.fila-obra'));
    const filaSinResultados = document.getElementById('filaSinResultadosFiltro');
    const contador = document.getElementById('contadorRegistros');
    const totalPaginaInicial = Number(contador?.dataset.totalPagina || filas.length);

    function normalizar(str) {
        return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
    }

    function filtrarTabla() {
        if (!filas.length) return;

        const texto = normalizar(inputBuscar?.value);
        const razon = normalizar(selectRazon?.value);
        let visibles = 0;

        filas.forEach((fila) => {
            const celdasTexto = Array.from(fila.querySelectorAll('td'))
                .slice(0, 5)
                .map((td) => normalizar(td.textContent))
                .join(' ');
            const razonFila = normalizar(fila.dataset.razon);

            const coincideTexto = !texto || celdasTexto.includes(texto);
            const coincideRazon = !razon || razonFila === razon;
            const mostrar = coincideTexto && coincideRazon;

            fila.classList.toggle('d-none', !mostrar);
            if (mostrar) visibles++;
        });

        if (filaSinResultados) {
            filaSinResultados.classList.toggle('d-none', visibles > 0);
        }

        if (contador) {
            const inicio = visibles > 0 ? 1 : 0;
            const totalMostrar = (texto || razon) ? visibles : totalPaginaInicial;
            contador.textContent = `Mostrando ${inicio} - ${visibles} de ${totalMostrar} registros`;
        }
    }

    inputBuscar?.addEventListener('input', filtrarTabla);
    selectRazon?.addEventListener('change', filtrarTabla);

    document.querySelectorAll('.btn-devolver-material').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const cant = btn.dataset.cantidad || '';
            const msg = cant
                ? `¿Confirmas devolver ${cant} unidad(es) de este material al inventario?`
                : '¿Confirmas devolver este material al inventario?';
            if (!window.confirm(msg)) {
                e.preventDefault();
            }
        });
    });

    const btnConfirmarCancelada = document.getElementById('btnConfirmarObraCancelada');
    btnConfirmarCancelada?.addEventListener('click', (e) => {
        if (!window.confirm('¿Confirmas marcar esta obra como cancelada?')) {
            e.preventDefault();
        }
    });
});