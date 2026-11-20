document.addEventListener('DOMContentLoaded', function () {
    const cuerpoItems = document.getElementById('cuerpoItemsKit');
    const btnAgregarFila = document.getElementById('btnAgregarFilaKit');
    const plantillaFila = document.getElementById('plantillaFilaKit');
    const totalEl = document.getElementById('totalPresupuestoKit');

    function aNumero(valor) {
        if (valor === null || valor === undefined) return 0;
        const limpio = String(valor).trim().replace(/\s+/g, '').replace(',', '.');
        const num = parseFloat(limpio);
        return Number.isNaN(num) ? 0 : num;
    }

    function obtenerCsrfToken() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        if (input && input.value) return input.value;
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function recalcularTotales() {
        if (!cuerpoItems) return;
        let totalGeneral = 0;

        cuerpoItems.querySelectorAll('tr.fila-item-kit').forEach(fila => {
            const cantInput = fila.querySelector('.input-cantidad-kit');
            const precioInput = fila.querySelector('.input-precio-kit');
            const subtotalCell = fila.querySelector('.subtotal-kit');

            const cant = aNumero(cantInput ? cantInput.value : 0);
            const precio = aNumero(precioInput ? precioInput.value : 0);
            const subtotal = cant * precio;
            totalGeneral += subtotal;

            if (subtotalCell) {
                subtotalCell.textContent = '$' + subtotal.toFixed(2);
            }
        });

        if (totalEl) {
            totalEl.textContent = '$' + totalGeneral.toFixed(2);
        }
    }

    function normalizarFormDataDecimales(formData) {
        const camposNumericos = ['cantidad[]', 'precio_unitario[]', 'precio_unitario', 'stock_actual', 'stock_minimo'];
        camposNumericos.forEach(campo => {
            const valores = formData.getAll(campo);
            if (valores.length > 0) {
                formData.delete(campo);
                valores.forEach(v => {
                    const num = aNumero(v);
                    formData.append(campo, num.toFixed(2));
                });
            }
        });
    }

    if (btnAgregarFila && plantillaFila && cuerpoItems) {
        btnAgregarFila.addEventListener('click', function () {
            const clon = plantillaFila.content.cloneNode(true);
            cuerpoItems.appendChild(clon);
            recalcularTotales();
        });
    }

    if (cuerpoItems) {
        cuerpoItems.addEventListener('change', function (e) {
            if (e.target.classList.contains('select-material-kit')) {
                const opcion = e.target.selectedOptions[0];
                const precioDefecto = opcion ? opcion.getAttribute('data-precio') : null;
                const fila = e.target.closest('tr.fila-item-kit');
                const precioInput = fila ? fila.querySelector('.input-precio-kit') : null;
                if (precioInput && precioDefecto !== null) {
                    precioInput.value = aNumero(precioDefecto).toFixed(2);
                }
            }
            recalcularTotales();
        });

        cuerpoItems.addEventListener('input', function (e) {
            if (
                e.target.classList.contains('input-cantidad-kit') ||
                e.target.classList.contains('input-precio-kit')
            ) {
                recalcularTotales();
            }
        });

        cuerpoItems.addEventListener('click', function (e) {
            const btnQuitar = e.target.closest('.btn-quitar-fila');
            if (!btnQuitar) return;

            const filas = cuerpoItems.querySelectorAll('tr.fila-item-kit');
            if (filas.length > 1) {
                btnQuitar.closest('tr.fila-item-kit').remove();
            } else {
                const fila = filas[0];
                const select = fila.querySelector('.select-material-kit');
                const cant = fila.querySelector('.input-cantidad-kit');
                const precio = fila.querySelector('.input-precio-kit');
                if (select) select.value = '';
                if (cant) cant.value = '1.00';
                if (precio) precio.value = '0.00';
            }
            recalcularTotales();
        });
    }

    const formKit = document.getElementById('formCrearKit') || document.getElementById('formEditarKit');
    if (formKit) {
        formKit.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(formKit);
            normalizarFormDataDecimales(formData);

            fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': obtenerCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(async res => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    alert(data.error || 'No se pudo guardar el kit.');
                    return;
                }
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    window.location.reload();
                }
            })
            .catch(() => alert('Error de conexión al guardar el kit.'));
        });
    }

    const formNuevoMaterial = document.getElementById('formNuevoMaterial');
    if (formNuevoMaterial) {
        formNuevoMaterial.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(formNuevoMaterial);
            normalizarFormDataDecimales(formData);

            fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': obtenerCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(async res => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    alert(data.error || 'No se pudo registrar el material.');
                    return;
                }
                window.location.reload();
            })
            .catch(() => alert('Error de conexión al registrar el material.'));
        });
    }

    document.querySelectorAll('.input-precio-inventario').forEach(input => {
        input.addEventListener('change', function () {
            const materialId = this.getAttribute('data-material-id');
            const precioNormalizado = aNumero(this.value).toFixed(2);
            this.value = precioNormalizado;

            const formData = new FormData();
            formData.append('accion', 'actualizar_precio_material');
            formData.append('material_id', materialId);
            formData.append('precio_unitario', precioNormalizado);

            fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': obtenerCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(async res => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    alert(data.error || 'No se pudo actualizar el precio.');
                    return;
                }
                this.value = data.precio_unitario;
                document.querySelectorAll(`.select-material-kit option[value="${materialId}"]`).forEach(opt => {
                    opt.setAttribute('data-precio', data.precio_unitario);
                });
                recalcularTotales();
            })
            .catch(() => alert('Error de conexión al actualizar el precio.'));
        });
    });

    document.querySelectorAll('.form-eliminar-kit').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!confirm('¿Deseas eliminar este kit?')) return;

            fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': obtenerCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(async res => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    alert('No se pudo eliminar el kit.');
                    return;
                }
                window.location.href = '/inventario/kits/';
            })
            .catch(() => alert('Error de conexión al eliminar el kit.'));
        });
    });

    recalcularTotales();
});