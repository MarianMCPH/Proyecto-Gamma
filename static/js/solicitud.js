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
        const campos = ['repuesto_solicitado', 'cantidad_solicitada', 'justificacion'];
        campos.forEach(id => {
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

    // Unidad de medida junto a "Cantidad" (solo materiales del kit del servicio)
    const selMaterial = document.getElementById('repuesto_solicitado');
    selMaterial.addEventListener('change', () => {
        const op = selMaterial.options[selMaterial.selectedIndex];
        document.getElementById('unidad-cantidad').textContent = op && op.dataset.unidad ? `(${op.dataset.unidad})` : '';
    });

    // Cancelar: descarta lo escrito y vuelve a Consumo de Insumos
    document.getElementById('btn-cancelar').addEventListener('click', () => {
        form.reset();
        fotos = []; pintarFotos();
        window.location.href = form.dataset.urlVolver;
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
        ultimaEnviada = item.uuid_sync;
        pintarLocales();                               // aparece en "Mis solicitudes" como "Sin enviar"

        await FaenaStore.sincronizar();
        pintarLocales();                               // si salió, pasa a "Pendiente" (en Bodega)
        btn.disabled = false;
        const error = FaenaStore.errorDe(item.uuid_sync);
        if (error) {
            mostrarModal('No se pudo enviar', error.mensaje, true);
            return;
        }
        limpiarFormulario();                           // listo para otra solicitud
        if (FaenaStore.pendiente(item.uuid_sync)) {
            mostrarModal('¡Solicitud Guardada!', 'Sin conexión: se enviará automáticamente cuando vuelva la señal.');
        } else {
            mostrarModal('¡Solicitud Enviada!', 'El requerimiento fue notificado a Bodega Central.');
        }
    });

    let ultimaEnviada = null;
    function limpiarFormulario() {
        form.reset();
        fotos = []; pintarFotos();
        document.getElementById('unidad-cantidad').textContent = '';
        textarea.style.height = 'auto';
    }

    // Cerrar el modal de error para corregir el formulario
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // 5. "Mis solicitudes": estado de lo enviado (desde la BD) + lo que aún no sale del dispositivo
    const lista = document.getElementById('lista-solicitudes');
    const avisoLista = document.getElementById('aviso-lista');
    const sinSolicitudes = document.getElementById('sin-solicitudes');

    function actualizarVacio() { sinSolicitudes.classList.toggle('d-none', lista.children.length > 0); }

    function pintarLocales() {
        // Las que ya salieron del dispositivo pasan a "Pendiente" (en Bodega) o muestran el rechazo
        lista.querySelectorAll('.fila-solicitud.local').forEach(li => {
            const uuid = li.dataset.uuid;
            if (FaenaStore.pendiente(uuid)) { li.remove(); return; }
            const error = FaenaStore.errorDe(uuid);
            li.classList.remove('local');
            li.querySelector('.codigo').textContent = error ? 'No enviada' : 'Enviada';
            const pill = li.querySelector('.pill-estado');
            pill.className = 'pill-estado ' + (error ? 'rechazada' : 'pendiente');
            pill.textContent = error ? 'Rechazada' : 'Pendiente';
            const btn = li.querySelector('.btn-cancelar-fila');
            if (error) { btn.remove(); li.title = error.mensaje; }
            else btn.dataset.local = '';                 // ahora se cancela en el servidor
        });
        if (!FaenaStore.FAENA) return;
        FaenaStore.pendientesDe(FaenaStore.FAENA.id).filter(i => i.tipo === 'solicitud').forEach(i => {
            const p = i.payload;
            const op = selMaterial.querySelector(`option[value="${p.material}"]`);
            const articulo = op ? op.textContent.split(' (stock')[0] : 'Artículo';
            const unidad = op ? (op.dataset.unidad || '') : '';
            const li = document.createElement('li');
            li.className = 'fila-solicitud local';
            li.dataset.uuid = i.uuid_sync;
            li.innerHTML = `<div class="info-solicitud"><span class="codigo">En este dispositivo</span>
                <span class="articulo"></span><span class="cantidad"></span></div>
                <div class="acciones-solicitud"><span class="pill-estado sin-enviar">Sin enviar</span>
                <button type="button" class="btn-cancelar-fila" data-uuid="${i.uuid_sync}" data-local="1">Cancelar</button></div>`;
            li.querySelector('.articulo').textContent = articulo;
            li.querySelector('.cantidad').textContent = `${p.cantidad} ${unidad}`.trim();
            lista.prepend(li);
        });
        actualizarVacio();
    }

    lista.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-cancelar-fila');
        if (!btn) return;
        avisoLista.classList.add('d-none');
        const uuid = btn.dataset.uuid;
        if (btn.dataset.local) {                       // nunca salió del dispositivo: se quita de la cola
            FaenaStore.cancelarLocal(uuid);
            btn.closest('li').remove();
            actualizarVacio();
            return;
        }
        if (!navigator.onLine) {
            avisoLista.textContent = 'Se necesita conexión para cancelar una solicitud que ya fue enviada.';
            avisoLista.classList.remove('d-none');
            return;
        }
        btn.disabled = true;
        try {
            const r = await FaenaStore.postJSON(form.dataset.urlCancelar, { uuid_sync: uuid });
            if (r.ok) { btn.closest('li').remove(); actualizarVacio(); return; }
            avisoLista.textContent = r.datos.error || 'No se pudo cancelar la solicitud.';
        } catch (err) {
            avisoLista.textContent = 'No se pudo conectar con el servidor. Intente de nuevo.';
        }
        avisoLista.classList.remove('d-none');
        btn.disabled = false;
    });

    // Cierra el modal y baja hasta la lista, marcando la solicitud recién enviada
    document.getElementById('btn-ver-solicitudes').addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('mis-solicitudes').scrollIntoView({ behavior: 'smooth', block: 'start' });
        const fila = ultimaEnviada && lista.querySelector(`.fila-solicitud[data-uuid="${ultimaEnviada}"]`);
        if (fila) {
            fila.classList.remove('nueva');
            void fila.offsetWidth;                     // reinicia la animación
            fila.classList.add('nueva');
        }
    });

    window.addEventListener('faena:sync', pintarLocales);
    pintarLocales();
});
