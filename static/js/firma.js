document.addEventListener('DOMContentLoaded', () => {
    const formularios = document.querySelectorAll('form#form-firma');

    formularios.forEach((formFirma) => {
        const canvas = formFirma.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const contenedorLienzo = formFirma.querySelector('.contenedor-lienzo');
        const btnLimpiar = formFirma.querySelector('#btn-limpiar-firma');
        const inputFirma = formFirma.querySelector('input[name="firma_base64"]');

        let dibujando = false;
        let haFirmado = false;

        canvas.style.touchAction = 'none';
        canvas.style.cursor = 'crosshair';

        function ajustarCanvas() {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                canvas.width = Math.round(rect.width);
                canvas.height = Math.round(rect.height);
            }
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        ajustarCanvas();

        function obtenerPosicion(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / (rect.width || canvas.width);
            const scaleY = canvas.height / (rect.height || canvas.height);
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }

        canvas.addEventListener('pointerdown', (e) => {
            if (!haFirmado) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width > 0 && Math.abs(canvas.width - rect.width) > 2) {
                    ajustarCanvas();
                }
            }
            dibujando = true;
            haFirmado = true;
            if (contenedorLienzo) contenedorLienzo.style.borderColor = '#D1D5DB';

            canvas.setPointerCapture(e.pointerId);
            const pos = obtenerPosicion(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            e.preventDefault();
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!dibujando) return;
            const pos = obtenerPosicion(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            e.preventDefault();
        });

        const terminarTrazo = (e) => {
            if (!dibujando) return;
            dibujando = false;
            if (e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
                canvas.releasePointerCapture(e.pointerId);
            }
        };

        canvas.addEventListener('pointerup', terminarTrazo);
        canvas.addEventListener('pointercancel', terminarTrazo);

        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                haFirmado = false;
            });
        }

        formFirma.addEventListener('submit', (e) => {
            const inputRut = formFirma.querySelector('input[name="rut_mandante"]');
            const inputNombre = formFirma.querySelector('input[name="nombre_completo"]');
            const inputCargo = formFirma.querySelector('input[name="cargo_planta"]');

            const rut = inputRut ? inputRut.value.trim() : '';
            const nombre = inputNombre ? inputNombre.value.trim() : '';
            const cargo = inputCargo ? inputCargo.value.trim() : '';

            let valido = true;

            if (!rut) { if (inputRut) inputRut.style.borderColor = '#EF4444'; valido = false; }
            else { inputRut.style.borderColor = '#D1D5DB'; }

            if (!nombre) { if (inputNombre) inputNombre.style.borderColor = '#EF4444'; valido = false; }
            else { inputNombre.style.borderColor = '#D1D5DB'; }

            if (!cargo) { if (inputCargo) inputCargo.style.borderColor = '#EF4444'; valido = false; }
            else { inputCargo.style.borderColor = '#D1D5DB'; }

            if (!haFirmado) {
                if (contenedorLienzo) contenedorLienzo.style.borderColor = '#EF4444';
                valido = false;
            } else if (contenedorLienzo) {
                contenedorLienzo.style.borderColor = '#D1D5DB';
            }

            if (!valido) {
                e.preventDefault();
                return;
            }

            if (inputFirma) {
                inputFirma.value = canvas.toDataURL('image/png');
            }
        });
    });
});