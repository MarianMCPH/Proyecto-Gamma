/* =================================================
   JS Exclusivo - Pantalla 2: Consumo de Insumos (Validación Visual)
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const contenedorInsumos = document.getElementById('contenedor-insumos');
    const btnAgregarMaterial = document.getElementById('btn-agregar-material');

    if (btnAgregarMaterial && contenedorInsumos) {
        btnAgregarMaterial.addEventListener('click', () => {
            const primeraTarjeta = contenedorInsumos.querySelector('.card-insumo');
            if (primeraTarjeta) {
                const nuevaTarjeta = primeraTarjeta.cloneNode(true);
                nuevaTarjeta.querySelectorAll('select').forEach(select => {
                    select.selectedIndex = 0;
                    select.style.borderColor = '#D1D5DB';
                });
                contenedorInsumos.appendChild(nuevaTarjeta);
            }
        });

        contenedorInsumos.addEventListener('click', (e) => {
            const btnEliminar = e.target.closest('.btn-eliminar-insumo');
            if (btnEliminar) {
                const tarjetas = contenedorInsumos.querySelectorAll('.card-insumo');
                if (tarjetas.length > 1) {
                    btnEliminar.closest('.card-insumo').remove();
                }
            }
        });
    }

    const botonesNavegacion = document.querySelectorAll('a.btn');
    botonesNavegacion.forEach(btn => {
        if (btn.textContent.includes('Siguiente') || btn.textContent.includes('Evidencia')) {
            btn.addEventListener('click', (e) => {
                const selects = document.querySelectorAll('#contenedor-insumos select');
                let formValido = true;

                selects.forEach(select => {
                    if (!select.value || select.value === "") {
                        formValido = false;
                        select.style.borderColor = '#EF4444'; // Resalta en rojo
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
});