/* =================================================
   JS Exclusivo - Pantalla 4: Firma del Mandante (Validación Visual)
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    const contenedorLienzo = document.querySelector('.contenedor-lienzo');
    let dibujando = false;
    let haFirmado = false;

    function ajustarCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
    }
    ajustarCanvas();

    function obtenerPosicion(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        dibujando = true;
        haFirmado = true;
        if (contenedorLienzo) contenedorLienzo.style.borderColor = '#D1D5DB';
        const pos = obtenerPosicion(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!dibujando) return;
        const pos = obtenerPosicion(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    });

    canvas.addEventListener('mouseup', () => { dibujando = false; });
    canvas.addEventListener('mouseleave', () => { dibujando = false; });

    canvas.addEventListener('touchstart', (e) => {
        dibujando = true;
        haFirmado = true;
        if (contenedorLienzo) contenedorLienzo.style.borderColor = '#D1D5DB';
        const pos = obtenerPosicion(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!dibujando) return;
        const pos = obtenerPosicion(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    });

    canvas.addEventListener('touchend', () => { dibujando = false; });

    const btnLimpiar = document.getElementById('btn-limpiar-firma');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            haFirmado = false;
        });
    }

    const btnSincronizar = document.getElementById('btn-sincronizar');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', () => {
            const inputRut = document.getElementById('rut_mandante');
            const inputNombre = document.getElementById('nombre_completo');
            const inputCargo = document.getElementById('cargo_planta');

            const rut = inputRut.value.trim();
            const nombre = inputNombre.value.trim();
            const cargo = inputCargo.value.trim();

            let valido = true;

            // Validación visual de campos de texto
            if (!rut) { inputRut.style.borderColor = '#EF4444'; valido = false; } else { inputRut.style.borderColor = '#D1D5DB'; }
            if (!nombre) { inputNombre.style.borderColor = '#EF4444'; valido = false; } else { inputNombre.style.borderColor = '#D1D5DB'; }
            if (!cargo) { inputCargo.style.borderColor = '#EF4444'; valido = false; } else { inputCargo.style.borderColor = '#D1D5DB'; }

            // Validación visual del lienzo de firma
            if (!haFirmado) {
                if (contenedorLienzo) contenedorLienzo.style.borderColor = '#EF4444'; // Marco rojo en el lienzo si falta firma
                valido = false;
            } else {
                if (contenedorLienzo) contenedorLienzo.style.borderColor = '#D1D5DB';
            }

            if (!valido) {
                return; // Detiene la acción visualmente sin ventanas emergentes
            }

            const firmaBase64 = canvas.toDataURL('image/png');
            document.getElementById('firma_base64').value = firmaBase64;

            window.location.href = '/pwa/sincronizacion/';
        });
    }
});