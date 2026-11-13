/* =================================================
   Validación y Modal de Éxito - Pantalla Nuevo Usuario
   ================================================= */

function mostrarModalExitoUsuario(urlRedireccion) {
    const modalExistente = document.getElementById('pwa-success-modal');
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pwa-success-modal';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6); display: flex;
        align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;
    `;

    const contenido = document.createElement('div');
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 48px; color: #10B981; margin-bottom: 12px;">✔️</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">¡Usuario Registrado con Éxito!</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">El nuevo usuario ha sido guardado correctamente en el sistema.</p>
        <button id="btn-modal-volver" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Volver</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById('btn-modal-volver').onclick = function() {
        window.location.href = urlRedireccion;
    };
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formNuevoUsuario");

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Selecciona campos requeridos (excluyendo la dirección)
            const camposRequeridos = form.querySelectorAll("input[required], select[required]");
            let formularioValido = true;

            camposRequeridos.forEach(campo => {
                if (!campo.value || campo.value.trim() === "") {
                    formularioValido = false;
                    campo.style.borderColor = "#EF4444"; // Borde rojo
                } else {
                    campo.style.borderColor = "#D1D5DB"; // Borde normal
                }
            });

            if (formularioValido) {
                // Puedes cambiar esta ruta por la URL real de Django para Personal y Usuarios
                const urlDestino = form.dataset.urlVolver;
                mostrarModalExitoUsuario(urlDestino);
            }
        });
    }
});