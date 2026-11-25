/* =================================================
   Validación, Confirmación, Presupuesto y Modales - Pantalla Nueva Orden
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

    // Cálculo automático de presupuesto (Kit del servicio + $500.000 extra)
    const COSTO_EXTRA_OBRA = 500000;
    const selectTipoServicio = document.getElementById("tipoServicio");
    const mensajeSinKit = document.getElementById("mensajeSinKit");
    const detalleKitPresupuesto = document.getElementById("detalleKitPresupuesto");
    const valorPresupuestoFinal = document.getElementById("valorPresupuestoFinal");
    const presupuestoFinalInput = document.getElementById("presupuestoFinalInput");
    const kitIdInput = document.getElementById("kitIdInput");
    const btnGuardarOrden = document.getElementById("btnGuardarNuevaOrden");

    let kitsPorServicio = {};
    const scriptKits = document.getElementById("datos-kits-servicio");
    if (scriptKits) {
        try {
            kitsPorServicio = JSON.parse(scriptKits.textContent || "{}");
        } catch (_) {
            kitsPorServicio = {};
        }
    }

    function formatearPesos(monto) {
        return "$" + Math.round(Number(monto) || 0).toLocaleString("es-CL");
    }

    function actualizarPresupuestoServicio() {
        if (!selectTipoServicio) return;
        const servicioSeleccionado = (selectTipoServicio.value || "").trim().toLowerCase();

        if (!servicioSeleccionado) {
            if (mensajeSinKit) mensajeSinKit.classList.add("d-none");
            if (valorPresupuestoFinal) valorPresupuestoFinal.textContent = "$0";
            if (presupuestoFinalInput) presupuestoFinalInput.value = "0";
            if (kitIdInput) kitIdInput.value = "";
            if (btnGuardarOrden) btnGuardarOrden.disabled = false;
            return;
        }

        const kitInfo = kitsPorServicio[servicioSeleccionado];

        if (!kitInfo) {
            if (mensajeSinKit) {
                mensajeSinKit.textContent = "No hay kits disponibles";
                mensajeSinKit.classList.remove("d-none");
            }
            if (detalleKitPresupuesto) {
                detalleKitPresupuesto.textContent = "Debe registrar un kit activo para este tipo de servicio antes de crear la obra.";
            }
            if (valorPresupuestoFinal) valorPresupuestoFinal.textContent = "$0";
            if (presupuestoFinalInput) presupuestoFinalInput.value = "0";
            if (kitIdInput) kitIdInput.value = "";
            if (btnGuardarOrden) btnGuardarOrden.disabled = true;
            return;
        }

        const totalKit = Number(kitInfo.total_kit) || 0;
        const presupuestoTotal = totalKit + COSTO_EXTRA_OBRA;

        if (mensajeSinKit) mensajeSinKit.classList.add("d-none");
        if (detalleKitPresupuesto) {
            detalleKitPresupuesto.textContent =
                `Kit "${kitInfo.nombre}" (${formatearPesos(totalKit)}) + Extra respaldo (${formatearPesos(COSTO_EXTRA_OBRA)})`;
        }
        if (valorPresupuestoFinal) valorPresupuestoFinal.textContent = formatearPesos(presupuestoTotal);
        if (presupuestoFinalInput) presupuestoFinalInput.value = String(presupuestoTotal);
        if (kitIdInput) kitIdInput.value = String(kitInfo.id);
        if (btnGuardarOrden) btnGuardarOrden.disabled = false;
    }

    if (selectTipoServicio) {
        selectTipoServicio.addEventListener("change", actualizarPresupuestoServicio);
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

        if (selectTipoServicio) {
            const servicioSel = (selectTipoServicio.value || "").trim().toLowerCase();
            if (!kitsPorServicio[servicioSel]) {
                if (mensajeSinKit) {
                    mensajeSinKit.textContent = "No hay kits disponibles";
                    mensajeSinKit.classList.remove("d-none");
                }
                return;
            }
        }

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
                    mostrarModalError(error.message || "Algo ocurrió con la conexión. Vuelva a intentarlo.");
                });
        });
    });
});