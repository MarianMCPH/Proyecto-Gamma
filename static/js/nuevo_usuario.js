/* =================================================
   Validación y Registro de Nuevo Usuario
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formNuevoUsuario");
    if (!form) return;

    const inputFoto = document.getElementById("foto_perfil");
    const previewImg = document.getElementById("previewFotoImg");
    const previewIcon = document.getElementById("previewFotoIcon");
    const btnQuitarFoto = document.getElementById("btnQuitarFoto");

    const inputNombres = document.getElementById("nombres");
    const inputRut = document.getElementById("rut");
    const errorRut = document.getElementById("errorRut");
    const inputCorreo = document.getElementById("correo");
    const inputTelefono = document.getElementById("telefono");
    const errorTelefono = document.getElementById("errorTelefono");
    const selectRol = document.getElementById("rol");

    const inputPassword = document.getElementById("password");
    const errorPasswordLongitud = document.getElementById("errorPasswordLongitud");
    const inputConfirmPassword = document.getElementById("confirmPassword");
    const errorConfirmPassword = document.getElementById("errorConfirmPassword");

    const DOMINIO_CORPORATIVO = "frioyagroindustria.cl";
    const REGEX_RUT = /^\d{7,8}-[\dkK]$/;
    const REGEX_TELEFONO = /^(?:\+?56\s*)?9\s*\d{4}\s*\d{4}$/;
    const REGEX_PASSWORD_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

    // --- 1. Vista previa y botón Quitar foto ---
    function limpiarFotoPerfil() {
        if (inputFoto) inputFoto.value = "";
        if (previewImg) {
            previewImg.src = "";
            previewImg.style.display = "none";
        }
        if (previewIcon) previewIcon.style.display = "block";
        if (btnQuitarFoto) btnQuitarFoto.style.display = "none";
    }

    if (inputFoto) {
        inputFoto.addEventListener("change", function () {
            const archivo = this.files && this.files[0];
            if (!archivo) {
                limpiarFotoPerfil();
                return;
            }
            const lector = new FileReader();
            lector.onload = function (e) {
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = "block";
                }
                if (previewIcon) previewIcon.style.display = "none";
                if (btnQuitarFoto) btnQuitarFoto.style.display = "inline-block";
            };
            lector.readAsDataURL(archivo);
        });
    }

    if (btnQuitarFoto) {
        btnQuitarFoto.addEventListener("click", limpiarFotoPerfil);
    }

    // --- 2. Autogeneración de Correo Corporativo ---
    function generarCorreoCorporativo(nombreCompleto) {
        const limpio = nombreCompleto
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const partes = limpio.match(/[a-z0-9]+/g);
        if (!partes || partes.length === 0) return "";
        return `${partes.join(".")}@${DOMINIO_CORPORATIVO}`;
    }

    if (inputNombres && inputCorreo) {
        inputNombres.addEventListener("input", function () {
            inputCorreo.value = generarCorreoCorporativo(this.value);
        });
    }


// --- 3. Validación de RUT sin puntos y con guión verificador (23456789-0) ---
    function validarRutChileno(rutValor) {
        const valor = rutValor.trim();
        return REGEX_RUT.test(valor);
    }

    function actualizarEstadoRut() {
        if (!inputRut) return true;
        // Eliminar puntos automáticamente si el usuario los teclea
        inputRut.value = inputRut.value.replace(/\./g, "").toUpperCase();
        const valor = inputRut.value.trim();

        if (!valor) {
            inputRut.classList.remove("is-invalid");
            if (errorRut) errorRut.style.display = "none";
            return false;
        }

        const esValido = validarRutChileno(valor);
        inputRut.classList.toggle("is-invalid", !esValido);
        if (errorRut) errorRut.style.display = esValido ? "none" : "block";
        return esValido;
    }

    if (inputRut) {
        inputRut.addEventListener("input", actualizarEstadoRut);
        inputRut.addEventListener("blur", actualizarEstadoRut);
    }

    // --- 4. Validación de Teléfono Opcional (9 7433 8345 o +56 9 7433 8345) ---
    function actualizarEstadoTelefono() {
        if (!inputTelefono) return true;
        const valor = inputTelefono.value.trim();

        if (!valor) {
            inputTelefono.classList.remove("is-invalid");
            if (errorTelefono) errorTelefono.style.display = "none";
            return true; // Es opcional
        }

        const esValido = REGEX_TELEFONO.test(valor);
        inputTelefono.classList.toggle("is-invalid", !esValido);
        if (errorTelefono) errorTelefono.style.display = esValido ? "none" : "block";
        return esValido;
    }

    if (inputTelefono) {
        inputTelefono.addEventListener("input", actualizarEstadoTelefono);
        inputTelefono.addEventListener("blur", actualizarEstadoTelefono);
    }

    // --- 5. Validación de Contraseña Segura ---
    function actualizarEstadoPassword() {
        if (!inputPassword) return true;
        const pass = inputPassword.value;

        if (!pass) {
            inputPassword.classList.remove("is-invalid");
            if (errorPasswordLongitud) errorPasswordLongitud.style.display = "none";
            return false;
        }

        const esSegura = REGEX_PASSWORD_SEGURA.test(pass);
        inputPassword.classList.toggle("is-invalid", !esSegura);
        if (errorPasswordLongitud) errorPasswordLongitud.style.display = esSegura ? "none" : "block";
        return esSegura;
    }

    function actualizarConfirmacionPassword() {
        if (!inputConfirmPassword || !inputPassword) return true;
        const confirm = inputConfirmPassword.value;

        if (!confirm) {
            inputConfirmPassword.classList.remove("is-invalid");
            if (errorConfirmPassword) errorConfirmPassword.style.display = "none";
            return false;
        }

        const coinciden = inputPassword.value === confirm;
        inputConfirmPassword.classList.toggle("is-invalid", !coinciden);
        if (errorConfirmPassword) errorConfirmPassword.style.display = coinciden ? "none" : "block";
        return coinciden;
    }

    if (inputPassword) {
        inputPassword.addEventListener("input", function () {
            actualizarEstadoPassword();
            if (inputConfirmPassword && inputConfirmPassword.value) {
                actualizarConfirmacionPassword();
            }
        });
    }

    if (inputConfirmPassword) {
        inputConfirmPassword.addEventListener("input", actualizarConfirmacionPassword);
    }

    // --- 6. Modal de feedback ---
    function mostrarModalMensaje({ icono, titulo, mensaje, urlRedireccion }) {
        const previo = document.getElementById("modal-usuario-feedback");
        if (previo) previo.remove();

        const overlay = document.createElement("div");
        overlay.id = "modal-usuario-feedback";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.55); display: flex;
            align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        `;

        overlay.innerHTML = `
            <div style="background: #fff; border-radius: 14px; padding: 26px 22px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size: 44px; margin-bottom: 10px;">${icono}</div>
                <h5 style="margin: 0 0 8px 0; color: #2e3252; font-weight: 700;">${titulo}</h5>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">${mensaje}</p>
                <button type="button" id="btnCerrarModalUsuario" style="width: 100%; min-height: 40px; background-color: #373b6e; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Aceptar
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById("btnCerrarModalUsuario").onclick = function () {
            if (urlRedireccion) {
                window.location.href = urlRedireccion;
            } else {
                overlay.remove();
            }
        };
    }

    // --- 7. Envío del formulario ---
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const nombresValido = inputNombres && inputNombres.value.trim().length > 0;
        const rutValido = actualizarEstadoRut();
        const telValido = actualizarEstadoTelefono();
        const rolValido = selectRol && selectRol.value.trim().length > 0;
        const passValida = actualizarEstadoPassword();
        const confirmValida = actualizarConfirmacionPassword();

        if (!nombresValido || !rutValido || !telValido || !rolValido || !passValida || !confirmValida) {
            mostrarModalMensaje({
                icono: "⚠️",
                titulo: "Revise los datos ingresados",
                mensaje: "Asegúrese de completar todos los campos obligatorios y corregir los campos marcados en rojo.",
                urlRedireccion: null,
            });
            return;
        }

        const btnSubmit = form.querySelector('button[type="submit"]');
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            const formData = new FormData(form);
            const resp = await fetch(form.action, {
                method: "POST",
                body: formData,
            });
            const data = await resp.json();

            if (!resp.ok || !data.ok) {
                if (btnSubmit) btnSubmit.disabled = false;
                mostrarModalMensaje({
                    icono: "⚠️",
                    titulo: "No se pudo registrar",
                    mensaje: data.error || "Ocurrió un error al validar los datos.",
                    urlRedireccion: null,
                });
                return;
            }

            mostrarModalMensaje({
                icono: "✔️",
                titulo: "¡Usuario Registrado!",
                mensaje: `El usuario ha sido creado con el correo ${inputCorreo.value}.`,
                urlRedireccion: form.dataset.urlVolver,
            });
        } catch (err) {
            if (btnSubmit) btnSubmit.disabled = false;
            mostrarModalMensaje({
                icono: "❌",
                titulo: "Error de conexión",
                mensaje: "No se pudo conectar con el servidor. Intente nuevamente.",
                urlRedireccion: null,
            });
        }
    });
});