/* =================================================
   JS Específico - Solicitud de Presupuesto / Piezas
   Guarda la solicitud en la cola local; se envía de inmediato si hay red
   y, si no, cuando vuelva la conexión (ver faena_store.js).
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-solicitud-insumo');
    const modal = document.getElementById('modal-confirmacion');
    const inputFoto = document.getElementById('foto_falla');
    const slots = Array.from(document.querySelectorAll('#miniaturas .miniatura'));
    const textarea = document.getElementById('justificacion');
    const avisoAlm = document.getElementById('aviso-almacenamiento');
    const MAX_FOTOS = 2;
    let fotos = [];                       // [{dataUrl, pesoKb, fecha}]

    // 1. Autoajuste del textarea
    textarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // 2. Miniaturas: se pintan desde el arreglo `fotos`
    function pintarFotos() {
        slots.forEach((s, i) => {
            const f = fotos[i];
            s.classList.toggle('llena', !!f);
            s.innerHTML = f ? `<img src="${f.dataUrl}" alt="Foto ${i + 1} de la falla">` : '<i class="bi bi-image"></i>';
            s.setAttribute('aria-label', f ? `Quitar foto ${i + 1}` : `Foto ${i + 1} (vacía)`);
        });
    }
    inputFoto.addEventListener('change', async function () {
        const archivo = this.files[0];
        this.value = '';
        if (!archivo) return;
        if (fotos.length >= MAX_FOTOS) return;
        try {
            fotos.push(await FaenaStore.comprimirImagen(archivo));
            pintarFotos();
        } catch (e) { /* archivo no válido: se ignora */ }
    });
    slots.forEach((s, i) => s.addEventListener('click', () => {
        if (fotos[i]) { fotos.splice(i, 1); pintarFotos(); }
    }));

    // 3. Validación visible (sin alert)
    function validar() {
        let ok = true;
        ['repuesto_solicitado', 'cantidad_solicitada', 'justificacion'].forEach(id => {
            const el = document.getElementById(id);
            const malo = !el.value.trim();
            el.classList.toggle('campo-invalido', malo);
            form.querySelector(`[data-error-de="${id}"]`).classList.toggle('visible', malo);
            if (malo && ok) { el.focus(); ok = false; } else if (malo) { ok = false; }
        });
        return ok;
    }
    form.addEventListener('input', e => {
        if (e.target.classList) e.target.classList.remove('campo-invalido');
        const err = form.querySelector(`[data-error-de="${e.target.id}"]`);
        if (err) err.classList.remove('visible');
    });

    // 4. Envío
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validar()) return;
        const sel = document.getElementById('repuesto_solicitado');
        const payload = {
            orden: FaenaStore.FAENA.id,
            repuesto: sel.value,
            repuesto_nombre: sel.options[sel.selectedIndex].text,
            cantidad: Number(document.getElementById('cantidad_solicitada').value),
            justificacion: textarea.value.trim(),
            fotos: fotos
        };
        const item = FaenaStore.encolar('solicitud', payload);
        if (!item) { avisoAlm.classList.remove('d-none'); return; }
        avisoAlm.classList.add('d-none');
        form.querySelector('button[type="submit"]').disabled = true;

        await FaenaStore.sincronizar();
        const enviada = !FaenaStore.pendiente(item.uuid_sync);
        document.getElementById('modal-titulo').textContent = enviada ? '¡Solicitud Enviada!' : '¡Solicitud Guardada!';
        document.getElementById('modal-detalle').textContent = enviada
            ? 'El requerimiento fue notificado a Bodega Central.'
            : 'Sin conexión: se enviará automáticamente cuando vuelva la señal.';
        modal.style.display = 'flex';
        document.getElementById('btn-modal-volver').focus();
    });
});
