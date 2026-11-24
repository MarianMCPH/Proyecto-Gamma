document.addEventListener('DOMContentLoaded', () => {
    const inputBuscar = document.getElementById('buscarObraCancelada');
    const selectRazon = document.getElementById('filtroRazon');
    const btnExportar = document.getElementById('btnExportarCanceladas');
    const filas = document.querySelectorAll('#tablaObrasCanceladas tbody tr.fila-obra');
    const contador = document.getElementById('contadorRegistros');

    function filtrarTabla() {
        const texto = (inputBuscar?.value || '').toLowerCase().trim();
        const razon = (selectRazon?.value || '').toLowerCase().trim();
        let visibles = 0;

        filas.forEach(fila => {
            const contenido = fila.textContent.toLowerCase();
            const razonFila = (fila.dataset.razon || '').toLowerCase();
            const coincideTexto = !texto || contenido.includes(texto);
            const coincideRazon = !razon || razonFila.includes(razon);
            const mostrar = coincideTexto && coincideRazon;

            fila.style.display = mostrar ? '' : 'none';
            if (mostrar) visibles++;
        });

        if (contador) {
            const inicio = visibles > 0 ? 1 : 0;
            contador.textContent = `Mostrando ${inicio} - ${visibles} de ${visibles} registros`;
        }
    }

    inputBuscar?.addEventListener('input', filtrarTabla);
    selectRazon?.addEventListener('change', filtrarTabla);

    document.querySelectorAll('.btn-toggle-detalle').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                target.classList.toggle('d-none');
                const icon = btn.querySelector('i');
                icon?.classList.toggle('bi-chevron-down');
                icon?.classList.toggle('bi-chevron-up');
            }
        });
    });

    document.querySelectorAll('.form-restaurar').forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!confirm('¿Confirmas devolver al inventario los materiales asignados a esta obra cancelada?')) {
                e.preventDefault();
            }
        });
    });

    btnExportar?.addEventListener('click', () => {
        let csv = [];
        document.querySelectorAll('#tablaObrasCanceladas tr:not(.fila-detalle)').forEach(row => {
            if (row.style.display === 'none') return;
            const cols = Array.from(row.querySelectorAll('th, td')).slice(0, 5);
            csv.push(cols.map(c => `"${c.innerText.replace(/\s+/g, ' ').trim()}"`).join(','));
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'obras_canceladas_fyag.csv';
        link.click();
    });
});