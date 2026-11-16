/* =================================================
   Filtros, Búsqueda Rápida y KPIs Dinámicos - Solicitudes de Insumos
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-filtro");
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
            const estado = (fila.dataset.estado || "").toLowerCase();
            const prioridad = (fila.dataset.prioridad || "").toLowerCase();
            const urgente = fila.dataset.urgente === "1" || prioridad === "alta";

            if (estado === "pendiente") pendientes++;
            else if (estado === "aprobada") aprobadas++;

            if (urgente && estado !== "aprobada") urgentesSinStock++;
        });

        if (kpiPendientes) kpiPendientes.textContent = pendientes;
        if (kpiUrgentesSinStock) kpiUrgentesSinStock.textContent = urgentesSinStock;
        if (kpiAprobadas) kpiAprobadas.textContent = aprobadas;
    }

    function filtrarTabla() {
        const filas = obtenerFilas();
        const texto = (buscador ? buscador.value : "").trim().toLowerCase();
        const prioridad = filtroPrioridad ? filtroPrioridad.value : "";
        let visibles = 0;

        filas.forEach((fila) => {
            const estadoFila = fila.dataset.estado || "";
            const prioridadFila = fila.dataset.prioridad || "";
            const contenidoFila = (fila.dataset.busqueda || fila.textContent || "").toLowerCase();

            const coincideEstado = estadoActivo === "todas" || estadoFila === estadoActivo;
            const coincideTexto = texto === "" || contenidoFila.includes(texto);
            const coincidePrioridad = prioridad === "" || prioridadFila === prioridad;

            if (coincideEstado && coincideTexto && coincidePrioridad) {
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
                            ? "No hay solicitudes de insumos registradas."
                            : "No se encontraron solicitudes que coincidan con el filtro o búsqueda.";
                }
            } else {
                filaSinResultados.style.display = "none";
            }
        }
    }

    // Observador para recalcular KPIs automáticamente si se agregan, modifican o quitan filas en el DOM
    const tbody = document.querySelector("#tablaSolicitudes tbody");
    if (tbody && typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(function () {
            actualizarKPIs();
            filtrarTabla();
        });
        observer.observe(tbody, { childList: true, subtree: true, attributes: true });
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            tabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");
            estadoActivo = (this.dataset.estado || "todas").trim().toLowerCase();
            filtrarTabla();
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