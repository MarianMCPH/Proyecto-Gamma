from django.views.generic import TemplateView

from .models import MovimientoInventario


class SolicitudInsumo(TemplateView):
    """Vista para listar y filtrar las solicitudes de insumos enviadas desde terreno."""

    template_name = "inventario/solicitudes_insumos.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        movimientos = (
            MovimientoInventario.objects.select_related(
                "material",
                "orden",
                "orden__cliente",
                "usuario",
            )
            .order_by("-fecha", "-id")
        )

        solicitudes = []
        pendientes_count = 0
        urgentes_sin_stock_count = 0
        aprobadas_count = 0

        for mov in movimientos:
            estado_raw = (mov.estado_validacion or "pendiente").strip().lower()
            if estado_raw in {"aprobada", "aprobadas", "despachada", "despachadas"}:
                estado_slug = "aprobada"
                estado_label = "Aprobada"
                pill_clase = "pill-aprobada"
                aprobadas_count += 1
            elif estado_raw in {"rechazada", "rechazadas"}:
                estado_slug = "rechazada"
                estado_label = "Rechazada"
                pill_clase = "pill-rechazada"
            else:
                estado_slug = "pendiente"
                estado_label = "Pendiente"
                pill_clase = "pill-pendiente"
                pendientes_count += 1

            motivo_texto = (mov.motivo or "").lower()
            sin_stock = (mov.material.stock_actual or 0) < (mov.cantidad or 0)
            es_urgente = ("urgente" in motivo_texto) or ("alta" in motivo_texto) or sin_stock
            prioridad_label = "Alta" if es_urgente else "Normal"

            if es_urgente and estado_slug != "aprobada":
                urgentes_sin_stock_count += 1

            if mov.orden:
                cliente_nombre = (
                    mov.orden.cliente.razon_social
                    if getattr(mov.orden, "cliente", None)
                    else "Sin cliente"
                )
                obra_cliente = f"OT-{mov.orden.id} · {cliente_nombre}"
            else:
                obra_cliente = "Sin orden asociada"

            tecnico_nombre = "Sin asignar"
            if mov.usuario:
                tecnico_nombre = mov.usuario.get_full_name().strip() or mov.usuario.username

            fecha_texto = mov.fecha.strftime("%d/%m/%Y") if mov.fecha else "-"
            cantidad_formateada = f"{mov.cantidad:g}" if mov.cantidad is not None else "0"
            items_texto = f"{cantidad_formateada} {mov.material.unidad_medida} ({mov.material.nombre})"

            texto_busqueda = " ".join([
                obra_cliente.lower(),
                tecnico_nombre.lower(),
                fecha_texto.lower(),
                items_texto.lower(),
                prioridad_label.lower(),
                estado_label.lower(),
                motivo_texto,
            ])

            solicitudes.append({
                "id": mov.id,
                "obra_cliente": obra_cliente,
                "tecnico": tecnico_nombre,
                "fecha": fecha_texto,
                "items": items_texto,
                "prioridad": prioridad_label,
                "estado_slug": estado_slug,
                "estado_label": estado_label,
                "pill_clase": pill_clase,
                "es_urgente": es_urgente,
                "texto_busqueda": texto_busqueda,
            })

        context["solicitudes"] = solicitudes
        context["total_pendientes"] = pendientes_count
        context["total_urgentes_sin_stock"] = urgentes_sin_stock_count
        context["total_aprobadas"] = aprobadas_count
        return context


class DetalleSolicitudView(TemplateView):
    """Vista para revisar, aprobar o rechazar el detalle de una solicitud de insumos."""

    template_name = "inventario/detalle_solicitud.html"