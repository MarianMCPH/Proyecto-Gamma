/* =================================================
   Almacén local + cola de sincronización (PWA Terreno FYAG)
   Usado por: solicitudes, evidencias, firma y sincronización final.
   - Guarda el avance de la faena en este dispositivo (localStorage).
   - Cada envío al servidor pasa por una cola: si no hay red, espera y se
     reintenta solo cuando vuelve la conexión.
   - Cada elemento lleva un uuid_sync: si el servidor lo recibe dos veces,
     no lo duplica (ver apps/pwa/views.py).
   ================================================= */
(function () {
    const K_BORRADOR = 'fyag_faena_actual';
    const K_COLA = 'fyag_cola_sync';
    const K_ULTIMA = 'fyag_ultima_faena';
    const K_ERRORES = 'fyag_errores_sync';

    // Datos de la orden actual: los entrega Django con {{ faena|json_script:"datos-faena" }}
    function leerFaena() {
        const el = document.getElementById('datos-faena');
        if (!el) return null;
        try { return JSON.parse(el.textContent); } catch (e) { return null; }
    }
    const FAENA = leerFaena();

    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();   // solo en HTTPS/localhost
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function leer(clave, porDefecto) {
        try { const v = JSON.parse(localStorage.getItem(clave)); return v === null ? porDefecto : v; }
        catch (e) { return porDefecto; }
    }
    function guardar(clave, valor) {
        try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
        catch (e) { return false; }            // almacenamiento lleno o bloqueado
    }

    /* ---------- Borrador de la faena en curso (uno por orden) ---------- */
    function borrador() {
        const d = leer(K_BORRADOR, null);
        if (FAENA && d && d.orden === FAENA.id) return d;
        return { orden: FAENA ? FAENA.id : null, uuid_sync: uuid(), evidencias: [], receptor: {} };
    }
    function guardarBorrador(d) { return guardar(K_BORRADOR, d); }
    function limpiarBorrador() { try { localStorage.removeItem(K_BORRADOR); } catch (e) { /* nada */ } }

    /* ---------- Fotos: se reducen antes de guardarlas (menos peso, menos datos móviles) ---------- */
    function comprimirImagen(archivo, maxLado = 1280, calidad = 0.7) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
            lector.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Archivo de imagen inválido'));
                img.onload = () => {
                    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * escala);
                    c.height = Math.round(img.height * escala);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    const dataUrl = c.toDataURL('image/jpeg', calidad);
                    resolve({ dataUrl, pesoKb: Math.round(dataUrl.length * 0.75 / 1024), fecha: new Date().toISOString() });
                };
                img.src = lector.result;
            };
            lector.readAsDataURL(archivo);
        });
    }

    /* ---------- Cola de sincronización ---------- */
    function cola() { return leer(K_COLA, []); }

    // Agrega varios envíos de una vez (todo o nada). Cada uno: {tipo, url, uuid_sync, payload}
    function encolarVarios(items) {
        const c = cola();
        const nuevos = items.map(i => ({ creado: new Date().toISOString(), ...i, uuid_sync: i.uuid_sync || uuid() }));
        return guardar(K_COLA, c.concat(nuevos)) ? nuevos : null;
    }
    function encolar(tipo, url, payload, id) {
        const r = encolarVarios([{ tipo, url, payload, uuid_sync: id }]);
        return r ? r[0] : null;
    }
    function pendiente(id) { return cola().some(i => i.uuid_sync === id); }
    function quitar(id) { guardar(K_COLA, cola().filter(i => i.uuid_sync !== id)); }

    function errores() { return leer(K_ERRORES, []); }
    function errorDe(id) { return errores().find(e => e.uuid_sync === id) || null; }
    function registrarError(item, mensaje) {
        const lista = errores().filter(e => e.uuid_sync !== item.uuid_sync);
        lista.push({ uuid_sync: item.uuid_sync, tipo: item.tipo, orden: item.payload && item.payload.orden, mensaje, fecha: new Date().toISOString() });
        guardar(K_ERRORES, lista.slice(-20));
    }

    function limpiarErrores(ids) {
        guardar(K_ERRORES, errores().filter(e => !ids.includes(e.uuid_sync)));
    }

    function csrfToken() {
        const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    // Respuesta: 'ok' (se quita de la cola), 'rechazado' (error de datos: se quita y se informa)
    // o 'reintentar' (sin red o error del servidor: se queda en la cola)
    async function enviarAlServidor(item) {
        let resp;
        try {
            resp = await fetch(item.url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
                body: JSON.stringify({ uuid_sync: item.uuid_sync, ...item.payload })
            });
        } catch (e) {
            return { estado: 'reintentar' };
        }
        let datos = {};
        try { datos = await resp.json(); } catch (e) { /* respuesta sin JSON */ }
        if (resp.ok && datos.ok) return { estado: 'ok', datos };
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 403 && resp.status !== 408 && resp.status !== 429) {
            return { estado: 'rechazado', mensaje: datos.error || ('Error ' + resp.status) };
        }
        return { estado: 'reintentar' };     // 403 (CSRF/sesión), 5xx: se intenta más tarde
    }

    let enCurso = null;
    function sincronizar() {
        if (!navigator.onLine) return Promise.resolve(0);
        if (enCurso) return enCurso.then(() => sincronizar());   // incluye lo encolado mientras tanto
        enCurso = (async () => {
            let enviados = 0;
            let item;
            while ((item = cola()[0])) {
                const r = await enviarAlServidor(item);
                if (r.estado === 'reintentar') break;            // se respeta el orden: evidencias antes del cierre
                quitar(item.uuid_sync);
                if (r.estado === 'rechazado') registrarError(item, r.mensaje);
                else enviados++;
            }
            window.dispatchEvent(new CustomEvent('faena:sync', { detail: { enviados, pendientes: cola().length } }));
            return enviados;
        })();
        const actual = enCurso;
        enCurso.finally(() => { if (enCurso === actual) enCurso = null; });
        return actual;
    }

    /* ---------- Última faena cerrada (para la pantalla final) ---------- */
    function guardarUltima(d) { return guardar(K_ULTIMA, d); }
    function ultima() { return leer(K_ULTIMA, null); }

    /* ---------- Indicador En línea / Sin conexión de la barra superior ---------- */
    function pintarRed() {
        const b = document.getElementById('suppliesConnectionStatus');
        if (!b) return;
        const on = navigator.onLine;
        b.className = 'online-status badge ' + (on ? 'bg-success text-white' : 'bg-warning text-dark');
        b.innerHTML = '<span aria-hidden="true">●</span> ' + (on ? 'En línea' : 'Sin conexión');
    }
    window.addEventListener('online', () => { pintarRed(); sincronizar(); });
    window.addEventListener('offline', pintarRed);
    document.addEventListener('DOMContentLoaded', () => { pintarRed(); sincronizar(); });

    window.FaenaStore = {
        FAENA, uuid, borrador, guardarBorrador, limpiarBorrador, comprimirImagen,
        cola, encolar, encolarVarios, pendiente, sincronizar, errores, errorDe, limpiarErrores,
        guardarUltima, ultima
    };
})();
