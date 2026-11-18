/* =================================================
   Filtros, Búsqueda Rápida, Contadores y Limpiar/Restaurar - Auditoría de Obras
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
    const btnRestaurar = document.getElementById("btnRestaurarAuditoria");

    const badgeTodas = document.getElementById("badgeTodas");
    const badgeEnProceso = document.getElementById("badgeEnProceso");
    const badgePendientes = document.getElementById("badgePendientes");
    const badgeAprobadas = document.getElementById("badgeAprobadas");

    let filtroActivo = "todas";

    function obtenerFilas() {
        return Array.from(document.querySelectorAll("#tbodyAuditoria tr.fila-auditoria"));
    }

    function actualizarBadges() {
        const filas = obtenerFilas();
        let enProceso = 0;
        let pendientes = 0;
        let aprobadas = 0;

        filas.forEach((fila) => {
            const cat = (fila.dataset.categoria || "").trim();
            if (cat === "en_proceso") enProceso++;
            else if (cat === "aprobadas") aprobadas++;
            else pendientes++;
        });

        if (badgeTodas) badgeTodas.textContent = String(filas.length);
        if (badgeEnProceso) badgeEnProceso.textContent = String(enProceso);
        if (badgePendientes) badgePendientes.textContent = String(pendientes);
        if (badgeAprobadas) badgeAprobadas.textContent = String(aprobadas);
    }

    function sincronizarSelectAll() {
        if (!checkSelectAll) return;
        const visibles = obtenerFilas().filter((f) => f.style.display !== "none");
        if (visibles.length === 0) {
            checkSelectAll.checked = false;
            return;
        }
        checkSelectAll.checked = visibles.every((f) => {
            const cb = f.querySelector(".check-auditoria");
            return cb && cb.checked;
        });
    }

    function aplicarFiltros() {
        const filas = obtenerFilas();
        const texto = (inputBuscador ? inputBuscador.value : "").trim().toLowerCase();
        let visibles = 0;

        filas.forEach((fila) => {
            const cat = (fila.dataset.categoria || "").trim();
            const contenido = (fila.dataset.busqueda || fila.textContent || "").toLowerCase();

            const coincideEstado = filtroActivo === "todas" || cat === filtroActivo;
            const coincideTexto = texto === "" || contenido.includes(texto);

            const mostrar = coincideEstado && coincideTexto;
            fila.style.display = mostrar ? "" : "none";
            if (mostrar) visibles++;
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
        sincronizarSelectAll();
    }

    botonesFiltro.forEach((btn) => {
        btn.addEventListener("click", function () {
            botonesFiltro.forEach((b) => {
                b.classList.remove("text-white");
                b.classList.add("btn-outline-secondary");
                b.style.backgroundColor = "";
            });
            this.classList.remove("btn-outline-secondary");
            this.classList.add("text-white");
            this.style.backgroundColor = "#424571";

            filtroActivo = (this.dataset.filtro || "todas").trim();
            aplicarFiltros();
        });
    });

    if (inputBuscador) {
        inputBuscador.addEventListener("input", aplicarFiltros);
    }

    if (checkSelectAll) {
        checkSelectAll.addEventListener("change", function () {
            obtenerFilas().forEach((fila) => {
                if (fila.style.display !== "none") {
                    const cb = fila.querySelector(".check-auditoria");
                    if (cb) cb.checked = checkSelectAll.checked;
                }
            });
        });
    }

    document.addEventListener("change", function (e) {
        if (e.target.classList && e.target.classList.contains("check-auditoria")) {
            sincronizarSelectAll();
        }
    });

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", function () {
            const seleccionadas = Array.from(document.querySelectorAll(".check-auditoria:checked"));
            if (seleccionadas.length === 0) {
                mostrarAlertaSeleccionAuditoria("Seleccione al menos una obra en la tabla antes de presionar Limpiar.");
                return;
            }

            const ids = seleccionadas.map((cb) => cb.value);
            const urlLimpiar = btnLimpiar.dataset.urlLimpiar;

            mostrarConfirmacionLimpiarAuditoria(
                `¿Desea quitar ${ids.length} obra(s) seleccionada(s) de esta pantalla? No se eliminarán del historial y podrá volver a verlas en el historial completo.`,
                async function () {
                    const resp = await fetch(urlLimpiar, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": obtenerCsrfToken(),
                        },
                        body: JSON.stringify({ accion: "limpiar", ids }),
                    });
                    const data = await resp.json();
                    if (!resp.ok || !data.ok) {
                        mostrarAlertaSeleccionAuditoria(data.error || "No se pudieron limpiar las obras.");
                        return;
                    }
                    window.location.reload();
                }
            );
        });
    }

    if (btnRestaurar) {
        btnRestaurar.addEventListener("click", async function () {
            const urlRestaurar = btnRestaurar.dataset.urlRestaurar;
            const resp = await fetch(urlRestaurar, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": obtenerCsrfToken(),
                },
                body: JSON.stringify({ accion: "restaurar" }),
            });
            const data = await resp.json();
            if (resp.ok && data.ok) {
                window.location.href = window.location.pathname;
            }
        });
    }

    actualizarBadges();
    aplicarFiltros();
});