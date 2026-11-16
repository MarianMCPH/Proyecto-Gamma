/* =================================================
   JS Exclusivo - Pantalla 5: Confirmación y Sincronización
   Junta dos fuentes:
   - la base de datos (¿la orden ya tiene firma y fecha de cierre?), que entrega Django
   - la cola del dispositivo (¿queda algo por enviar? ¿algo fue rechazado?)
   y se actualiza sola cuando termina un envío o vuelve la conexión.
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const pad = n => String(n).padStart(2, '0');
    const formatear = d => `${pad(d.getDate())} de ${MESES[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const tarjeta = document.getElementById('tarjeta-final');
    const enServidor = tarjeta.dataset.cierreRegistrado === '1';
    const orden = FaenaStore.FAENA ? FaenaStore.FAENA.id : null;
    const ultima = FaenaStore.ultima();
    const ultimaDeEstaOrden = ultima && ultima.orden === orden ? ultima : null;

    const punto = document.getElementById('punto-sync');
    const texto = document.getElementById('texto-sync');
    const icono = document.getElementById('icono-estado');
    const titulo = document.getElementById('titulo-final');
    const fechaEl = document.getElementById('fecha-cierre');

    function pintar() {
        const fechaIso = tarjeta.dataset.fechaCierre || (ultimaDeEstaOrden && ultimaDeEstaOrden.cerrada_en);
        fechaEl.textContent = fechaIso ? formatear(new Date(fechaIso)) : '—';

        const id = ultimaDeEstaOrden && ultimaDeEstaOrden.uuid_sync;
        const error = id ? FaenaStore.errorDe(id) : null;
        const pendiente = id ? FaenaStore.pendiente(id) : false;

        let estado;
        if (error) estado = 'error';
        else if (pendiente) estado = 'pendiente';
        else if (enServidor || id) estado = 'ok';      // id sin pendiente ni error = ya lo aceptó el servidor
        else estado = 'sin-cierre';

        icono.className = 'bi icono-check ' + ({ ok: 'bi-check-lg', pendiente: 'bi-check-lg pendiente', error: 'bi-x-lg error', 'sin-cierre': 'bi-hourglass-split neutro' })[estado];
        punto.className = 'punto ' + ({ ok: 'punto-verde', pendiente: 'punto-ambar', error: 'punto-rojo', 'sin-cierre': 'punto-gris' })[estado];
        titulo.textContent = ({
            ok: '¡Servicio Finalizado con Éxito!',
            pendiente: '¡Servicio Finalizado con Éxito!',
            error: 'No se pudo registrar el cierre',
            'sin-cierre': 'Faena sin cierre registrado'
        })[estado];
        texto.textContent = ({
            ok: 'Sincronizado con la Oficina Central',
            pendiente: navigator.onLine
                ? 'Sincronizando con la Oficina Central…'
                : 'Guardado en el dispositivo. Se enviará al recuperar la conexión.',
            error: error ? 'La oficina rechazó el envío: ' + error.mensaje : '',
            'sin-cierre': 'Esta orden todavía no tiene la firma del mandante.'
        })[estado];
    }

    window.addEventListener('faena:sync', pintar);
    window.addEventListener('online', pintar);
    window.addEventListener('offline', pintar);
    pintar();
});
