/* =================================================_
   Lógica Interactiva - Login PWA Móvil FYAG
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    console.log("Módulo de Login PWA Móvil cargado correctamente.");

    const pwaLoginForm = document.getElementById("pwaLoginForm");

    if (pwaLoginForm) {
        pwaLoginForm.addEventListener("submit", function (e) {
            const userInput = document.getElementById("pwaUser").value.trim();
            const passInput = document.getElementById("pwaPass").value.trim();

            if (userInput === "" || passInput === "") {
                e.preventDefault();
                alert("Por favor, ingrese sus credenciales para acceder al portal de terreno.");
                return;
            }

            console.log("Autenticando técnico en terreno vía token JWT...");
        });
    }
});

/* =================================================_
   Lógica Interactiva - PWA Móvil FYAG (Itinerario)
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    console.log("PWA Móvil - Itinerario de Faenas cargado correctamente.");

    // ==========================================
    // 1. DETECTOR DE ESTADO DE RED (ONLINE / OFFLINE)
    // ==========================================
    function actualizarEstadoConexion() {
        const badge = document.getElementById("network-status-badge");
        const icon = document.getElementById("network-icon");
        const text = document.getElementById("network-text");

        if (navigator.onLine) {
            // Con conexión a internet
            badge.className = "badge bg-success text-white px-2 py-1 online-badge";
            icon.className = "bi bi-circle-fill me-1";
            text.textContent = "En línea";
        } else {
            // Sin conexión (Modo Offline rural para PWA)
            badge.className = "badge bg-warning text-dark px-2 py-1 online-badge";
            icon.className = "bi bi-wifi-off me-1";
            text.textContent = "Sin conexión (Offline)";
        }
    }

    // Escuchar eventos de cambio de red del navegador
    window.addEventListener("online", actualizarEstadoConexion);
    window.addEventListener("offline", actualizarEstadoConexion);
    
    // Comprobar al cargar la página
    actualizarEstadoConexion();


    // ==========================================
    // 2. FUNCIONALIDAD PARA CERRAR SESIÓN
    // ==========================================
    const btnLogout = document.getElementById("logout-btn");
    if (btnLogout) {
        btnLogout.addEventListener("click", function (e) {
            const confirmar = confirm("¿Desea cerrar sesión en la aplicación móvil?");
            if (!confirmar) {
                e.preventDefault();
            }
        });
    }


    // ==========================================
    // 3. ATENDER EMERGENCIA (QUIEBRE CADENA DE FRÍO)
    // ==========================================
    const btnAtenderEmergencia = document.getElementById("btnAtenderEmergencia");
    if (btnAtenderEmergencia) {
        btnAtenderEmergencia.addEventListener("click", function () {
            alert("Atendiendo Faena Prioritaria por quiebre de cadena de frío. Abriendo protocolo de emergencia...");
        });
    }


    // ==========================================
    // 4. BOTÓN ¿CÓMO LLEGAR? (GEOLOCALIZACIÓN / MAPAS)
    // ==========================================
    const btnComoLlegar = document.getElementById("btnComoLlegar");
    if (btnComoLlegar) {
        btnComoLlegar.addEventListener("click", function () {
            const direccion = encodeURIComponent("Hijuela El Rosal s/n, Ruta 148, Bulnes, Ñuble");
            window.open(`https://www.google.com/maps/search/?api=1&query=${direccion}`, '_blank');
        });
    }


    // ==========================================
    // 5. BOTÓN INICIAR FAENA 
    // ==========================================


 // 5. BOTÓN INICIAR FAENA (CAPTURA GPS)


 // 5. BOTÓN INICIAR FAENA (CAPTURA GPS)

const btnIniciarFaena = document.getElementById("btnIniciarFaena");

if (btnIniciarFaena) {
    btnIniciarFaena.addEventListener("click", function () {

        // Obtener dirección de la siguiente página
        const urlDestino = btnIniciarFaena.dataset.url;

        if (navigator.geolocation) {

            navigator.geolocation.getCurrentPosition(

                function (position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    alert(`Faena OT #105 iniciada correctamente.
Ubicación GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

                    // Ir a la página de detalle
                    window.location.href = urlDestino;
                },

                function (error) {
                    alert("Faena OT #105 iniciada correctamente en modo local (Offline).");

                    // Ir a la página de detalle aunque falle el GPS
                    window.location.href = urlDestino;
                }
            );

        } else {
            alert("Faena OT #105 iniciada correctamente.");

            window.location.href = urlDestino;
        }

    });
}



});

/* =================================================_
   Lógica Dinámica de Parámetros y Service Worker (PWA)
   ================================================= */

document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Registro del Service Worker para funcionamiento offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker de Terreno registrado.'))
            .catch(err => console.log('Error SW:', err));
    }

    // 2. Detección de parámetros en la URL (?urgencia=Emergencia)
    const params = new URLSearchParams(window.location.search);
    const urgencia = params.get('urgencia');

    if (urgencia === 'Emergencia Crítica' || urgencia === 'Emergencia') {
        // Cambiar estilos y datos al modo Emergencia (Rojo)
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

