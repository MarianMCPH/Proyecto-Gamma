/* =================================================
   Almacén local + cola de sincronización (PWA Terreno FYAG)
   Usado por: solicitudes, evidencias, firma y sincronización final.
   - Guarda el avance de la faena en este dispositivo (localStorage).
   - Si no hay red, las acciones quedan en una cola y se envían al volver la conexión.
   - Cada elemento lleva un uuid_sync para que el servidor no lo duplique (ver modelo de datos).
   ================================================= */
(function () {
    const K_BORRADOR = 'fyag_faena_actual';
    const K_COLA = 'fyag_cola_sync';
    const K_ULTIMA = 'fyag_ultima_faena';

    // TODO BD: estos datos vendrán de la orden de trabajo asignada al técnico
    const FAENA = { id: 105, tipo: 'Climatización', cliente: 'Agroindustrial El Peumo de Bulnes SpA', tecnico: 'Reinaldo Tapia' };

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

    /* ---------- Borrador de la faena en curso ---------- */
    function borrador() {
        const d = leer(K_BORRADOR, null);
        if (d && d.orden === FAENA.id) return d;
        return { orden: FAENA.id, uuid_sync: uuid(), evidencias: [], receptor: {} };
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
    function encolar(tipo, payload, id) {
        const c = cola();
        const item = { tipo, uuid_sync: id || uuid(), creado: new Date().toISOString(), payload };
        c.push(item);
        return guardar(K_COLA, c) ? item : null;
    }
    function pendiente(id) { return cola().some(i => i.uuid_sync === id); }

    // TODO DJANGO: reemplazar por fetch('/api/sync/', {method:'POST', headers:{'Content-Type':'application/json', 'X-CSRFToken': ...}, body: JSON.stringify(item)})
    function enviarAlServidor(item) {
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
    }

    let enCurso = false;
    async function sincronizar() {
        if (!navigator.onLine || enCurso) return 0;
        enCurso = true;
        let enviados = 0;
        try {
            for (const item of cola()) {
                const ok = await enviarAlServidor(item);
                if (!ok) break;
                guardar(K_COLA, cola().filter(i => i.uuid_sync !== item.uuid_sync));
                enviados++;
            }
        } catch (e) { /* se reintenta al volver la conexión */ }
        enCurso = false;
        window.dispatchEvent(new CustomEvent('faena:sync', { detail: { enviados, pendientes: cola().length } }));
        return enviados;
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
    document.addEventListener('DOMContentLoaded', pintarRed);

    function hoy() { return new Date(); }

    window.FaenaStore = {
        FAENA, uuid, borrador, guardarBorrador, limpiarBorrador, comprimirImagen,
        cola, encolar, pendiente, sincronizar, guardarUltima, ultima, hoy
    };
})();
