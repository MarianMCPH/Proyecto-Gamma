/* =================================================
   JS Específico - Pantalla 3: Solicitud de Insumos
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Autoajuste del textarea de justificación
    const textarea = document.getElementById('justificacion');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    // 2. Previsualización de la foto seleccionada o capturada
    const inputFoto = document.getElementById('foto_falla');
    const previewImagen = document.getElementById('preview-imagen');
    const iconoCamara = document.getElementById('icono-camara');
    const textoSubida = document.getElementById('texto-subida');

    if (inputFoto) {
        inputFoto.addEventListener('change', function () {
            const archivo = this.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = function (e) {
                    previewImagen.src = e.target.result;
                    previewImagen.style.display = 'block';
                    iconoCamara.style.display = 'none';
                    textoSubida.style.display = 'none';
                };
                lector.readAsDataURL(archivo);
            }
        });
    }

    // 3. Activación del modal al enviar solicitud
    const formSolicitud = document.getElementById('form-solicitud-insumo');
    const modalConfirmacion = document.getElementById('modal-confirmacion');

    if (formSolicitud && modalConfirmacion) {
        formSolicitud.addEventListener('submit', (e) => {
            // TODO BD: Cuando conectes tu backend de Django, aquí puedes enviar con fetch()
            e.preventDefault(); 
            modalConfirmacion.style.display = 'flex';
        });
    }
});