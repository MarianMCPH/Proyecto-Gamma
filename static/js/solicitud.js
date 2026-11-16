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
            const malo = !el.value.trim() || (id === 'cantidad_solicitada' && !(Number(el.value) > 0));
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

    // Unidad de medida junto a "Cantidad"
    const selMaterial = document.getElementById('repuesto_solicitado');
    selMaterial.addEventListener('change', () => {
        const op = selMaterial.options[selMaterial.selectedIndex];
        document.getElementById('unidad-cantidad').textContent = op && op.dataset.unidad ? `(${op.dataset.unidad})` : '';
    });

    // 4. Envío: se encola y se intenta mandar de inmediato (ver faena_store.js)
    function mostrarModal(titulo, detalle, error) {
        document.getElementById('modal-titulo').textContent = titulo;
        document.getElementById('modal-detalle').textContent = detalle;
        const icono = document.getElementById('modal-icono');
        icono.className = 'bi modal-check ' + (error ? 'bi-x-lg error' : 'bi-check-lg');
        const volver = document.getElementById('btn-modal-volver');
        volver.textContent = error ? 'Corregir' : 'Volver';
        modal.dataset.error = error ? '1' : '';
        modal.style.display = 'flex';
        volver.focus();
    }
    document.getElementById('btn-modal-volver').addEventListener('click', (e) => {
        if (modal.dataset.error) { e.preventDefault(); modal.style.display = 'none'; }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!FaenaStore.FAENA || !validar()) return;
        const payload = {
            orden: FaenaStore.FAENA.id,
            material: Number(selMaterial.value),
            cantidad: document.getElementById('cantidad_solicitada').value,
            justificacion: textarea.value.trim(),
            fotos: fotos.map(f => f.dataUrl)
        };
        const item = FaenaStore.encolar('solicitud', form.dataset.urlApi, payload);
        if (!item) { avisoAlm.classList.remove('d-none'); return; }
        avisoAlm.classList.add('d-none');
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        await FaenaStore.sincronizar();
        const error = FaenaStore.errorDe(item.uuid_sync);
        if (error) {
            btn.disabled = false;
            mostrarModal('No se pudo enviar', error.mensaje, true);
        } else if (FaenaStore.pendiente(item.uuid_sync)) {
            mostrarModal('¡Solicitud Guardada!', 'Sin conexión: se enviará automáticamente cuando vuelva la señal.');
        } else {
            mostrarModal('¡Solicitud Enviada!', 'El requerimiento fue notificado a Bodega Central.');
        }
    });

    // Cerrar el modal de error para corregir el formulario
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});
