document.addEventListener("DOMContentLoaded", function () {
    const CLAVE_TEMA = "fyag_modo_oscuro";
    const CLAVE_TAMANO = "fyag_tamano_letra";
    const html = document.documentElement;

    const toggle = document.getElementById("toggleModoOscuro");
    const select = document.getElementById("selectTamanoLetra");
    const btnRestablecer = document.getElementById("btnRestablecerPersonalizacion");

    function aplicarTema(oscuro) {
        html.classList.toggle("modo-oscuro", Boolean(oscuro));
        if (toggle) toggle.checked = Boolean(oscuro);
    }

    function aplicarTamanoLetra(tamano) {
        const valor = ["pequena", "normal", "grande"].includes(tamano) ? tamano : "normal";
        html.classList.remove("letra-pequena", "letra-normal", "letra-grande");
        html.classList.add("letra-" + valor);
        if (select) select.value = valor;
    }

    aplicarTema(localStorage.getItem(CLAVE_TEMA) === "true");
    aplicarTamanoLetra(localStorage.getItem(CLAVE_TAMANO) || "normal");

    toggle?.addEventListener("change", function () {
        localStorage.setItem(CLAVE_TEMA, String(toggle.checked));
        aplicarTema(toggle.checked);
    });

    select?.addEventListener("change", function () {
        localStorage.setItem(CLAVE_TAMANO, select.value);
        aplicarTamanoLetra(select.value);
    });

    btnRestablecer?.addEventListener("click", function () {
        localStorage.setItem(CLAVE_TEMA, "false");
        localStorage.setItem(CLAVE_TAMANO, "normal");
        aplicarTema(false);
        aplicarTamanoLetra("normal");
    });
});