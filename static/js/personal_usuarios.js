/* =================================================
   Filtros y Buscador Rápido - Personal y Usuarios
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const botonesFiltro = document.querySelectorAll(".btn-filtro-usuario");
    const inputBuscador = document.getElementById("buscadorUsuarios");
    const filasUsuarios = document.querySelectorAll(".fila-usuario");
    const filaSinResultados = document.getElementById("filaSinResultados");
    const textoSinResultados = document.getElementById("textoSinResultados");
    const checkSelectAll = document.getElementById("selectAll");

    let filtroActual = "todos";

    function aplicarFiltros() {
        const termino = (inputBuscador ? inputBuscador.value : "").trim().toLowerCase();
        let visibles = 0;

        filasUsuarios.forEach((fila) => {
            const categoria = fila.dataset.categoria || "";
            const textoFila = fila.dataset.busqueda || "";

            const coincideRol = filtroActual === "todos" || categoria === filtroActual;
            const coincideBusqueda = termino === "" || textoFila.includes(termino);

            if (coincideRol && coincideBusqueda) {
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
                        filasUsuarios.length === 0
                            ? "No hay personal o usuarios registrados actualmente."
                            : "No se encontraron usuarios que coincidan con el filtro o búsqueda.";
                }
            } else {
                filaSinResultados.style.display = "none";
            }
        }
    }

    botonesFiltro.forEach((boton) => {
        boton.addEventListener("click", function () {
            filtroActual = this.dataset.filtro || "todos";

            botonesFiltro.forEach((b) => {
                b.classList.remove("text-white");
                b.classList.add("btn-outline-secondary");
                b.style.backgroundColor = "";
            });

            this.classList.remove("btn-outline-secondary");
            this.classList.add("text-white");
            this.style.backgroundColor = "#343769";

            aplicarFiltros();
        });
    });

    if (inputBuscador) {
        inputBuscador.addEventListener("input", aplicarFiltros);
    }

    if (checkSelectAll) {
        checkSelectAll.addEventListener("change", function () {
            const checks = document.querySelectorAll(".check-usuario");
            checks.forEach((c) => {
                c.checked = checkSelectAll.checked;
            });
        });
    }
});