/* =================================================
   JS Específico - Pantalla 2: Consumo de Insumos
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const contenedorInsumos = document.getElementById('contenedor-insumos');
    const btnAgregarMaterial = document.getElementById('btn-agregar-material');

    if (btnAgregarMaterial && contenedorInsumos) {
        // Clonar tarjeta al presionar "+ Agregar Material"
        btnAgregarMaterial.addEventListener('click', () => {
            const primeraTarjeta = contenedorInsumos.querySelector('.card-insumo');
            if (primeraTarjeta) {
                const nuevaTarjeta = primeraTarjeta.cloneNode(true);
                
                // Reiniciar los selects de la nueva tarjeta clonada
                nuevaTarjeta.querySelectorAll('select').forEach(select => {
                    select.selectedIndex = 0;
                });

                contenedorInsumos.appendChild(nuevaTarjeta);
            }
        });

        // Eliminar tarjeta al presionar el icono de basurero
        contenedorInsumos.addEventListener('click', (e) => {
            const btnEliminar = e.target.closest('.btn-eliminar-insumo');
            if (btnEliminar) {
                const tarjetas = contenedorInsumos.querySelectorAll('.card-insumo');
                if (tarjetas.length > 1) {
                    btnEliminar.closest('.card-insumo').remove();
                } else {
                    alert('Debe mantener al menos un registro de material.');
                }
            }
        });
    }
});