
document.addEventListener("DOMContentLoaded", function () {

    // Obtener la dirección de regreso desde el HTML
    const contenedor = document.getElementById('contenedorSolicitudes');
    const urlDestino = contenedor.dataset.urlVolver;

    // Buscar todos los botones Ver
    const botonesVer = document.querySelectorAll('.btn-ver-detalle');

    botonesVer.forEach(boton => {

        boton.addEventListener('click', function () {

            // Obtener los datos de la solicitud
            const numSolicitud = this.getAttribute('data-solicitud');
            const cliente = this.getAttribute('data-cliente');
            const tecnico = this.getAttribute('data-tecnico');
            const descripcion = this.getAttribute('data-descripcion');
            const disponibilidad = this.getAttribute('data-disponibilidad');
            const imgUrl = this.getAttribute('data-img');

            // Eliminar modal anterior si existe
            const modalPrevio = document.getElementById('modal-detalle-solicitud');

            if (modalPrevio) {
                modalPrevio.remove();
            }

            // Crear contenedor principal del modal
            const overlay = document.createElement('div');
            overlay.id = 'modal-detalle-solicitud';

            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 16px;
                box-sizing: border-box;
                font-family: system-ui, -apple-system, sans-serif;
            `;

            // Crear caja interna del modal
            const contenido = document.createElement('div');

            contenido.style.cssText = `
                background-color: #ffffff;
                border-radius: 16px;
                padding: 30px;
                width: 100%;
                max-width: 600px;
                position: relative;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            `;

            // Contenido del modal
            contenido.innerHTML = `
                <button id="cerrar-modal-solicitud"
                    style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; font-size: 26px; cursor: pointer; color: #333; font-weight: bold;">
                    &times;
                </button>

                <h4 style="margin: 0 0 20px 0; font-size: 20px; color: #2e3252; font-weight: 700; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                    Detalle de Solicitud
                </h4>

                <div style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">

                    <p style="margin-bottom: 8px;">
                        <strong>Solicitud:</strong> N° ${numSolicitud}
                        &nbsp;|&nbsp;
                        <strong>Cliente:</strong> ${cliente}
                    </p>

                    <p style="margin-bottom: 12px;">
                        <strong>Técnico Solicitante:</strong> ${tecnico}
                    </p>

                    <div style="background-color: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">

                        <div>
                            <strong style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                                EVIDENCIA TÉCNICA
                            </strong>

                            <img id="img-evidencia-modal"
                                src="${imgUrl}"
                                alt="Evidencia técnica"
                                style="width: 90px; height: 65px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #d1d5db;"
                                title="Haz clic para ampliar">
                        </div>

                        <div style="font-size: 13px;">
                            <span style="color: #2563eb; cursor: pointer; font-weight: 600;">
                                🔍 Haz clic en la foto para ampliar vista previa
                            </span>
                        </div>

                    </div>

                    <p style="margin-bottom: 8px;">
                        <strong>Diagnóstico / Descripción:</strong> ${descripcion}
                    </p>

                    <p style="margin-bottom: 0;">
                        <strong>Disponibilidad en Bodega:</strong>
                        <span style="color: #059669; font-weight: 600;">
                            ${disponibilidad}
                        </span>
                    </p>

                </div>

                <!-- Botones de acción -->
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #eee; padding-top: 16px;">

                    <button id="btn-rechazar-solicitud"
                        style="padding: 8px 20px; background-color: #F87171; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Rechazar
                    </button>

                    <button id="btn-aprobar-solicitud"
                        style="padding: 8px 20px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Aprobar
                    </button>

                </div>
            `;

            overlay.appendChild(contenido);
            document.body.appendChild(overlay);

            // Cerrar modal con la X o haciendo clic fuera
            const cerrarModal = () => {
                overlay.remove();
            };

            document.getElementById('cerrar-modal-solicitud').onclick = cerrarModal;

            overlay.onclick = function (e) {
                if (e.target === overlay) {
                    cerrarModal();
                }
            };

            // Botón Aprobar
            document.getElementById('btn-aprobar-solicitud').onclick = function () {

                // Cerrar modal de detalle
                overlay.remove();

                // Crear modal de éxito
                const successOverlay = document.createElement('div');

                successOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 16px;
                    box-sizing: border-box;
                    font-family: system-ui, -apple-system, sans-serif;
                `;

                const successContent = document.createElement('div');

                successContent.style.cssText = `
                    background-color: #ffffff;
                    border-radius: 16px;
                    padding: 28px 20px;
                    width: 100%;
                    max-width: 360px;
                    text-align: center;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                `;

                successContent.innerHTML = `
                    <div style="font-size: 48px; color: #10B981; margin-bottom: 12px;">
                        ✅
                    </div>

                    <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">
                        ¡Aprobado con éxito!
                    </h4>

                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                        La solicitud de insumos ha sido aprobada correctamente.
                    </p>

                    <button id="btn-modal-volver"
                        style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Volver
                    </button>
                `;

                successOverlay.appendChild(successContent);
                document.body.appendChild(successOverlay);

                // Volver al listado de solicitudes
                document.getElementById('btn-modal-volver').onclick = function () {
                    window.location.href = urlDestino;
                };

            };

            // Botón Rechazar
            document.getElementById('btn-rechazar-solicitud').onclick = function () {

                alert("Solicitud rechazada.");

                overlay.remove();

            };

            // Ampliar imagen de evidencia
            const imgEvidencia = document.getElementById('img-evidencia-modal');

            imgEvidencia.onclick = function () {

                const zoomOverlay = document.createElement('div');

                zoomOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10050;
                    padding: 20px;
                `;

                zoomOverlay.innerHTML = `
                    <div style="position: relative; max-width: 90%; max-height: 90%;">

                        <button id="cerrar-zoom-solicitud"
                            style="position: absolute; top: -45px; right: 0; background: transparent; border: none; color: #ffffff; font-size: 32px; cursor: pointer;">
                            &times;
                        </button>

                        <img src="${this.src}"
                            alt="Evidencia ampliada"
                            style="max-width: 100%; max-height: 85vh; border-radius: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.5);">

                    </div>
                `;

                document.body.appendChild(zoomOverlay);

                // Cerrar zoom con la X
                document.getElementById('cerrar-zoom-solicitud').onclick = function () {
                    zoomOverlay.remove();
                };

                // Cerrar zoom haciendo clic fuera de la imagen
                zoomOverlay.onclick = function (e) {
                    if (e.target === zoomOverlay) {
                        zoomOverlay.remove();
                    }
                };

            };

        });

    });

});
