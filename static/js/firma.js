/* =================================================
   JS Exclusivo - Pantalla 4: Firma del Mandante
   Valida receptor y firma, cierra la faena en el dispositivo y la deja
   en la cola de sincronización (se envía al servidor al haber conexión).
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    const contenedor = document.getElementById('contenedor-lienzo');
    const errorFirma = document.getElementById('error-firma');
    const campos = ['rut_mandante', 'nombre_completo', 'cargo_planta'].map(id => document.getElementById(id));
    const [inRut, inNombre, inCargo] = campos;
    const aviso = document.getElementById('aviso-firma');
    const btnFin = document.getElementById('btn-sincronizar');
    const borrador = FaenaStore.borrador();

    // Resumen (TODO BD: datos reales de la orden)
    const F = FaenaStore.FAENA;
    document.getElementById('res-cliente').textContent = F.cliente;
    document.getElementById('res-tipo').textContent = F.tipo;
    document.getElementById('res-tecnico').textContent = F.tecnico;
    const horaCierre = FaenaStore.hoy();
    document.getElementById('res-hora').textContent =
        String(horaCierre.getHours()).padStart(2, '0') + ':' + String(horaCierre.getMinutes()).padStart(2, '0');

    // Restaura lo escrito si el técnico vuelve atrás (la firma siempre se vuelve a dibujar)
    const r = borrador.receptor || {};
    inRut.value = r.rut || ''; inNombre.value = r.nombre || ''; inCargo.value = r.cargo || '';

    /* ---------- RUT chileno (módulo 11) ---------- */
    function limpiarRut(v) { return v.replace(/[^0-9kK]/g, '').toUpperCase(); }
    function formatearRut(v) {
        const l = limpiarRut(v);
        if (l.length < 2) return l;
        return l.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + l.slice(-1);
    }
    function rutValido(v) {
        const l = limpiarRut(v);
        if (l.length < 2 || !/^\d+$/.test(l.slice(0, -1))) return false;
        let suma = 0, mult = 2;
        for (let i = l.length - 2; i >= 0; i--) { suma += Number(l[i]) * mult; mult = mult === 7 ? 2 : mult + 1; }
        const resto = 11 - (suma % 11);
        const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
        return dv === l.slice(-1);
    }
    inRut.addEventListener('blur', () => { inRut.value = formatearRut(inRut.value); });

    /* ---------- Lienzo (pointer events: mouse, dedo y lápiz) ---------- */
    let dibujando = false, trazos = 0, puntos = 0;

    function ajustarCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        trazos = 0; puntos = 0;
    }
    ajustarCanvas();
    window.addEventListener('resize', ajustarCanvas);     // girar el teléfono borra el trazo (cambia el tamaño)

    function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', (e) => {
        dibujando = true; trazos++;
        canvas.setPointerCapture(e.pointerId);
        contenedor.classList.remove('falta'); errorFirma.classList.remove('visible');
        const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.01, p.y + 0.01); ctx.stroke();
        e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!dibujando) return;
        const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); puntos++;
        e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { dibujando = false; }));

    document.getElementById('btn-limpiar-firma').addEventListener('click', () => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
        trazos = 0; puntos = 0;
    });

    const hayFirma = () => trazos > 0 && puntos >= 5;     // un simple toque no cuenta como firma

    /* ---------- Validación ---------- */
    function marcar(el, malo) {
        el.classList.toggle('campo-invalido', malo);
        document.querySelector(`[data-error-de="${el.id}"]`).classList.toggle('visible', malo);
    }
    campos.forEach(el => el.addEventListener('input', () => marcar(el, false)));

    function guardarReceptor() {
        borrador.receptor = { rut: inRut.value.trim(), nombre: inNombre.value.trim(), cargo: inCargo.value.trim() };
        FaenaStore.guardarBorrador(borrador);
    }
    campos.forEach(el => el.addEventListener('change', guardarReceptor));

    btnFin.addEventListener('click', () => {
        inRut.value = formatearRut(inRut.value);
        const malos = [[inRut, !rutValido(inRut.value)], [inNombre, !inNombre.value.trim()], [inCargo, !inCargo.value.trim()]];
        malos.forEach(([el, m]) => marcar(el, m));
        const sinFirma = !hayFirma();
        contenedor.classList.toggle('falta', sinFirma);
        errorFirma.classList.toggle('visible', sinFirma);
        const primero = malos.find(([, m]) => m);
        if (primero) { primero[0].focus(); return; }
        if (sinFirma) { contenedor.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

        // Fotos obligatorias del paso anterior (por si se entra directo a esta URL)
        const e0 = borrador.evidencias[0];
        if (!e0 || !e0.antes || !e0.despues) {
            aviso.textContent = 'Faltan las fotos «Antes» y «Después». Vuelva al paso anterior.';
            aviso.classList.remove('d-none'); return;
        }

        guardarReceptor();
        const firmaImg = canvas.toDataURL('image/png');
        document.getElementById('firma_base64').value = firmaImg;
        const cierre = new Date().toISOString();
        // TODO BD: aquí también irán el checklist y el consumo de insumos de los pasos 1 y 2
        const item = FaenaStore.encolar('faena', {
            orden: borrador.orden,
            evidencias: borrador.evidencias,
            firma: { ...borrador.receptor, imagen_base64: firmaImg, fecha: cierre },
            cerrada_en: cierre
        }, borrador.uuid_sync);
        if (!item) {
            aviso.textContent = 'No hay espacio en el dispositivo para guardar la faena. Libere espacio e intente de nuevo.';
            aviso.classList.remove('d-none'); return;
        }
        FaenaStore.guardarUltima({ uuid_sync: item.uuid_sync, cerrada_en: cierre, ...FaenaStore.FAENA });
        FaenaStore.limpiarBorrador();
        btnFin.disabled = true;
        if (navigator.onLine) { window.location.href = btnFin.dataset.url; return; }

        // Sin red: el servidor no puede entregar la pantalla final, así que se avisa aquí mismo
        // y se avanza solo cuando vuelva la conexión (la faena ya quedó guardada en la cola).
        document.getElementById('modal-offline').style.display = 'flex';
        window.addEventListener('online', () => { window.location.href = btnFin.dataset.url; }, { once: true });
    });
});
