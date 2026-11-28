/* =================================================
   JS Exclusivo - Pantalla 5: Sincronización
   Junta dos fuentes:
   - la base de datos (¿la orden ya tiene firma y fecha de cierre?), que entrega Django
   - la cola del dispositivo (¿queda algo por enviar? ¿algo fue rechazado?)
   Permite sincronizar a mano, ver el progreso y reintentar los envíos rechazados.
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const pad = n => String(n).padStart(2, '0');
    const formatear = d => `${pad(d.getDate())} de ${MESES[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const NOMBRES_TIPO = { evidencia: 'Fotografía', cierre: 'Cierre de faena con firma', solicitud: 'Solicitud de insumo' };

    const tarjeta = document.getElementById('tarjeta-final');
    const enServidor = tarjeta.dataset.cierreRegistrado === '1';
    const orden = FaenaStore.FAENA ? FaenaStore.FAENA.id : null;
    const ultima = FaenaStore.ultima();
    const ultimaDeEstaOrden = ultima && ultima.orden === orden ? ultima : null;

    const $ = id => document.getElementById(id);
    const punto = $('punto-sync'), texto = $('texto-sync'), icono = $('icono-estado'), titulo = $('titulo-final');
    const btnSync = $('btn-sincronizar'), btnReintentar = $('btn-reintentar');
    let huboEnvios = false;

    function pintar() {
        const fechaIso = tarjeta.dataset.fechaCierre || (ultimaDeEstaOrden && ultimaDeEstaOrden.cerrada_en);
        $('fecha-cierre').textContent = fechaIso ? formatear(new Date(fechaIso)) : '—';

        const pendientes = orden ? FaenaStore.pendientesDe(orden) : [];
        const errores = orden ? FaenaStore.erroresDe(orden) : [];
        const id = ultimaDeEstaOrden && ultimaDeEstaOrden.uuid_sync;
        const errorCierre = id ? FaenaStore.errorDe(id) : null;
        const cierrePendiente = id ? FaenaStore.pendiente(id) : false;

        let estado;
        if (errorCierre) estado = 'error';
        else if (cierrePendiente) estado = 'pendiente';
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
            ok: pendientes.length ? 'Cierre registrado. Quedan datos por enviar.' : 'Sincronizado con la Oficina Central',
            pendiente: navigator.onLine
                ? 'Pendiente de enviar a la Oficina Central.'
                : 'Guardado en el dispositivo. Se enviará al recuperar la conexión.',
            error: errorCierre ? 'La oficina rechazó el cierre: ' + errorCierre.mensaje : '',
            'sin-cierre': 'Esta orden todavía no tiene la firma del mandante.'
        })[estado];

        // Lista de lo que sigue en el dispositivo
        const lista = $('lista-pendientes');
        lista.innerHTML = '';
        pendientes.forEach(i => {
            const li = document.createElement('li');
            const extra = i.tipo === 'evidencia' ? ` (${i.payload.tipo === 'antes' ? 'antes' : 'después'}, bloque ${i.payload.bloque})` : '';
            li.textContent = (NOMBRES_TIPO[i.tipo] || i.tipo) + extra;
            lista.appendChild(li);
        });
        $('panel-pendientes').classList.toggle('d-none', pendientes.length === 0);

        // Errores devueltos por el servidor
        const panelErr = $('panel-errores');
        panelErr.innerHTML = '';
        if (errores.length) {
            const t = document.createElement('strong');
            t.textContent = 'Envíos rechazados por la oficina:';
            const ul = document.createElement('ul');
            ul.className = 'mb-0 mt-1';
            errores.forEach(e => {
                const li = document.createElement('li');
                li.textContent = `${NOMBRES_TIPO[e.tipo] || e.tipo}: ${e.mensaje}`;
                ul.appendChild(li);
            });
            panelErr.append(t, ul);
        }
        panelErr.classList.toggle('d-none', errores.length === 0);
        btnReintentar.classList.toggle('d-none', !errores.some(e => e.item));

        btnSync.disabled = !navigator.onLine || pendientes.length === 0;
        btnSync.title = !navigator.onLine ? 'Sin conexión' : (pendientes.length ? '' : 'No hay datos pendientes');
    }

    // Progreso del envío
    window.addEventListener('faena:progreso', (e) => {
        const { hechos, total, fin } = e.detail;
        const caja = $('progreso-sync');
        if (!total) { caja.classList.add('d-none'); return; }
        caja.classList.remove('d-none');
        const pct = Math.round((hechos / total) * 100);
        $('barra-sync').style.width = pct + '%';
        $('texto-progreso').textContent = fin
            ? `Envío terminado: ${hechos} de ${total}.`
            : `Enviando ${Math.min(hechos + 1, total)} de ${total}…`;
        if (hechos > 0) huboEnvios = true;
    });

    // Al terminar, si se envió algo, se recarga para mostrar lo registrado en la BD
    window.addEventListener('faena:sync', () => {
        pintar();
        if (huboEnvios && orden && FaenaStore.pendientesDe(orden).length === 0) {
            huboEnvios = false;
            setTimeout(() => window.location.reload(), 900);
        }
    });

    btnSync.addEventListener('click', () => { btnSync.disabled = true; FaenaStore.sincronizar(); });
    btnReintentar.addEventListener('click', () => { btnReintentar.disabled = true; FaenaStore.reintentarErrores(orden).finally(() => { btnReintentar.disabled = false; }); });

    window.addEventListener('online', pintar);
    window.addEventListener('offline', pintar);
    pintar();
});
