/* =================================================
   Validación, Confirmación y Modales - Pantalla Nueva Orden
   ================================================= */

function crearOverlayBase(id) {
    const previo = document.getElementById(id);
    if (previo) previo.remove();

    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6); display: flex;
        align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;
    `;
    return overlay;
}

function mostrarModalConfirmacion(onConfirmar) {
    const overlay = crearOverlayBase("modal-confirmar-orden");

    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 12px;">❓</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">Confirmar registro</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">¿Desea guardar los datos?</p>
        <div style="display: flex; gap: 10px;">
            <button type="button" id="btn-confirmar-no" style="flex: 1; min-height: 44px; background-color: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">No</button>
            <button type="button" id="btn-confirmar-si" style="flex: 1; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Sí</button>
        </div>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-confirmar-no").onclick = function () {
        overlay.remove();
    };

    document.getElementById("btn-confirmar-si").onclick = function () {
        overlay.remove();
        onConfirmar();
    };
}

function mostrarModalError(mensaje) {
    const overlay = crearOverlayBase("modal-error-orden");

    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 44px; margin-bottom: 12px;">⚠️</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">Error al guardar</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <button type="button" id="btn-error-reintentar" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Reintentar</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-error-reintentar").onclick = function () {
        overlay.remove();
    };
}

function mostrarModalExito(urlRedireccion) {
    const overlay = crearOverlayBase("pwa-success-modal");

    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 48px; color: #10B981; margin-bottom: 12px;">✔️</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">¡Obra Creada Exitosamente!</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">La nueva orden de trabajo ha sido asignada y registrada correctamente en el sistema.</p>
        <button type="button" id="btn-modal-volver" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Volver</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-modal-volver").onclick = function () {
        window.location.href = urlRedireccion;
    };
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formNuevaOrdenDetallada");
    if (!form) return;

    const selectCliente = document.getElementById("cliente");
    const inputContacto = document.getElementById("contactoPlanta");
    const inputDireccion = document.getElementById("direccionFaena");

    // Autocompleta contacto y dirección desde el cliente seleccionado si están vacíos
    if (selectCliente) {
        selectCliente.addEventListener("change", function () {
            const opcion = this.options[this.selectedIndex];
            if (!opcion) return;

            const contactoCliente = opcion.getAttribute("data-contacto") || "";
            const direccionCliente = opcion.getAttribute("data-direccion") || "";

            if (inputContacto && !inputContacto.value.trim() && contactoCliente) {
                inputContacto.value = contactoCliente;
            }
            if (inputDireccion && !inputDireccion.value.trim() && direccionCliente) {
                inputDireccion.value = direccionCliente;
            }
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const camposRequeridos = form.querySelectorAll("input[required], select[required], textarea[required]");
        let formularioValido = true;

        camposRequeridos.forEach((campo) => {
            if (!campo.value || campo.value.trim() === "") {
                formularioValido = false;
                campo.style.borderColor = "#EF4444";
            } else {
                campo.style.borderColor = "#D1D5DB";
            }
        });

        if (!formularioValido) return;

        mostrarModalConfirmacion(function () {
            const urlDestino = form.getAttribute("data-url-volver");
            const actionUrl = form.getAttribute("action") || window.location.href;
            const formData = new FormData(form);
            const csrfInput = form.querySelector('input[name="csrfmiddlewaretoken"]');
            const csrfToken = csrfInput ? csrfInput.value : "";

            fetch(actionUrl, {
                method: "POST",
                body: formData,
                headers: {
                    "X-CSRFToken": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                },
            })
                .then(async (response) => {
                    let data = {};
                    try {
                        data = await response.json();
                    } catch (_) {
                        throw new Error("Respuesta inválida del servidor.");
                    }

                    if (!response.ok || !data.ok) {
                        throw new Error(data.error || "Algo ocurrió al guardar los datos. Vuelva a intentarlo.");
                    }

                    mostrarModalExito(urlDestino);
                })
                .catch((error) => {
                    // No se limpia el formulario para conservar lo que escribió el administrador
                    mostrarModalError(error.message || "Algo ocurrió con la conexión. Vuelva a intentarlo.");
                });
        });
    });
});