/* =================================================
   Filtros, Búsqueda Rápida, Limpieza y KPIs - Solicitudes de Insumos
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const tabs = Array.from(document.querySelectorAll(".tab-filtro"));
    const buscador = document.getElementById("buscadorSolicitudes");
    const filtroPrioridad = document.getElementById("filtroPrioridad");
    const filaSinResultados = document.getElementById("filaSinResultadosSolicitudes");
    const textoSinResultados = document.getElementById("textoSinResultadosSolicitudes");

    const kpiPendientes = document.getElementById("kpiPendientes");
    const kpiUrgentesSinStock = document.getElementById("kpiUrgentesSinStock");
    const kpiAprobadas = document.getElementById("kpiAprobadas");

    const selectAll = document.getElementById("selectAllSolicitudes");
    const btnLimpiar = document.getElementById("btnLimpiarSolicitudes");
    const btnRestaurar = document.getElementById("btnRestaurarSolicitudes");
    const csrfInput = document.querySelector("[name=csrfmiddlewaretoken]");
    const csrfToken = csrfInput ? csrfInput.value : "";

    let estadoActivo = "todas";

    function obtenerFilas() {
        return Array.from(document.querySelectorAll("#tablaSolicitudes tbody tr.fila-solicitud"));
    }

    function actualizarKPIs() {
        const filas = obtenerFilas();
        let pendientes = 0;
        let urgentesSinStock = 0;
        let aprobadas = 0;

        filas.forEach((fila) => {
            const estado = (fila.dataset.estado || "").trim().toLowerCase();
            const prioridad = (fila.dataset.prioridad || "").trim().toLowerCase();
            const urgente = fila.dataset.urgente === "1" || prioridad === "alta";

            if (estado === "pendiente") pendientes++;
            else if (estado === "aprobada") aprobadas++;

            if (urgente && estado !== "aprobada") urgentesSinStock++;
        });

        if (kpiPendientes) kpiPendientes.textContent = String(pendientes);
        if (kpiUrgentesSinStock) kpiUrgentesSinStock.textContent = String(urgentesSinStock);
        if (kpiAprobadas) kpiAprobadas.textContent = String(aprobadas);
    }

    function sincronizarSelectAll() {
        if (!selectAll) return;
        const visibles = obtenerFilas().filter((f) => f.style.display !== "none");
        if (visibles.length === 0) {
            selectAll.checked = false;
            return;
        }
        selectAll.checked = visibles.every((f) => {
            const cb = f.querySelector(".check-solicitud");
            return cb && cb.checked;
        });
    }

    function filtrarTabla() {
        const filas = obtenerFilas();
        const texto = (buscador ? buscador.value : "").trim().toLowerCase();
        const prioridad = filtroPrioridad ? filtroPrioridad.value : "";
        let visibles = 0;

        filas.forEach((fila) => {
            const estadoFila = (fila.dataset.estado || "").trim().toLowerCase();
            const prioridadFila = (fila.dataset.prioridad || "").trim();
            const contenidoFila = (fila.dataset.busqueda || fila.textContent || "").toLowerCase();

            const coincideEstado = estadoActivo === "todas" || estadoFila === estadoActivo;
            const coincideTexto = texto === "" || contenidoFila.includes(texto);
            const coincidePrioridad = prioridad === "" || prioridadFila === prioridad;

            const mostrar = coincideEstado && coincideTexto && coincidePrioridad;
            fila.style.display = mostrar ? "" : "none";
            if (mostrar) visibles++;
        });

        if (filaSinResultados) {
            if (visibles === 0) {
                filaSinResultados.style.display = "";
                if (textoSinResultados) {
                    textoSinResultados.textContent =
                        filas.length === 0
                            ? "No hay solicitudes de insumos registradas en esta vista."
                            : "No se encontraron solicitudes que coincidan con el filtro o búsqueda.";
                }
            } else {
                filaSinResultados.style.display = "none";
            }
        }
        sincronizarSelectAll();
    }

    function mostrarModalConfirmacion({ titulo, mensaje, textoConfirmar, onConfirmar }) {
        const previo = document.getElementById("modal-confirmacion-solicitudes");
        if (previo) previo.remove();

        const overlay = document.createElement("div");
        overlay.id = "modal-confirmacion-solicitudes";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.55); display: flex;
            align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        `;

        overlay.innerHTML = `
            <div style="background: #fff; border-radius: 14px; padding: 24px 22px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size: 40px; margin-bottom: 8px;">🧹</div>
                <h5 style="margin: 0 0 8px 0; color: #2e3252; font-weight: 700;">${titulo}</h5>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.45;">${mensaje}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button type="button" id="btnCancelarModalSol" style="flex: 1; min-height: 38px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="button" id="btnAceptarModalSol" style="flex: 1; min-height: 38px; background: #373b6e; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        ${textoConfirmar}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById("btnCancelarModalSol").onclick = () => overlay.remove();
        document.getElementById("btnAceptarModalSol").onclick = async () => {
            overlay.remove();
            if (onConfirmar) await onConfirmar();
        };
    }

    function mostrarModalAlerta(titulo, mensaje) {
        const previo = document.getElementById("modal-confirmacion-solicitudes");
        if (previo) previo.remove();

        const overlay = document.createElement("div");
        overlay.id = "modal-confirmacion-solicitudes";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.55); display: flex;
            align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        `;

        overlay.innerHTML = `
            <div style="background: #fff; border-radius: 14px; padding: 24px 22px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size: 38px; margin-bottom: 8px;">⚠️</div>
                <h5 style="margin: 0 0 8px 0; color: #2e3252; font-weight: 700;">${titulo}</h5>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">${mensaje}</p>
                <button type="button" id="btnCerrarAlertaSol" style="width: 100%; min-height: 38px; background: #373b6e; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Entendido
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById("btnCerrarAlertaSol").onclick = () => overlay.remove();
    }

    if (selectAll) {
        selectAll.addEventListener("change", function () {
            obtenerFilas().forEach((fila) => {
                if (fila.style.display !== "none") {
                    const cb = fila.querySelector(".check-solicitud");
                    if (cb) cb.checked = selectAll.checked;
                }
            });
        });
    }

    document.addEventListener("change", function (e) {
        if (e.target.classList && e.target.classList.contains("check-solicitud")) {
            sincronizarSelectAll();
        }
    });

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", function () {
            const seleccionadas = Array.from(document.querySelectorAll(".check-solicitud:checked"));
            if (seleccionadas.length === 0) {
                mostrarModalAlerta(
                    "Ninguna solicitud seleccionada",
                    "Seleccione al menos una solicitud en la tabla antes de presionar Limpiar."
                );
                return;
            }

            const ids = seleccionadas.map((cb) => cb.value);
            const urlLimpiar = btnLimpiar.dataset.urlLimpiar;

            mostrarModalConfirmacion({
                titulo: "Limpiar solicitudes de la vista",
                mensaje: `¿Desea quitar ${ids.length} solicitud(es) seleccionada(s) de esta pantalla? No se eliminarán de la base de datos y podrá consultarlas en el historial completo.`,
                textoConfirmar: "Sí, limpiar",
                onConfirmar: async () => {
                    const resp = await fetch(urlLimpiar, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken,
                        },
                        body: JSON.stringify({ accion: "limpiar", ids }),
                    });
                    const data = await resp.json();
                    if (!resp.ok || !data.ok) {
                        mostrarModalAlerta("No se pudo limpiar", data.error || "Intente nuevamente.");
                        return;
                    }
                    window.location.reload();
                },
            });
        });
    }

    if (btnRestaurar) {
        btnRestaurar.addEventListener("click", async function () {
            const urlRestaurar = btnRestaurar.dataset.urlRestaurar;
            const resp = await fetch(urlRestaurar, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({ accion: "restaurar" }),
            });
            const data = await resp.json();
            if (resp.ok && data.ok) {
                window.location.href = window.location.pathname;
            }
        });
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", function (e) {
            e.preventDefault();
            tabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");
            estadoActivo = (this.dataset.estado || "todas").trim().toLowerCase();
            filtrarTabla();
            this.blur();
        });
    });

    if (buscador) {
        buscador.addEventListener("input", filtrarTabla);
    }

    if (filtroPrioridad) {
        filtroPrioridad.addEventListener("change", filtrarTabla);
    }

    actualizarKPIs();
    filtrarTabla();
});