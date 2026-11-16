/* =================================================
   Filtros, Búsqueda Rápida y KPIs Dinámicos - Solicitudes de Insumos
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

        if (kpiPendientes && kpiPendientes.textContent !== String(pendientes)) {
            kpiPendientes.textContent = String(pendientes);
        }
        if (kpiUrgentesSinStock && kpiUrgentesSinStock.textContent !== String(urgentesSinStock)) {
            kpiUrgentesSinStock.textContent = String(urgentesSinStock);
        }
        if (kpiAprobadas && kpiAprobadas.textContent !== String(aprobadas)) {
            kpiAprobadas.textContent = String(aprobadas);
        }
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
            const displayActual = fila.style.display;
            const displayDeseado = mostrar ? "" : "none";

            if (displayActual !== displayDeseado) {
                fila.style.display = displayDeseado;
            }
            if (mostrar) visibles++;
        });

        if (filaSinResultados) {
            if (visibles === 0) {
                if (filaSinResultados.style.display !== "") {
                    filaSinResultados.style.display = "";
                }
                if (textoSinResultados) {
                    const mensaje =
                        filas.length === 0
                            ? "No hay solicitudes de insumos registradas."
                            : "No se encontraron solicitudes que coincidan con el filtro o búsqueda.";
                    if (textoSinResultados.textContent !== mensaje) {
                        textoSinResultados.textContent = mensaje;
                    }
                }
            } else if (filaSinResultados.style.display !== "none") {
                filaSinResultados.style.display = "none";
            }
        }
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