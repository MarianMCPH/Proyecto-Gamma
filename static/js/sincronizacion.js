/* =================================================
   JS Exclusivo - Pantalla 5: Confirmación y Sincronización
   Muestra el cierre de la faena y envía lo pendiente a la oficina central.
   Si no hay red, queda en cola y esta pantalla se actualiza sola al volver la conexión.
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const ultima = FaenaStore.ultima();
    const pad = n => String(n).padStart(2, '0');

    // Fecha de cierre: "09 de Octubre, 17:20"
    const fechaEl = document.getElementById('fecha-cierre');
    if (ultima) {
        const d = new Date(ultima.cerrada_en);
        fechaEl.textContent = `${pad(d.getDate())} de ${MESES[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
        fechaEl.textContent = '—';
    }

    const punto = document.getElementById('punto-sync');
    const texto = document.getElementById('texto-sync');
    const icono = document.getElementById('icono-estado');

    function pintar() {
        const quedan = FaenaStore.cola().length;
        const pendiente = ultima ? FaenaStore.pendiente(ultima.uuid_sync) : quedan > 0;
        punto.className = 'punto ' + (pendiente ? 'punto-ambar' : 'punto-verde');
        icono.classList.toggle('pendiente', pendiente);
        if (pendiente) {
            texto.textContent = navigator.onLine
                ? 'Sincronizando con la Oficina Central…'
                : 'Guardado en el dispositivo. Se enviará al recuperar la conexión.';
        } else {
            texto.textContent = 'Sincronizado con la Oficina Central';
        }
    }

    window.addEventListener('faena:sync', pintar);
    window.addEventListener('online', pintar);
    window.addEventListener('offline', pintar);
    pintar();
    FaenaStore.sincronizar();     // intenta enviar de inmediato si hay red
});
