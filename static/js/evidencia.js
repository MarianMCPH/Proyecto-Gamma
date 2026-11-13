/* =================================================
   JS Exclusivo - Pantalla 3: Evidencia Fotográfica (Validación Visual)
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('observacion_evidencia');
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    function configurarInputFoto(inputId, previewId, labelId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const label = document.getElementById(labelId);

        if (input) {
            input.addEventListener('change', function () {
                const archivo = this.files[0];
                if (archivo) {
                    const lector = new FileReader();
                    lector.onload = function (e) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                        label.querySelector('.icono-camara').style.display = 'none';
                        label.querySelector('.texto-subida').style.display = 'none';
                        label.style.borderColor = '#9CA3AF';
                    };
                    lector.readAsDataURL(archivo);
                }
            });
        }
    }

    configurarInputFoto('foto_antes', 'preview-antes', 'label-antes');
    configurarInputFoto('foto_despues', 'preview-despues', 'label-despues');

    const btnAgregarImagen = document.getElementById('btn-agregar-imagen');
    const contenedorFotos = document.getElementById('contenedor-fotos');
    let contadorAdicionales = 1;

    if (btnAgregarImagen && contenedorFotos) {
        btnAgregarImagen.addEventListener('click', () => {
            contadorAdicionales++;
            const nuevoIdInput = `foto_adicional_${contadorAdicionales}`;
            const nuevoIdPreview = `preview_adic_${contadorAdicionales}`;
            const nuevoIdLabel = `label_adic_${contadorAdicionales}`;

            const divGrupo = document.createElement('div');
            divGrupo.className = 'grupo-input-foto';
            divGrupo.innerHTML = `
                <label for="${nuevoIdInput}" class="zona-subida-foto" id="${nuevoIdLabel}">
                    <span class="icono-camara">📷</span>
                    <span class="texto-subida">Subir Imagen Adicional ${contadorAdicionales}</span>
                    <img id="${nuevoIdPreview}" class="preview-imagen" src="" alt="Vista previa" style="display: none;">
                </label>
                <input type="file" id="${nuevoIdInput}" name="fotos_adicionales[]" accept="image/*" capture="environment" style="display: none;">
                <button type="button" class="btn-eliminar-foto">Eliminar este espacio</button>
            `;

            contenedorFotos.appendChild(divGrupo);

            const nuevoInput = divGrupo.querySelector(`#${nuevoIdInput}`);
            const nuevaPreview = divGrupo.querySelector(`#${nuevoIdPreview}`);
            const nuevoLabel = divGrupo.querySelector(`#${nuevoIdLabel}`);

            nuevoInput.addEventListener('change', function () {
                const archivo = this.files[0];
                if (archivo) {
                    const lector = new FileReader();
                    lector.onload = function (e) {
                        nuevaPreview.src = e.target.result;
                        nuevaPreview.style.display = 'block';
                        nuevoLabel.querySelector('.icono-camara').style.display = 'none';
                        nuevoLabel.querySelector('.texto-subida').style.display = 'none';
                    };
                    lector.readAsDataURL(archivo);
                }
            });

            divGrupo.querySelector('.btn-eliminar-foto').addEventListener('click', () => {
                divGrupo.remove();
            });
        });
    }

    const botonesNavegacion = document.querySelectorAll('a.btn');
    botonesNavegacion.forEach(btn => {
        if (btn.textContent.includes('Siguiente') || btn.textContent.includes('Firma')) {
            btn.addEventListener('click', (e) => {
                const inputAntes = document.getElementById('foto_antes');
                const inputDespues = document.getElementById('foto_despues');
                const labelAntes = document.getElementById('label-antes');
                const labelDespues = document.getElementById('label-despues');

                let valido = true;

                if (!inputAntes.files || inputAntes.files.length === 0) {
                    valido = false;
                    labelAntes.style.borderColor = '#EF4444'; // Marco rojo si falta
                } else {
                    labelAntes.style.borderColor = '#9CA3AF';
                }

                if (!inputDespues.files || inputDespues.files.length === 0) {
                    valido = false;
                    labelDespues.style.borderColor = '#EF4444'; // Marco rojo si falta
                } else {
                    labelDespues.style.borderColor = '#9CA3AF';
                }

                if (!valido) {
                    e.preventDefault();
                }
            });
        }
    });
});