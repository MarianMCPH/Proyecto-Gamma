document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('justificacion');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

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
});