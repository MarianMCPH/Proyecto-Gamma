/* =================================================
   Filtros, Búsqueda Rápida, Contadores y Limpiar Selección - Auditoría de Obras
   ================================================= */

function crearOverlayAuditoria(id) {
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

function mostrarAlertaSeleccionAuditoria(mensaje) {
    const overlay = crearOverlayAuditoria("modal-aviso-seleccion-auditoria");
    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 42px; margin-bottom: 12px;">⚠️</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">Selección requerida</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <button type="button" id="btn-aviso-auditoria-ok" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Aceptar</button>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-aviso-auditoria-ok").onclick = function () {
        overlay.remove();
    };
}

function mostrarConfirmacionLimpiarAuditoria(mensaje, onConfirmar) {
    const overlay = crearOverlayAuditoria("modal-confirmar-limpiar-auditoria");
    const contenido = document.createElement("div");
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
        width: 100%; max-width: 360px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 12px;">❓</div>
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">Confirmar acción</h4>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <div style="display: flex; gap: 10px;">
            <button type="button" id="btn-limpiar-no" style="flex: 1; min-height: 44px; background-color: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">No</button>
            <button type="button" id="btn-limpiar-si" style="flex: 1; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Sí</button>
        </div>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById("btn-limpiar-no").onclick = function () {
        overlay.remove();
    };

    document.getElementById("btn-limpiar-si").onclick = function () {
        overlay.remove();
        onConfirmar();
    };
}

function obtenerCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

document.addEventListener("DOMContentLoaded", function () {
    const botonesFiltro = document.querySelectorAll(".btn-filtro-auditoria");
    const inputBuscador = document.getElementById("buscadorAuditoria");
    const filaSinResultados = document.getElementById("filaSinResultadosAuditoria");
    const textoSinResultados = document.getElementById("textoSinResultadosAuditoria");
    const checkSelectAll = document.getElementById("selectAllAuditoria");
    const btnLimpiar = document.getElementById("btnLimpiarAuditoria");

    const badgeTodas = document.getElementById("badgeTodas");
    const badgeEnProceso = document.getElementById("badgeEnProceso");
    const badgePendientes = document.getElementById("badgePendientes");
    const badgeAprobadas = document.getElementById("badgeAprobadas");

    let filtroActual = "todas";

    function obtenerFilas() {
        return document.querySelectorAll(".fila-auditoria");
    }

    function actualizarContadores() {
        const filas = obtenerFilas();
        let total = 0;
        let enProceso = 0;
        let pendientes = 0;
        let aprobadas = 0;

        filas.forEach((fila) => {
            total++;
            const categoria = fila.dataset.categoria || "";
            if (categoria === "en_proceso") enProceso++;
            else if (categoria === "aprobadas") aprobadas++;
            else pendientes++;
        });

        if (badgeTodas) badgeTodas.textContent = total;
        if (badgeEnProceso) badgeEnProceso.textContent = enProceso;
        if (badgePendientes) badgePendientes.textContent = pendientes;
        if (badgeAprobadas) badgeAprobadas.textContent = aprobadas;
    }

    function aplicarFiltros() {
        const filas = obtenerFilas();
        const termino = (inputBuscador ? inputBuscador.value : "").trim().toLowerCase();
        let visibles = 0;

        filas.forEach((fila) => {
            const categoria = fila.dataset.categoria || "";
            const textoFila = fila.dataset.busqueda || "";

            const coincideEstado = filtroActual === "todas" || categoria === filtroActual;
            const coincideBusqueda = termino === "" || textoFila.includes(termino);

            if (coincideEstado && coincideBusqueda) {
                fila.style.display = "";
                visibles++;
            } else {
                fila.style.display = "none";
            }
        });

        if (filaSinResultados) {
            if (visibles === 0) {
                filaSinResultados.style.display = "";
                if (textoSinResultados) {
                    textoSinResultados.textContent =
                        filas.length === 0
                            ? "No hay obras registradas para auditar."
                            : "No se encontraron obras que coincidan con el filtro o búsqueda.";
                }
            } else {
                filaSinResultados.style.display = "none";
            }
        }
    }

    botonesFiltro.forEach((boton) => {
        boton.addEventListener("click", function () {
            filtroActual = this.dataset.filtro || "todas";

            botonesFiltro.forEach((b) => {
                b.classList.remove("text-white");
                b.classList.add("btn-outline-secondary");
                b.style.backgroundColor = "";
            });

            this.classList.remove("btn-outline-secondary");
            this.classList.add("text-white");
            this.style.backgroundColor = "#424571";

            aplicarFiltros();
        });
    });

    if (inputBuscador) {
        inputBuscador.addEventListener("input", aplicarFiltros);
    }

    if (checkSelectAll) {
        checkSelectAll.addEventListener("change", function () {
            document.querySelectorAll(".check-auditoria").forEach((c) => {
                c.checked = checkSelectAll.checked;
            });
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", function () {
            const seleccionados = Array.from(document.querySelectorAll(".check-auditoria:checked"));

            if (seleccionados.length === 0) {
                mostrarAlertaSeleccionAuditoria("Para quitar obras primero debe seleccionar al menos una obra.");
                return;
            }

            mostrarConfirmacionLimpiarAuditoria("¿Quieres eliminar estas obras de aquí?", function () {
                const urlLimpiar = btnLimpiar.getAttribute("data-url-limpiar");
                const ids = seleccionados.map((chk) => chk.value);

                fetch(urlLimpiar, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": obtenerCsrfToken(),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify({ ids: ids }),
                })
                    .then(async (response) => {
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok || !data.ok) {
                            throw new Error(data.error || "No se pudieron quitar las obras seleccionadas.");
                        }

                        seleccionados.forEach((chk) => {
                            const fila = chk.closest(".fila-auditoria");
                            if (fila) fila.remove();
                        });

                        if (checkSelectAll) checkSelectAll.checked = false;
                        actualizarContadores();
                        aplicarFiltros();
                    })
                    .catch((error) => {
                        mostrarAlertaSeleccionAuditoria(error.message || "Error al comunicar con el servidor.");
                    });
            });
        });
    }

    actualizarContadores();
});