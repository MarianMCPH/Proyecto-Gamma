/* =================================================
   JS Exclusivo - Pantalla 3: Evidencias Fotográficas
   - Cada bloque tiene foto Antes, foto Después y observación.
   - El primer bloque es obligatorio; se pueden adjuntar más bloques.
   - El avance se guarda solo en el dispositivo (ver faena_store.js).
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.getElementById('contenedor-bloques');
    const tpl = document.getElementById('tpl-bloque');
    const btnAgregar = document.getElementById('btn-agregar-imagen');
    const aviso = document.getElementById('aviso-evidencia');
    const MAX_BLOQUES = 6;

    const borrador = FaenaStore.borrador();
    if (!borrador.evidencias.length) borrador.evidencias.push(nuevoBloque());

    function nuevoBloque() { return { uuid_sync: FaenaStore.uuid(), antes: null, despues: null, observacion: '' }; }

    function guardar() {
        const ok = FaenaStore.guardarBorrador(borrador);
        aviso.classList.toggle('d-none', ok);
        if (!ok) aviso.textContent = 'No hay espacio en el dispositivo para guardar más fotos. Elimine un bloque o use fotos más pequeñas.';
        return ok;
    }

    function pintarMini(sec, tipo, foto) {
        const mini = sec.querySelector(`[data-mini="${tipo}"]`);
        mini.innerHTML = foto ? `<img src="${foto.dataUrl}" alt="Foto ${tipo === 'antes' ? 'antes' : 'después'}">` : '<i class="bi bi-image"></i>';
        const zona = sec.querySelector(`[data-zona="${tipo}"]`);
        zona.classList.toggle('lista', !!foto);
        if (foto) zona.classList.remove('falta');
    }

    function dibujar() {
        contenedor.innerHTML = '';
        borrador.evidencias.forEach((bloque, i) => {
            const sec = tpl.content.firstElementChild.cloneNode(true);
            sec.dataset.i = i;
            if (i > 0) sec.querySelector('.btn-eliminar-bloque').classList.remove('d-none');
            pintarMini(sec, 'antes', bloque.antes);
            pintarMini(sec, 'despues', bloque.despues);
            const ta = sec.querySelector('textarea');
            ta.value = bloque.observacion;
            ta.id = 'obs-' + i;
            sec.querySelector('.label-campo').setAttribute('for', ta.id);
            contenedor.appendChild(sec);
            if (ta.value) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
        });
        btnAgregar.disabled = borrador.evidencias.length >= MAX_BLOQUES;
    }

    // Eventos delegados
    contenedor.addEventListener('change', async (e) => {
        const input = e.target.closest('input[type="file"]');
        if (!input) return;
        const sec = input.closest('.bloque-evidencia');
        const bloque = borrador.evidencias[Number(sec.dataset.i)];
        const archivo = input.files[0];
        input.value = '';
        if (!archivo) return;
        try {
            const foto = await FaenaStore.comprimirImagen(archivo);
            bloque[input.dataset.tipo] = foto;
            if (guardar()) pintarMini(sec, input.dataset.tipo, foto);
            else { bloque[input.dataset.tipo] = null; }
        } catch (err) {
            aviso.textContent = 'No se pudo leer la imagen. Intente nuevamente.';
            aviso.classList.remove('d-none');
        }
    });

    contenedor.addEventListener('input', (e) => {
        const ta = e.target.closest('textarea');
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
        borrador.evidencias[Number(ta.closest('.bloque-evidencia').dataset.i)].observacion = ta.value;
        guardar();
    });

    contenedor.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-eliminar-bloque');
        if (!btn) return;
        borrador.evidencias.splice(Number(btn.closest('.bloque-evidencia').dataset.i), 1);
        guardar(); dibujar();
    });

    btnAgregar.addEventListener('click', () => {
        if (borrador.evidencias.length >= MAX_BLOQUES) return;
        borrador.evidencias.push(nuevoBloque());
        guardar(); dibujar();
        contenedor.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Validación al avanzar: el primer bloque debe tener Antes y Después
    document.getElementById('btn-siguiente').addEventListener('click', (e) => {
        const primero = borrador.evidencias[0];
        const sec = contenedor.firstElementChild;
        const faltaAntes = !primero.antes, faltaDespues = !primero.despues;
        sec.querySelector('[data-zona="antes"]').classList.toggle('falta', faltaAntes);
        sec.querySelector('[data-zona="despues"]').classList.toggle('falta', faltaDespues);
        if (faltaAntes || faltaDespues) {
            e.preventDefault();
            aviso.textContent = 'Suba la foto «Antes» y la foto «Después» para continuar.';
            aviso.classList.remove('d-none');
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    dibujar();
});
