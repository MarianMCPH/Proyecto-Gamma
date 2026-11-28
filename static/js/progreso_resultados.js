/* =================================================
   Gráficos (Chart.js) y Filtros Dinámicos - Progreso y Resultados de Obras
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const btnActualizar = document.getElementById("btnActualizarProgreso");
    if (btnActualizar) {
        btnActualizar.addEventListener("click", function () {
            window.location.reload();
        });
    }

    // --- 0. Ancho de barra segmentada de distribución ---
    const barraSegmentada = document.querySelector(".barra-distribucion-segmentada");
    if (barraSegmentada) {
        const setAncho = (selector, attr) => {
            const el = barraSegmentada.querySelector(selector);
            const raw = (barraSegmentada.getAttribute(attr) || "0").replace(",", ".");
            const num = parseFloat(raw);
            if (el) {
                el.style.width = `${Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0}%`;
            }
        };

        setAncho(".seg-finalizadas", "data-pct-finalizadas");
        setAncho(".seg-ejecucion", "data-pct-ejecucion");
        setAncho(".seg-pendientes", "data-pct-pendientes");
        setAncho(".seg-canceladas", "data-pct-canceladas");
    }

    // --- 1. Gráfico de Dona (Distribución por estado) ---
    const canvasDona = document.getElementById("graficoDonaEstados");
    if (canvasDona && typeof Chart !== "undefined") {
        let valoresDona = [0, 0, 0, 0];
        try {
            valoresDona = JSON.parse(canvasDona.dataset.valores || "[0,0,0,0]");
        } catch (e) {
            valoresDona = [0, 0, 0, 0];
        }

        const totalSuma = valoresDona.reduce((acc, v) => acc + v, 0);
        const datosGrafico = totalSuma > 0 ? valoresDona : [1];
        const coloresGrafico = totalSuma > 0
            ? ["#2563eb", "#16a34a", "#eab308", "#dc2626"]
            : ["#e2e8f0"];

        new Chart(canvasDona, {
            type: "doughnut",
            data: {
                labels: totalSuma > 0
                    ? ["Finalizadas", "En ejecución", "Pendientes", "Canceladas"]
                    : ["Sin obras en el periodo"],
                datasets: [{
                    data: datosGrafico,
                    backgroundColor: coloresGrafico,
                    borderWidth: 2,
                    borderColor: "#ffffff",
                    hoverOffset: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "66%",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: totalSuma > 0,
                        callbacks: {
                            label: function (ctx) {
                                const val = ctx.parsed || 0;
                                const pct = totalSuma > 0 ? ((val / totalSuma) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${val} (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    // --- 2. Gráfico de Barras (Obras por periodo) ---
    const canvasBarras = document.getElementById("graficoBarrasPeriodo");
    if (canvasBarras && typeof Chart !== "undefined") {
        let labelsBarras = [];
        let valoresBarras = [];
        try {
            labelsBarras = JSON.parse(canvasBarras.dataset.labels || "[]");
            valoresBarras = JSON.parse(canvasBarras.dataset.valores || "[]");
        } catch (e) {
            labelsBarras = [];
            valoresBarras = [];
        }

        new Chart(canvasBarras, {
            type: "bar",
            data: {
                labels: labelsBarras,
                datasets: [{
                    label: "Obras",
                    data: valoresBarras,
                    backgroundColor: "#2563eb",
                    borderRadius: 6,
                    maxBarThickness: 36,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#475569", font: { size: 11, weight: "600" } },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            color: "#64748b",
                            font: { size: 11 },
                        },
                        grid: { color: "#f1f5f9" },
                    },
                },
            },
        });
    }

    // --- 3. Filtrado sincronizado entre Tarjetas KPI, Pestañas y Buscador ---
    const kpiCards = Array.from(document.querySelectorAll(".kpi-progreso-card"));
    const tabsEstado = Array.from(document.querySelectorAll(".btn-tab-estado"));
    const inputBuscador = document.getElementById("buscadorProgresoObras");
    const filasObras = Array.from(document.querySelectorAll(".fila-obra-progreso"));
    const filaSinResultados = document.getElementById("filaSinResultadosProgreso");

    let estadoSeleccionado = "todas";

    function filtrarListado() {
        const texto = (inputBuscador ? inputBuscador.value : "").trim().toLowerCase();
        let visibles = 0;

        filasObras.forEach((fila) => {
            const estadoFila = (fila.dataset.estado || "").trim();
            const contenido = (fila.dataset.busqueda || fila.textContent || "").toLowerCase();

            const coincideEstado = estadoSeleccionado === "todas" || estadoFila === estadoSeleccionado;
            const coincideTexto = texto === "" || contenido.includes(texto);

            const mostrar = coincideEstado && coincideTexto;
            fila.style.display = mostrar ? "" : "none";
            if (mostrar) visibles++;
        });

        if (filaSinResultados) {
            filaSinResultados.style.display = visibles === 0 ? "" : "none";
        }
    }

    function seleccionarEstado(nuevoEstado) {
        estadoSeleccionado = nuevoEstado;

        kpiCards.forEach((card) => {
            card.classList.toggle("activo", card.dataset.filtroEstado === nuevoEstado);
        });

        tabsEstado.forEach((tab) => {
            tab.classList.toggle("active", tab.dataset.estado === nuevoEstado);
        });

        filtrarListado();
    }

    kpiCards.forEach((card) => {
        card.addEventListener("click", function () {
            seleccionarEstado(this.dataset.filtroEstado || "todas");
        });
    });

    tabsEstado.forEach((tab) => {
        tab.addEventListener("click", function () {
            seleccionarEstado(this.dataset.estado || "todas");
        });
    });

    if (inputBuscador) {
        inputBuscador.addEventListener("input", filtrarListado);
    }
});