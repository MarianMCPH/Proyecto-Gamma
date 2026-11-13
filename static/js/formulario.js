/* =================================================
   JS Específico - Pantalla 1: Formulario Técnico
   ================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Autoajuste de altura dinámico para el cuadro de observaciones
    const textareas = document.querySelectorAll('.textarea-autoajustable');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });
});