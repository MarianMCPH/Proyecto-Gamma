/* =================================================
   Lógica Interactiva - PWA Móvil FYAG (Unificada)
   ================================================= */

// Función auxiliar para mostrar un modal móvil personalizado en lugar de alert/confirm
function mostrarModalMovil(titulo, mensaje, esConfirmacion = false, callbackAceptar = null) {
    // Eliminar modal previo si existiera
    const modalExistente = document.getElementById('pwa-custom-modal');
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pwa-custom-modal';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6); display: flex;
        align-items: center; justify-content: center; z-index: 9999; padding: 16px;
        box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;
    `;

    const contenido = document.createElement('div');
    contenido.style.cssText = `
        background-color: #ffffff; border-radius: 16px; padding: 24px 20px;
        width: 100%; max-width: 340px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;

    contenido.innerHTML = `
        <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #2e3252; font-weight: 700;">${titulo}</h4>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${mensaje}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            ${esConfirmacion ? `<button id="pwa-modal-cancel" style="flex: 1; min-height: 44px; background-color: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancelar</button>` : ''}
            <button id="pwa-modal-ok" style="flex: 1; min-height: 44px; background-color: #3b3f68; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Aceptar</button>
        </div>
    `;

    overlay.appendChild(contenido);
    document.body.appendChild(overlay);

    document.getElementById('pwa-modal-ok').onclick = function() {
        overlay.remove();
        if (callbackAceptar) callbackAceptar();
    };

    if (esConfirmacion) {
        document.getElementById('pwa-modal-cancel').onclick = function() {
            overlay.remove();
        };
    }
}


document.addEventListener("DOMContentLoaded", function () {
    console.log("PWA Móvil FYAG cargada correctamente.");

    // ==========================================
    // 1. LOGIN MÓVIL
    // ==========================================
    const pwaLoginForm = document.getElementById("pwaLoginForm");
    if (pwaLoginForm) {
        pwaLoginForm.addEventListener("submit", function (e) {
            const userInput = document.getElementById("pwaUser").value.trim();
            const passInput = document.getElementById("pwaPass").value.trim();

            if (userInput === "" || passInput === "") {
                e.preventDefault();
                mostrarModalMovil("Acceso Denegado", "Por favor, ingrese sus credenciales para acceder al portal de terreno.");
                return;
            }
            console.log("Autenticando técnico en terreno vía token JWT...");
        });
    }


    // ==========================================
    // 2. DETECTOR DE ESTADO DE RED (ONLINE / OFFLINE)
    // ==========================================
    function actualizarEstadoConexion() {
        const badge = document.getElementById("network-status-badge");
        const icon = document.getElementById("network-icon");
        const text = document.getElementById("network-text");

        if (!badge || !icon || !text) return;

        if (navigator.onLine) {
            badge.className = "badge bg-success text-white px-2 py-1 online-badge";
            icon.className = "bi bi-circle-fill me-1";
            text.textContent = "En línea";
        } else {
            badge.className = "badge bg-warning text-dark px-2 py-1 online-badge";
            icon.className = "bi bi-wifi-off me-1";
            text.textContent = "Sin conexión (Offline)";
        }
    }

    window.addEventListener("online", actualizarEstadoConexion);
    window.addEventListener("offline", actualizarEstadoConexion);
    actualizarEstadoConexion();


/* =================================================
   FUNCIONALIDAD PARA CERRAR SESIÓN (Modal Flotante)
   ================================================= */
const btnLogout = document.getElementById("logout-btn");
if (btnLogout) {
    btnLogout.addEventListener("click", function (e) {
        // 1. Evitamos que el navegador navegue de inmediato al login
        e.preventDefault(); 
        
        // 2. Guardamos la URL de destino que tenía el botón
        const urlDestinoLogout = btnLogout.href;

        // 3. Mostramos nuestro modal flotante móvil personalizado
        mostrarModalMovil(
            "Cerrar Sesión", 
            "¿Desea cerrar sesión en la aplicación móvil?", 
            true, // Activa el botón de Cancelar
            function() {
                // Si el usuario hace clic en Aceptar, recién ahí lo mandamos al login
                window.location.href = urlDestinoLogout;
            }
        );
    });
}


    // ==========================================
    // 4. ATENDER EMERGENCIA (QUIEBRE CADENA DE FRÍO)
    // ==========================================
    const btnAtenderEmergencia = document.getElementById("btnAtenderEmergencia");
    if (btnAtenderEmergencia) {
        btnAtenderEmergencia.addEventListener("click", function () {
            mostrarModalMovil("Protocolo de Emergencia", "Atendiendo Faena Prioritaria por quiebre de cadena de frío. Abriendo protocolo de emergencia...");
        });
    }


    // ==========================================
    // 5. BOTÓN ¿CÓMO LLEGAR? (GEOLOCALIZACIÓN / MAPAS)
    // ==========================================
    const btnComoLlegar = document.getElementById("btnComoLlegar");
    if (btnComoLlegar) {
        btnComoLlegar.addEventListener("click", function () {
            const direccion = encodeURIComponent("Hijuela El Rosal s/n, Ruta 148, Bulnes, Ñuble");
            window.open(`https://www.google.com/maps/search/?api=1&query=${direccion}`, '_blank');
        });
    }


    // ==========================================
    // 6. BOTÓN INICIAR FAENA (CAPTURA GPS)
    // ==========================================
    const btnIniciarFaena = document.getElementById("btnIniciarFaena");
    if (btnIniciarFaena) {
        btnIniciarFaena.addEventListener("click", function () {
            const urlDestino = btnIniciarFaena.dataset.url || "#";

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        mostrarModalMovil("Faena Iniciada", `Faena OT #105 iniciada correctamente.<br>Ubicación GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, false, function() {
                            if (urlDestino && urlDestino !== "#") window.location.href = urlDestino;
                        });
                    },
                    function (error) {
                        mostrarModalMovil("Modo Local", "Faena OT #105 iniciada correctamente en modo local (Offline).", false, function() {
                            if (urlDestino && urlDestino !== "#") window.location.href = urlDestino;
                        });
                    }
                );
            } else {
                mostrarModalMovil("Faena Iniciada", "Faena OT #105 iniciada correctamente.", false, function() {
                    if (urlDestino && urlDestino !== "#") window.location.href = urlDestino;
                });
            }
        });
    }


    // ==========================================
    // 7. SERVICE WORKER Y PARÁMETROS DE EMERGENCIA
    // ==========================================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then(() => console.log('Service Worker de Terreno registrado.'))
            .catch(err => console.log('Error SW:', err));
    }

    const params = new URLSearchParams(window.location.search);
    const urgencia = params.get('urgencia');

    if (urgencia === 'Emergencia Crítica' || urgencia === 'Emergencia') {
        const header = document.getElementById('header-bar');
        if (header) header.style.backgroundColor = '#dc3545';
        
        const obraIdBadge = document.getElementById('obra-id-badge');
        if (obraIdBadge) obraIdBadge.innerHTML = 'ID: #106 - <span class="badge bg-danger">Emergencia Crítica</span>';
        
        const valCliente = document.getElementById('val-cliente');
        if (valCliente) valCliente.textContent = 'Frigorífico y Procesadora Frutícola Ñuble Ltda.';
        
        const valDireccion = document.getElementById('val-direccion');
        if (valDireccion) valDireccion.textContent = 'Longitudinal Sur Km 398, Parque Industrial';
        
        const valContacto = document.getElementById('val-contacto');
        if (valContacto) valContacto.textContent = 'Carlos Mendoza | +56 9 8765 4321';
        
        const tipo = document.getElementById('val-tipo');
        if (tipo) {
            tipo.textContent = 'Emergencia';
            tipo.style.color = '#dc3545';
        }
        
        const valHora = document.getElementById('val-hora');
        if (valHora) valHora.textContent = '8:00 hrs';
        
        const valPresupuesto = document.getElementById('val-presupuesto');
        if (valPresupuesto) valPresupuesto.textContent = 'PRES-2026-019';
        
        const valUbicacion = document.getElementById('val-ubicacion');
        if (valUbicacion) valUbicacion.textContent = 'Cámara de Congelado #1';
        
        const valInstrucciones = document.getElementById('val-instrucciones');
        if (valInstrucciones) {
            valInstrucciones.innerHTML = '<strong>Atención Requerida:</strong> Falla crítica en central de frío y riesgo inminente de quiebre en la cadena de frío de fruta fresca de exportación.<br><br><strong>Acciones iniciales:</strong> Inspección urgente de compresor semihermético, verificación de fuga masiva de refrigerante R-404A en línea de líquido y revisión de disparo por alta temperatura.';
        }
        
        const valEquipamiento = document.getElementById('val-equipamiento');
        if (valEquipamiento) {
            valEquipamiento.innerHTML = `
                <li>• <strong>Equipo:</strong> Rack de Frío Industrial / Compresor Semihermético BITZER</li>
                <li>• <strong>Tensión:</strong> 380V Trifásico</li>
                <li>• <strong>Set Point Requerido:</strong> -22 °C</li>
                <li>• <strong>Tipo de Refrigerante:</strong> R-404A</li>
            `;
        }
        
        const btnComoLlegar = document.getElementById('btn-como-llegar');
        if (btnComoLlegar) {
            btnComoLlegar.href = 'https://www.google.com/maps/search/?api=1&query=Longitudinal+Sur+Km+398,+Parque+Industrial+Chillan';
        }
        
        const btnIniciar = document.getElementById('btn-iniciar');
        if (btnIniciar) {
            btnIniciar.style.backgroundColor = '#dc3545';
        }
    }
});
