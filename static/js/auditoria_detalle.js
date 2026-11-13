/* =================================================
   Script para Auditoría de Obra (Zoom y Modal Éxito)
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    
    // --- 1. Funcionalidad de Zoom para Imágenes de Evidencia ---
    const imagenes = document.querySelectorAll('.img-zoomable');
    
    imagenes.forEach(img => {
        img.addEventListener('click', function () {
            // Crear contenedor modal de imagen
            const modalImg = document.createElement('div');
            modalImg.id = 'modal-imagen-zoom';
            modalImg.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.8); display: flex;
                align-items: center; justify-content: center; z-index: 10000; padding: 20px;
            `;

            modalImg.innerHTML = `
                <div style="position: relative; max-width: 90%; max-height: 90%;">
                    <button id="cerrar-zoom" style="position: absolute; top: -40px; right: 0; background: transparent; border: none; color: #ffffff; font-size: 32px; cursor: pointer;">&times;</button>
                    <img src="${this.src}" style="max-width: 100%; max-height: 85vh; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
                </div>
            `;

            document.body.appendChild(modalImg);

            // Cerrar al hacer clic en la X o fuera de la imagen
            document.getElementById('cerrar-zoom').onclick = () => modalImg.remove();
            modalImg.onclick = (e) => {
                if (e.target === modalImg) modalImg.remove();
            };
        });
    });

    // --- 2. Modal de Éxito al Aprobar Obra ---
    const btnAprobar = document.getElementById('btnAprobarObra');

    if (btnAprobar) {
        btnAprobar.addEventListener('click', function () {
            // Eliminar modal previo si existiera
            const modalExistente = document.getElementById('pwa-success-modal');
            if (modalExistente) modalExistente.remove();

            const overlay = document.createElement('div');
            overlay.id = 'pwa-success-modal';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.6); display: flex;
                align-items: center; justify-content: center; z-index: 9999; padding: 16px;
                box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;
            `;

            const contenido = document.createElement('div');
            contenido.style.cssText = `
                background-color: #ffffff; border-radius: 16px; padding: 28px 20px;
                width: 100%; max-width: 360px; text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            `;

            contenido.innerHTML = `
                <div style="font-size: 48px; color: #10B981; margin-bottom: 12px;">✔️</div>
                <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">¡Obra Aprobada!</h4>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">La auditoría de la obra se ha completado y aprobado de forma exitosa.</p>
                <button id="btn-modal-volver" style="width: 100%; min-height: 44px; background-color: #3b429f; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">Volver</button>
            `;

            overlay.appendChild(contenido);
            document.body.appendChild(overlay);

            // Redirigir al hacer clic en "Volver" hacia la pantalla de auditoría de obras
            const urlDestino = btnAprobar.dataset.urlVolver;

            document.getElementById('btn-modal-volver').onclick = function() {
                window.location.href = urlDestino;
            };
        });
    }
});