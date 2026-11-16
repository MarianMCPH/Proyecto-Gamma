/* =================================================
   Detalle de Solicitud de Insumos:
   - Visor ampliado de imágenes (Antes / Después)
   - Modales de confirmación y resultado (Aprobar / Rechazar)
   - Actualización en BD y badge de estado
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const contenedor = document.getElementById("detalleSolicitudWrapper");
    if (!contenedor) return;

    const solicitudId = contenedor.dataset.solicitudId;
    const urlEndpoint = contenedor.dataset.urlEndpoint;
    const urlVolver = contenedor.dataset.urlVolver;
    const csrfInput = document.querySelector("[name=csrfmiddlewaretoken]");
    const csrfToken = csrfInput ? csrfInput.value : "";

    const badge = document.getElementById("badgeEstadoSolicitud");
    const obsInput = document.getElementById("observacionAdmin");
    const btnAprobar = document.getElementById("btnAprobar");
    const btnRechazar = document.getElementById("btnRechazar");

    function cerrarModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.remove();
    }

    // 1. Visor ampliado (Lightbox) al pinchar imágenes de Antes / Después
    function abrirVisorImagen(src, titulo) {
        cerrarModal("modalVisorEvidencia");
        const overlay = document.createElement("div");
        overlay.id = "modalVisorEvidencia";
        overlay.className = "fyag-modal-overlay";
        overlay.innerHTML = `
            <div class="fyag-lightbox-box">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold mb-0 text-dark">${titulo}</h6>
                    <button type="button" id="btnCerrarLightbox" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-x-lg"></i> Cerrar
                    </button>
                </div>
                <img src="${src}" alt="${titulo}" class="fyag-lightbox-img">
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) cerrarModal("modalVisorEvidencia");
        });
        document.getElementById("btnCerrarLightbox").addEventListener("click", function () {
            cerrarModal("modalVisorEvidencia");
        });
    }

    document.querySelectorAll(".js-ver-evidencia").forEach((caja) => {
        caja.addEventListener("click", function () {
            const src = this.dataset.imgSrc;
            const titulo = this.dataset.imgTitulo || "Evidencia fotográfica";
            if (src) abrirVisorImagen(src, titulo);
        });
    });

    // 2. Modal de confirmación previo a guardar
    function mostrarModalConfirmacion({ titulo, mensaje, textoConfirmar, claseBoton, onConfirmar }) {
        cerrarModal("modalConfirmacionSolicitud");
        const overlay = document.createElement("div");
        overlay.id = "modalConfirmacionSolicitud";
        overlay.className = "fyag-modal-overlay";
        overlay.innerHTML = `
            <div class="fyag-modal-box">
                <div class="fs-1 text-primary mb-2"><i class="bi bi-question-circle-fill"></i></div>
                <h5 class="fw-bold text-dark mb-2">${titulo}</h5>
                <p class="small text-muted mb-4">${mensaje}</p>
                <div class="d-flex justify-content-center gap-2">
                    <button type="button" id="btnCancelarConfirm" class="btn btn-outline-secondary btn-sm px-4">Cancelar</button>
                    <button type="button" id="btnAceptarConfirm" class="btn ${claseBoton} btn-sm px-4">${textoConfirmar}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("btnCancelarConfirm").addEventListener("click", function () {
            cerrarModal("modalConfirmacionSolicitud");
        });
        document.getElementById("btnAceptarConfirm").addEventListener("click", function () {
            cerrarModal("modalConfirmacionSolicitud");
            onConfirmar();
        });
    }

    // 3. Modal de resultado final (Éxito o Rechazada)
    function mostrarModalResultado({ iconoHtml, titulo, mensaje, redirigir }) {
        cerrarModal("modalResultadoSolicitud");
        const overlay = document.createElement("div");
        overlay.id = "modalResultadoSolicitud";
        overlay.className = "fyag-modal-overlay";
        overlay.innerHTML = `
            <div class="fyag-modal-box">
                <div class="fs-1 mb-2">${iconoHtml}</div>
                <h5 class="fw-bold text-dark mb-2">${titulo}</h5>
                <p class="small text-muted mb-4">${mensaje}</p>
                <button type="button" id="btnCerrarResultado" class="btn btn-fyag btn-sm w-100 py-2">
                    Volver a Solicitudes
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("btnCerrarResultado").addEventListener("click", function () {
            cerrarModal("modalResultadoSolicitud");
            if (redirigir && urlVolver) {
                window.location.href = urlVolver;
            }
        });
    }

    // 4. Envío al backend Django para persistir en BD
    async function procesarSolicitud(accion) {
        const inputCantidad = document.querySelector(".input-cant-aprobar");
        const cantidadAprobar = inputCantidad ? inputCantidad.value : "";
        const observacion = obsInput ? obsInput.value.trim() : "";

        try {
            const resp = await fetch(urlEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({
                    solicitud_id: solicitudId,
                    accion: accion,
                    cantidad_aprobar: cantidadAprobar,
                    observacion: observacion,
                }),
            });

            const data = await resp.json();
            if (!resp.ok || !data.ok) {
                mostrarModalResultado({
                    iconoHtml: '<i class="bi bi-exclamation-triangle-fill text-warning"></i>',
                    titulo: "No se pudo completar la acción",
                    mensaje: data.error || "Ocurrió un problema al procesar la solicitud.",
                    redirigir: false,
                });
                return;
            }

            // Actualizar badge superior ("Pendiente de Aprobación" -> "Aprobada y Despachada" o "Rechazada")
            if (badge && data.badge_texto && data.badge_clase) {
                badge.className = data.badge_clase;
                badge.textContent = data.badge_texto;
            }

            if (data.stock_actualizado !== undefined) {
                const celdaStock = document.getElementById("celdaStockBodega");
                const unidad = celdaStock ? celdaStock.dataset.unidad || "" : "";
                if (celdaStock) {
                    celdaStock.textContent = `${data.stock_actualizado} ${unidad}`.trim();
                }
            }

            if (accion === "aprobar") {
                mostrarModalResultado({
                    iconoHtml: '<i class="bi bi-check-circle-fill text-success"></i>',
                    titulo: "¡Solicitud Aprobada con Éxito!",
                    mensaje: "La solicitud fue aprobada, el stock se rebajó del Cardex y el estado quedó actualizado.",
                    redirigir: true,
                });
            } else {
                mostrarModalResultado({
                    iconoHtml: '<i class="bi bi-x-circle-fill text-danger"></i>',
                    titulo: "Esta solicitud ha sido rechazada",
                    mensaje: "La solicitud quedó marcada como rechazada con su observación correspondiente.",
                    redirigir: true,
                });
            }
        } catch (err) {
            mostrarModalResultado({
                iconoHtml: '<i class="bi bi-wifi-off text-danger"></i>',
                titulo: "Error de conexión",
                mensaje: "No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.",
                redirigir: false,
            });
        }
    }

    if (btnAprobar) {
        btnAprobar.addEventListener("click", function () {
            mostrarModalConfirmacion({
                titulo: "¿Confirmar aprobación?",
                mensaje: "¿Desea aprobar esta solicitud de insumos y rebajar el stock del Cardex de bodega?",
                textoConfirmar: "Sí, aprobar",
                claseBoton: "btn-fyag",
                onConfirmar: function () {
                    procesarSolicitud("aprobar");
                },
            });
        });
    }

    if (btnRechazar) {
        btnRechazar.addEventListener("click", function () {
            if (!obsInput || obsInput.value.trim() === "") {
                mostrarModalResultado({
                    iconoHtml: '<i class="bi bi-info-circle-fill text-warning"></i>',
                    titulo: "Observación requerida",
                    mensaje: "Por favor, ingresa el motivo del rechazo en el campo de observación antes de rechazar.",
                    redirigir: false,
                });
                if (obsInput) obsInput.focus();
                return;
            }

            mostrarModalConfirmacion({
                titulo: "¿Confirmar rechazo?",
                mensaje: "¿Está seguro de que desea rechazar esta solicitud de insumos?",
                textoConfirmar: "Sí, rechazar",
                claseBoton: "btn-danger",
                onConfirmar: function () {
                    procesarSolicitud("rechazar");
                },
            });
        });
    }
});