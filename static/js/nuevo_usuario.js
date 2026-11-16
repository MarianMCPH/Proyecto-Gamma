/* =================================================
   Validación, Foto de Perfil y Modales - Crear / Editar Usuario
   ================================================= */

function crearOverlayUsuario(id) {
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

function mostrarModalConfirmacionUsuario(titulo, mensaje, onConfirmar) {
    const overlay = crearOverlayUsuario("modal-confirmar-usuario");

    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 12px;">❓</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">${titulo}</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <div style="display: flex; gap: 10px;">
            <button type="button" id="btn-conf-usuario-no" style="flex: 1; min-height: 44px; background-color: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">No</button>
            <button type="button" id="btn-conf-usuario-si" style="flex: 1; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Sí</button>
        </div>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-conf-usuario-no").onclick = function () {
        overlay.remove();
    };

    document.getElementById("btn-conf-usuario-si").onclick = function () {
        overlay.remove();
        onConfirmar();
    };
}

function mostrarModalErrorUsuario(mensaje) {
    const overlay = crearOverlayUsuario("modal-error-usuario");

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
        <button type="button" id="btn-error-usuario-reintentar" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Reintentar</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-error-usuario-reintentar").onclick = function () {
        overlay.remove();
    };
}

function mostrarModalExitoUsuario(titulo, mensaje, urlRedireccion) {
    const overlay = crearOverlayUsuario("pwa-success-modal");

    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 48px; color: #10B981; margin-bottom: 12px;">✔️</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">${titulo}</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <button type="button" id="btn-modal-volver" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Volver</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-modal-volver").onclick = function () {
        window.location.href = urlRedireccion;
    };
}

document.addEventListener("DOMContentLoaded", function () {
    const formNuevo = document.getElementById("formNuevoUsuario");
    const formEditar = document.getElementById("formEditarUsuario");
    const form = formNuevo || formEditar;
    const esEdicion = Boolean(formEditar);

    if (!form) return;

    // Vista previa de foto de perfil al seleccionar archivo
    const inputFoto = document.getElementById("foto_perfil");
    const previewImg = document.getElementById("previewFotoImg");
    const previewIcon = document.getElementById("previewFotoIcon");

    if (inputFoto && previewImg) {
        inputFoto.addEventListener("change", function () {
            const archivo = this.files && this.files[0];
            if (archivo) {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    previewImg.src = ev.target.result;
                    previewImg.style.display = "block";
                    if (previewIcon) previewIcon.style.display = "none";
                };
                reader.readAsDataURL(archivo);
            }
        });
    }

    const inputPassword = document.getElementById("password");
    const inputConfirm = document.getElementById("confirmPassword");
    const errorLongitudDiv = document.getElementById("errorPasswordLongitud");
    const errorConfirmDiv = document.getElementById("errorConfirmPassword");

    function validarLongitudPassword() {
        if (!inputPassword || !errorLongitudDiv) return true;
        if (inputPassword.value.length > 0 && inputPassword.value.length < 8) {
            errorLongitudDiv.style.display = "block";
            inputPassword.style.borderColor = "#EF4444";
            return false;
        } else {
            errorLongitudDiv.style.display = "none";
            if (inputPassword.value.length >= 8 || (esEdicion && inputPassword.value.length === 0)) {
                inputPassword.style.borderColor = "#D1D5DB";
            }
            return true;
        }
    }

    function validarCoincidenciaPasswords() {
        if (!inputPassword || !inputConfirm || !errorConfirmDiv) return true;
        if ((inputPassword.value || inputConfirm.value) && inputPassword.value !== inputConfirm.value) {
            errorConfirmDiv.style.display = "block";
            inputConfirm.style.borderColor = "#EF4444";
            return false;
        } else {
            errorConfirmDiv.style.display = "none";
            inputConfirm.style.borderColor = "#D1D5DB";
            return true;
        }
    }

    if (inputPassword) {
        inputPassword.addEventListener("input", function () {
            validarLongitudPassword();
            validarCoincidenciaPasswords();
        });
    }
    if (inputConfirm) {
        inputConfirm.addEventListener("input", validarCoincidenciaPasswords);
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const camposRequeridos = form.querySelectorAll("input[required], select[required]");
        let formularioValido = true;

        camposRequeridos.forEach((campo) => {
            if (!campo.value || campo.value.trim() === "") {
                formularioValido = false;
                campo.style.borderColor = "#EF4444";
            } else {
                campo.style.borderColor = "#D1D5DB";
            }
        });

        const longitudOk = validarLongitudPassword();
        const coincidenOk = validarCoincidenciaPasswords();

        if (!formularioValido || !longitudOk || !coincidenOk) return;

        const tituloConfirm = esEdicion ? "Confirmar edición" : "Confirmar registro";
        const textoConfirm = esEdicion ? "¿Quiere editar este usuario?" : "¿Desea guardar los datos?";

        mostrarModalConfirmacionUsuario(tituloConfirm, textoConfirm, function () {
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
                        if (data.field_error === "password" && errorLongitudDiv && inputPassword) {
                            errorLongitudDiv.style.display = "block";
                            inputPassword.style.borderColor = "#EF4444";
                        }
                        if (data.field_error === "confirm_password" && errorConfirmDiv && inputConfirm) {
                            errorConfirmDiv.style.display = "block";
                            inputConfirm.style.borderColor = "#EF4444";
                        }
                        throw new Error(data.error || "Algo ocurrió al guardar los datos. Vuelva a intentarlo.");
                    }

                    if (esEdicion) {
                        mostrarModalExitoUsuario(
                            "¡Usuario Actualizado!",
                            "Los datos del usuario han sido actualizados correctamente.",
                            urlDestino
                        );
                    } else {
                        mostrarModalExitoUsuario(
                            "¡Usuario Registrado con Éxito!",
                            "El nuevo usuario ha sido guardado correctamente en el sistema.",
                            urlDestino
                        );
                    }
                })
                .catch((error) => {
                    mostrarModalErrorUsuario(error.message || "Algo ocurrió con la conexión. Vuelva a intentarlo.");
                });
        });
    });
});