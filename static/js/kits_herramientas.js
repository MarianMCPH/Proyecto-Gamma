document.addEventListener('DOMContentLoaded', function () {
    const cuerpoItems = document.getElementById('cuerpoItemsKit');
    const btnAgregarFila = document.getElementById('btnAgregarFilaKit');
    const plantillaFila = document.getElementById('plantillaFilaKit');
    const totalEl = document.getElementById('totalPresupuestoKit');

    function aNumeroDecimal(valor) {
        if (valor === null || valor === undefined) return 0;
        let texto = String(valor).trim().replace(/\s+/g, '');
        if (!texto) return 0;

        if (texto.includes(',') && texto.includes('.')) {
            texto = texto.replace(/\./g, '').replace(',', '.');
        } else if (texto.includes(',')) {
            texto = texto.replace(',', '.');
        }
        const num = parseFloat(texto);
        return Number.isNaN(num) ? 0 : num;
    }

    function aMontoClp(valor) {
        if (valor === null || valor === undefined) return 0;
        const limpio = String(valor).replace(/[^\d,.-]/g, '').trim();
        if (!limpio) return 0;

        if (limpio.includes(',')) {
            const normalizado = limpio.replace(/\./g, '').replace(',', '.');
            const num = parseFloat(normalizado);
            return Number.isNaN(num) ? 0 : Math.round(num);
        }

        if (/^-?\d{1,3}(?:\.\d{3})+$/.test(limpio)) {
            const num = parseInt(limpio.replace(/\./g, ''), 10);
            return Number.isNaN(num) ? 0 : num;
        }

        const num = parseFloat(limpio);
        return Number.isNaN(num) ? 0 : Math.round(num);
    }

    function formatearClp(monto) {
        const entero = Math.round(aMontoClp(monto));
        return '$' + entero.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    }

    function obtenerFactorUnidad(unidadTexto) {
        const texto = String(unidadTexto || '').trim();
        if (texto === '') return 1;
        const num = aNumeroDecimal(texto);
        return num > 0 ? num : 1;
    }

    function obtenerCsrfToken() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        if (input && input.value) return input.value;
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function actualizarMontoFilaInventario(fila) {
        if (!fila) return;
        const unidadEl = fila.querySelector('.mat-unidad-texto');
        const precioEl = fila.querySelector('.mat-precio-texto');
        const montoCell = fila.querySelector('.mat-monto-texto');
        if (!montoCell) return;

        const factorUnidad = obtenerFactorUnidad(unidadEl ? unidadEl.textContent : 1);
        const precioRaw = precioEl ? (precioEl.getAttribute('data-precio') || precioEl.textContent) : 0;
        const precio = aMontoClp(precioRaw);
        const total = Math.round(factorUnidad * precio);
        montoCell.textContent = formatearClp(total);
    }

    function inicializarMontosInventario() {
        document.querySelectorAll('#cuerpoMiniInventario tr[data-fila-material-id]').forEach(actualizarMontoFilaInventario);
    }

    function recalcularTotales() {
        if (!cuerpoItems) return;
        let totalGeneral = 0;

        cuerpoItems.querySelectorAll('tr.fila-item-kit').forEach(fila => {
            const cantInput = fila.querySelector('.input-cantidad-kit');
            const precioInput = fila.querySelector('.input-precio-kit');
            const subtotalCell = fila.querySelector('.subtotal-kit');

            const cant = aNumeroDecimal(cantInput ? cantInput.value : 0);
            const precio = aMontoClp(precioInput ? precioInput.value : 0);
            const subtotal = Math.round(cant * precio);
            totalGeneral += subtotal;

            if (subtotalCell) {
                subtotalCell.textContent = formatearClp(subtotal);
            }
        });

        if (totalEl) {
            totalEl.textContent = formatearClp(totalGeneral);
        }
    }

    function normalizarFormData(formData) {
        const camposDecimales = ['cantidad[]', 'stock_actual', 'stock_minimo'];
        camposDecimales.forEach(campo => {
            const valores = formData.getAll(campo);
            if (valores.length > 0) {
                formData.delete(campo);
                valores.forEach(v => {
                    const num = aNumeroDecimal(v);
                    formData.append(campo, num.toFixed(2));
                });
            }
        });

        const camposClp = ['precio_unitario[]', 'precio_unitario'];
        camposClp.forEach(campo => {
            const valores = formData.getAll(campo);
            if (valores.length > 0) {
                formData.delete(campo);
                valores.forEach(v => {
                    const monto = aMontoClp(v);
                    formData.append(campo, String(monto));
                });
            }
        });
    }

    // Mientras escribes: solo quita caracteres inválidos sin pisar lo que vas tecleando
    document.addEventListener('input', function (e) {
        if (e.target.classList && e.target.classList.contains('input-clp')) {
            const limpio = String(e.target.value || '').replace(/[^\d.,-]/g, '');
            if (e.target.value !== limpio) {
                e.target.value = limpio;
            }
        }
    });

    // Al salir del input: aplica formato CLP ($1.000.000)
    document.addEventListener('blur', function (e) {
        if (e.target.classList && e.target.classList.contains('input-clp')) {
            const raw = String(e.target.value || '').trim();
            e.target.value = raw === '' ? '' : formatearClp(raw);
        }
    }, true);

    const formNuevoMaterial = document.getElementById('formNuevoMaterial');
    if (formNuevoMaterial) {
        const inputPrecioNuevo = document.getElementById('inputPrecioMaterial');
        if (inputPrecioNuevo && aMontoClp(inputPrecioNuevo.value) > 0) {
            inputPrecioNuevo.value = formatearClp(inputPrecioNuevo.value);
        }

        formNuevoMaterial.addEventListener('submit', function (e) {
            e.preventDefault();
            const msgEl = document.getElementById('mensajeNuevoMaterial');
            if (msgEl) {
                msgEl.className = 'small mb-3 text-muted';
                msgEl.textContent = 'Guardando material...';
            }

            const formData = new FormData(formNuevoMaterial);
            normalizarFormData(formData);

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
                    const errText = data.error || 'No se pudo registrar el material.';
                    if (msgEl) {
                        msgEl.className = 'small mb-3 text-danger fw-semibold';
                        msgEl.textContent = errText;
                    } else {
                        alert(errText);
                    }
                    return;
                }

                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    window.location.reload();
                }
            })
            .catch(() => {
                if (msgEl) {
                    msgEl.className = 'small mb-3 text-danger fw-semibold';
                    msgEl.textContent = 'Error de conexión al registrar el material.';
                }
            });
        });
    }

    const modalVerMatEl = document.getElementById('modalVerMaterial');
    document.querySelectorAll('.btn-ver-material').forEach(btn => {
        btn.addEventListener('click', function () {
            const stock = aNumeroDecimal(this.getAttribute('data-stock') || 0);
            const precio = aMontoClp(this.getAttribute('data-precio') || 0);
            const factorUnidad = obtenerFactorUnidad(this.getAttribute('data-unidad') || 1);
            const total = Math.round(factorUnidad * precio);

            document.getElementById('verMatCodigo').textContent = this.getAttribute('data-codigo') || '-';
            document.getElementById('verMatNombre').textContent = this.getAttribute('data-nombre') || '-';
            document.getElementById('verMatUnidad').textContent = this.getAttribute('data-unidad') || '-';
            document.getElementById('verMatStock').textContent = stock.toFixed(2);
            document.getElementById('verMatStockMinimo').textContent = aNumeroDecimal(this.getAttribute('data-stock-minimo') || 0).toFixed(2);
            document.getElementById('verMatPrecio').textContent = formatearClp(precio);
            document.getElementById('verMatMonto').textContent = formatearClp(total);

            if (modalVerMatEl && window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalVerMatEl).show();
            }
        });
    });

    const modalEditarMatEl = document.getElementById('modalEditarMaterial');
    const formEditarMat = document.getElementById('formEditarMaterial');
    const editMatStockInput = document.getElementById('editMatStock');
    const editMatPrecioInput = document.getElementById('editMatPrecio');
    const editMatUnidadInput = document.getElementById('editMatUnidad');
    const editMatMontoInput = document.getElementById('editMatMontoCalculado');
    let filaMaterialEnEdicion = null;

    function recalcularTotalModalEditar() {
        if (!editMatMontoInput) return;
        const factorUnidad = obtenerFactorUnidad(editMatUnidadInput ? editMatUnidadInput.value : 1);
        const precio = aMontoClp(editMatPrecioInput ? editMatPrecioInput.value : 0);
        const total = Math.round(factorUnidad * precio);
        editMatMontoInput.value = formatearClp(total);
    }

    if (editMatUnidadInput) {
        editMatUnidadInput.addEventListener('input', recalcularTotalModalEditar);
        editMatUnidadInput.addEventListener('change', recalcularTotalModalEditar);
    }

    if (editMatPrecioInput) {
        editMatPrecioInput.addEventListener('input', recalcularTotalModalEditar);
        editMatPrecioInput.addEventListener('change', recalcularTotalModalEditar);
    }

    document.querySelectorAll('.btn-editar-material').forEach(btn => {
        btn.addEventListener('click', function () {
            filaMaterialEnEdicion = this.closest('tr');
            const unidadInicialTexto = (this.getAttribute('data-unidad') || 'un').trim();
            const precioInicial = aMontoClp(this.getAttribute('data-precio') || 0);

            document.getElementById('editMatId').value = this.getAttribute('data-id') || '';
            document.getElementById('editMatCodigo').value = this.getAttribute('data-codigo') || '';
            document.getElementById('editMatNombre').value = this.getAttribute('data-nombre') || '';
            if (editMatUnidadInput) editMatUnidadInput.value = unidadInicialTexto || 'un';
            if (editMatStockInput) editMatStockInput.value = aNumeroDecimal(this.getAttribute('data-stock') || 0).toFixed(2);
            document.getElementById('editMatStockMinimo').value = aNumeroDecimal(this.getAttribute('data-stock-minimo') || 0).toFixed(2);
            if (editMatPrecioInput) editMatPrecioInput.value = formatearClp(precioInicial);

            recalcularTotalModalEditar();

            if (modalEditarMatEl && window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalEditarMatEl).show();
            }
        });
    });

    if (formEditarMat) {
        formEditarMat.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(formEditarMat);
            normalizarFormData(formData);

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
                if (!res.ok || !data.ok || !data.material) {
                    alert(data.error || 'No se pudo actualizar el material.');
                    return;
                }

                const mat = data.material;
                const precioClpTexto = mat.precio_unitario_clp || formatearClp(mat.precio_unitario);
                const precioRawTexto = mat.precio_unitario || String(aMontoClp(precioClpTexto));

                if (filaMaterialEnEdicion) {
                    const nombreEl = filaMaterialEnEdicion.querySelector('.mat-nombre-texto');
                    const subEl = filaMaterialEnEdicion.querySelector('.mat-sub-texto');
                    const unidadEl = filaMaterialEnEdicion.querySelector('.mat-unidad-texto');
                    const stockEl = filaMaterialEnEdicion.querySelector('.mat-stock-texto');
                    const precioEl = filaMaterialEnEdicion.querySelector('.mat-precio-texto');

                    if (nombreEl) nombreEl.textContent = mat.nombre;
                    if (subEl) subEl.textContent = mat.codigo;
                    if (unidadEl) unidadEl.textContent = mat.unidad_medida;
                    if (stockEl) stockEl.textContent = mat.stock_actual;
                    if (precioEl) {
                        precioEl.setAttribute('data-precio', precioRawTexto);
                        precioEl.textContent = precioClpTexto;
                    }

                    filaMaterialEnEdicion.querySelectorAll('.btn-ver-material, .btn-editar-material').forEach(b => {
                        b.setAttribute('data-codigo', mat.codigo);
                        b.setAttribute('data-nombre', mat.nombre);
                        b.setAttribute('data-unidad', mat.unidad_medida);
                        b.setAttribute('data-stock', mat.stock_actual);
                        b.setAttribute('data-stock-minimo', mat.stock_minimo);
                        b.setAttribute('data-precio', precioRawTexto);
                    });

                    const btnEliminar = filaMaterialEnEdicion.querySelector('.btn-eliminar-material');
                    if (btnEliminar) btnEliminar.setAttribute('data-material-nombre', mat.nombre);

                    actualizarMontoFilaInventario(filaMaterialEnEdicion);
                }

                if (modalEditarMatEl && window.bootstrap) {
                    const inst = bootstrap.Modal.getInstance(modalEditarMatEl);
                    if (inst) inst.hide();
                }
            })
            .catch(() => alert('Error de conexión al actualizar el material.'));
        });
    }

    document.querySelectorAll('.btn-eliminar-material').forEach(btn => {
        btn.addEventListener('click', function () {
            const materialId = this.getAttribute('data-material-id');
            const nombreMat = this.getAttribute('data-material-nombre') || 'este material';
            if (!confirm(`¿Deseas eliminar "${nombreMat}" del inventario?`)) return;

            const formData = new FormData();
            formData.append('accion', 'eliminar_material');
            formData.append('material_id', materialId);

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
                    alert(data.error || 'No se pudo eliminar el material.');
                    return;
                }
                const fila = this.closest('tr');
                if (fila) fila.remove();

                const cuerpoInv = document.getElementById('cuerpoMiniInventario');
                if (cuerpoInv && cuerpoInv.querySelectorAll('tr').length === 0) {
                    cuerpoInv.innerHTML = `
                        <tr id="filaSinMateriales">
                            <td colspan="6" class="text-center py-4 text-muted">
                                Aún no se ha agregado ningún material.
                            </td>
                        </tr>
                    `;
                }
            })
            .catch(() => alert('Error de conexión al eliminar el material.'));
        });
    });

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
                    precioInput.value = formatearClp(precioDefecto);
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
                if (precio) precio.value = '$0';
            }
            recalcularTotales();
        });
    }

    const formCrearKit = document.getElementById('formCrearKit');
    const btnAbrirModalConfirmarKit = document.getElementById('btnAbrirModalConfirmarKit');
    const btnConfirmarGuardarKit = document.getElementById('btnConfirmarGuardarKit');
    const modalConfirmarEl = document.getElementById('modalConfirmarGuardarKit');
    const modalExitoEl = document.getElementById('modalExitoGuardarKit');

    function enviarFormularioCrearKit() {
        if (!formCrearKit) return;
        const formData = new FormData(formCrearKit);
        normalizarFormData(formData);

        if (btnConfirmarGuardarKit) btnConfirmarGuardarKit.disabled = true;

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
            if (btnConfirmarGuardarKit) btnConfirmarGuardarKit.disabled = false;

            if (!res.ok || !data.ok) {
                alert(data.error || 'No se pudo guardar el kit.');
                return;
            }

            if (modalConfirmarEl && window.bootstrap) {
                const instConfirmar = bootstrap.Modal.getInstance(modalConfirmarEl);
                if (instConfirmar) instConfirmar.hide();
            }

            const totalFormateado = data.total_presupuesto
                ? (String(data.total_presupuesto).startsWith('$') ? data.total_presupuesto : formatearClp(data.total_presupuesto))
                : '$0';

            if (modalExitoEl && window.bootstrap) {
                const exitoNombre = document.getElementById('exitoNombreKit');
                const exitoTotal = document.getElementById('exitoTotalKit');
                const btnVerDetalle = document.getElementById('btnVerDetalleKitExito');
                const btnIrListado = document.getElementById('btnIrListadoKitsExito');

                if (exitoNombre) exitoNombre.textContent = data.kit_nombre || '';
                if (exitoTotal) exitoTotal.textContent = totalFormateado;
                if (btnVerDetalle && data.detalle_url) btnVerDetalle.href = data.detalle_url;
                if (btnIrListado && data.listado_url) btnIrListado.href = data.listado_url;

                const instExito = bootstrap.Modal.getOrCreateInstance(modalExitoEl);
                instExito.show();
            } else if (data.redirect_url || data.detalle_url) {
                window.location.href = data.detalle_url || data.redirect_url;
            }
        })
        .catch(() => {
            if (btnConfirmarGuardarKit) btnConfirmarGuardarKit.disabled = false;
            alert('Error de conexión al guardar el kit.');
        });
    }

    if (btnAbrirModalConfirmarKit && formCrearKit) {
        btnAbrirModalConfirmarKit.addEventListener('click', function () {
            if (!formCrearKit.reportValidity()) return;

            const nombreVal = (document.getElementById('nombreKitInput')?.value || '').trim();
            const tipoVal = (document.getElementById('tipoServicioKitInput')?.value || '').trim();
            const totalTexto = totalEl ? totalEl.textContent : '$0';

            const resumenNombre = document.getElementById('resumenNombreKit');
            const resumenTipo = document.getElementById('resumenTipoServicioKit');
            const resumenTotal = document.getElementById('resumenTotalKit');

            if (resumenNombre) resumenNombre.textContent = nombreVal;
            if (resumenTipo) resumenTipo.textContent = tipoVal;
            if (resumenTotal) resumenTotal.textContent = totalTexto;

            if (modalConfirmarEl && window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalConfirmarEl).show();
            } else {
                enviarFormularioCrearKit();
            }
        });
    }

    if (btnConfirmarGuardarKit) {
        btnConfirmarGuardarKit.addEventListener('click', enviarFormularioCrearKit);
    }

    const formEditarKit = document.getElementById('formEditarKit');
    if (formEditarKit) {
        formEditarKit.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(formEditarKit);
            normalizarFormData(formData);

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
                    alert(data.error || 'No se pudo actualizar el kit.');
                    return;
                }
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    window.location.reload();
                }
            })
            .catch(() => alert('Error de conexión al actualizar el kit.'));
        });
    }

    document.querySelectorAll('.form-eliminar-kit').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!confirm('¿Deseas eliminar este kit?')) return;

            const fila = this.closest('tr');
            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': obtenerCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(async res => {
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok || data.ok === false) {
                        alert(data.error || 'No se pudo eliminar el kit.');
                        return;
                    }
                    if (fila) {
                        fila.remove();
                    } else {
                        window.location.href = '/inventario/kits/';
                    }
                    return;
                }

                if (res.ok) {
                    window.location.href = res.url || '/inventario/kits/';
                } else {
                    alert('No se pudo eliminar el kit.');
                }
            })
            .catch(() => alert('Error de conexión al eliminar el kit.'));
        });
    });

    inicializarMontosInventario();
    recalcularTotales();
});