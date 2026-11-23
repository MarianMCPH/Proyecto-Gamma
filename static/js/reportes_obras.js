document.addEventListener("DOMContentLoaded", function () {
    const inputDesde = document.getElementById("reporteFechaDesde");
    const inputHasta = document.getElementById("reporteFechaHasta");
    const checks = Array.from(document.querySelectorAll(".check-opcion-reporte"));
    const btnGenerar = document.getElementById("btnGenerarReportePDF");
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";

    const modal = document.getElementById("visorReporteModal");
    const contenidoModal = document.getElementById("visorReporteContenido");
    const tituloModal = document.getElementById("visorReporteTitulo");
    const btnDescargar = document.getElementById("btnDescargarReporteModal");
    const btnCerrar = document.getElementById("btnCerrarVisorReporte");

    function cerrarModal() {
        if (!modal) return;
        modal.style.display = "none";
        if (contenidoModal) contenidoModal.innerHTML = "";
        document.body.style.overflow = "";
    }

    btnCerrar?.addEventListener("click", cerrarModal);
    modal?.addEventListener("click", function (e) {
        if (e.target === modal) cerrarModal();
    });
    btnDescargar?.addEventListener("click", function () {
        window.print();
    });

    document.querySelectorAll(".item-historial-reporte").forEach((item) => {
        item.addEventListener("click", async function () {
            const url = this.dataset.urlVer;
            if (!url) return;
            const resp = await fetch(url);
            const data = await resp.json();
            if (resp.ok && data.ok) {
                tituloModal.textContent = data.titulo;
                contenidoModal.innerHTML = data.html;
                modal.style.display = "flex";
                document.body.style.overflow = "hidden";
            }
        });
    });

    btnGenerar?.addEventListener("click", async function () {
        const fechaDesde = inputDesde?.value || "";
        const fechaHasta = inputHasta?.value || "";
        if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) {
            alert("Revise el rango de fechas Desde / Hasta.");
            return;
        }

        const opciones = {};
        checks.forEach((c) => {
            opciones[c.value] = c.checked;
        });

        if (!Object.values(opciones).some(Boolean)) {
            alert("Seleccione al menos una opción en Información incluida.");
            return;
        }

        btnGenerar.disabled = true;
        const resp = await fetch(btnGenerar.dataset.urlGenerar, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, opciones }),
        });
        const data = await resp.json();
        btnGenerar.disabled = false;

        if (!resp.ok || !data.ok) {
            alert(data.error || "No se pudo generar el reporte.");
            return;
        }

        window.location.reload();
    });
});