/* =================================================
   Script para Auditoría de Obra (Barra Avance, Zoom, Guardado BD y Modal Éxito)
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {

    // Evitar caché de historial del navegador al volver atrás
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    // --- 0. Aplicar porcentaje de avance desde data-attribute ---
    const barraAvance = document.querySelector(".avance-barra-fill");
    if (barraAvance && barraAvance.dataset.avance) {
        barraAvance.style.width = `${barraAvance.dataset.avance}%`;
    }

    // --- 1. Funcionalidad de Zoom para Imágenes de Evidencia y Firma ---
    const imagenes = document.querySelectorAll(".img-zoomable");

    imagenes.forEach(img => {
        img.addEventListener("click", function () {
            if (!this.src || this.src.endsWith("#")) return;

            const modalImg = document.createElement("div");
            modalImg.id = "modal-imagen-zoom";
            modalImg.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.8); display: flex;
                align-items: center; justify-content: center; z-index: 10000; padding: 20px;
            `;

            modalImg.innerHTML = `
                <div style="position: relative; max-width: 90%; max-height: 90%;">
                    <button id="cerrar-zoom" style="position: absolute; top: -40px; right: 0; background: transparent; border: none; color: #ffffff; font-size: 32px; cursor: pointer;">&times;</button>
                    <img src="${this.src}" style="max-width: 100%; max-height: 85vh; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); background: #fff;">
                </div>
            `;

            document.body.appendChild(modalImg);

            document.getElementById("cerrar-zoom").onclick = () => modalImg.remove();
            modalImg.onclick = (e) => {
                if (e.target === modalImg) modalImg.remove();
            };
        });
    });

    // --- 2. Aprobar Obra en BD y Modal de Éxito ---
    const wrapper = document.getElementById("auditarObraWrapper");
    const btnAprobar = document.getElementById("btnAprobarObra");
    const textoEstado = document.getElementById("textoEstadoAuditoria");
    const csrfInput = document.querySelector("[name=csrfmiddlewaretoken]");
    const csrfToken = csrfInput ? csrfInput.value : "";

    function mostrarModalMensaje({ icono, titulo, mensaje, urlRedireccion }) {
        const modalExistente = document.getElementById("pwa-success-modal");
        if (modalExistente) modalExistente.remove();

        const overlay = document.createElement("div");
        overlay.id = "pwa-success-modal";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.6); display: flex;
            align-items: center; justify-content: center; z-index: 9999; padding: 16px;
            box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;
        `;

        const contenido = document.createElement("div");
        contenido.style.cssText = `
            background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
            width: 100%; max-width: 360px; text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        `;

        contenido.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">${icono}</div>
            <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">${titulo}</h4>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
            <button id="btn-modal-volver" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Volver</button>
        `;

        overlay.appendChild(contenido);
        document.body.appendChild(overlay);

        document.getElementById("btn-modal-volver").onclick = function () {
            if (urlRedireccion) {
                window.location.href = urlRedireccion;
            } else {
                overlay.remove();
            }
        };
    }

    if (btnAprobar && wrapper) {
        btnAprobar.addEventListener("click", async function () {
            const ordenId = wrapper.dataset.ordenId;
            const urlAprobar = wrapper.dataset.urlAprobar;
            const urlDestino = wrapper.dataset.urlVolver || btnAprobar.dataset.urlVolver;

            btnAprobar.disabled = true;

            try {
                const resp = await fetch(urlAprobar, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken,
                    },
                    body: JSON.stringify({ orden_id: ordenId }),
                });

                const data = await resp.json();

                if (!resp.ok || !data.ok) {
                    btnAprobar.disabled = false;
                    mostrarModalMensaje({
                        icono: "⚠️",
                        titulo: "No se pudo aprobar",
                        mensaje: data.error || "Ocurrió un problema al aprobar la obra.",
                        urlRedireccion: null,
                    });
                    return;
                }

                if (textoEstado) {
                    textoEstado.textContent = "Aprobada";
                    textoEstado.className = "text-success fw-bold";
                }
                btnAprobar.textContent = "Obra Aprobada";

                mostrarModalMensaje({
                    icono: "✔️",
                    titulo: "¡Obra Aprobada!",
                    mensaje: "La auditoría de la obra se ha completado y aprobado de forma exitosa.",
                    urlRedireccion: urlDestino,
                });
            } catch (err) {
                btnAprobar.disabled = false;
                mostrarModalMensaje({
                    icono: "❌",
                    titulo: "Error de conexión",
                    mensaje: "No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.",
                    urlRedireccion: null,
                });
            }
        });
    }
});