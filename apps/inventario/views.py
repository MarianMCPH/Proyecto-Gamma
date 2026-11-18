from decimal import Decimal, InvalidOperation
import json

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView

from .models import Material, MovimientoInventario


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

    def _obtener_movimiento(self):
        solicitud_id = (
            self.kwargs.get("pk")
            or self.request.GET.get("id")
            or self.request.POST.get("solicitud_id")
        )
        qs = MovimientoInventario.objects.select_related(
            "material",
            "orden",
            "orden__cliente",
            "usuario",
        )
        if solicitud_id:
            return get_object_or_404(qs, pk=solicitud_id)
        return qs.order_by("-fecha", "-id").first()

    def _resolver_evidencias_foto(self, mov):
        """Busca fotos de antes/después si el modelo o la orden cuentan con archivos adjuntos."""
        foto_antes = ""
        foto_despues = ""

        candidatos_antes = ("foto_antes", "imagen_antes", "evidencia_antes", "foto_falla", "imagen", "foto")
        candidatos_despues = ("foto_despues", "imagen_despues", "evidencia_despues", "foto_reparacion")

        for origen in (mov, getattr(mov, "orden", None)):
            if not origen:
                continue
            if not foto_antes:
                for campo in candidatos_antes:
                    archivo = getattr(origen, campo, None)
                    if archivo and getattr(archivo, "url", None):
                        foto_antes = archivo.url
                        break
            if not foto_despues:
                for campo in candidatos_despues:
                    archivo = getattr(origen, campo, None)
                    if archivo and getattr(archivo, "url", None):
                        foto_despues = archivo.url
                        break

        return foto_antes, foto_despues

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        mov = self._obtener_movimiento()

        if not mov:
            context["solicitud"] = None
            context["items_solicitud"] = []
            return context

        estado_raw = (mov.estado_validacion or "pendiente").strip().lower()
        if estado_raw in {"aprobada", "aprobadas", "despachada", "despachadas"}:
            estado_slug = "aprobada"
            estado_badge_texto = "Aprobada y Despachada"
            estado_badge_clase = "pill-aprobada"
        elif estado_raw in {"rechazada", "rechazadas"}:
            estado_slug = "rechazada"
            estado_badge_texto = "Rechazada"
            estado_badge_clase = "pill-rechazada"
        else:
            estado_slug = "pendiente"
            estado_badge_texto = "Pendiente de Aprobación"
            estado_badge_clase = "pill-pendiente"

        motivo_limpio = (mov.motivo or "").strip()
        observacion_guardada = ""
        if "| Obs. Admin:" in motivo_limpio:
            motivo_limpio, observacion_guardada = [
                parte.strip() for parte in motivo_limpio.split("| Obs. Admin:", 1)
            ]

        stock_actual = mov.material.stock_actual or Decimal("0")
        cantidad_solicitada = mov.cantidad or Decimal("0")
        sin_stock = stock_actual < cantidad_solicitada
        es_urgente = (
            ("urgente" in motivo_limpio.lower())
            or ("alta" in motivo_limpio.lower())
            or sin_stock
        )

        if stock_actual <= 0:
            disponibilidad_estado = "sin_stock"
            cant_sugerida = Decimal("0")
        elif sin_stock:
            disponibilidad_estado = "parcial"
            cant_sugerida = stock_actual
        else:
            disponibilidad_estado = "disponible"
            cant_sugerida = cantidad_solicitada

        if mov.orden:
            cliente_nombre = (
                mov.orden.cliente.razon_social
                if getattr(mov.orden, "cliente", None)
                else "Sin cliente"
            )
            obra_titulo = f"#OT-{mov.orden.id} · {cliente_nombre}"
            orden_id = mov.orden.id
        else:
            obra_titulo = "Sin orden asociada"
            orden_id = None

        tecnico_nombre = "Sin asignar"
        if mov.usuario:
            tecnico_nombre = mov.usuario.get_full_name().strip() or mov.usuario.username

        fecha_hora = mov.fecha.strftime("%d/%m/%Y - %H:%M hrs") if mov.fecha else "-"
        foto_antes_url, foto_despues_url = self._resolver_evidencias_foto(mov)

        context["solicitud"] = {
            "id": mov.id,
            "codigo_sol": f"#SOL-{mov.id}",
            "obra_titulo": obra_titulo,
            "orden_id": orden_id,
            "tecnico": tecnico_nombre,
            "fecha_hora": fecha_hora,
            "es_urgente": es_urgente,
            "motivo": motivo_limpio or "Sin observación registrada desde terreno.",
            "observacion_admin": observacion_guardada,
            "estado_slug": estado_slug,
            "estado_badge_texto": estado_badge_texto,
            "estado_badge_clase": estado_badge_clase,
            "foto_antes_url": foto_antes_url,
            "foto_despues_url": foto_despues_url,
        }

        context["items_solicitud"] = [
            {
                "movimiento_id": mov.id,
                "codigo": mov.material.codigo,
                "nombre": mov.material.nombre,
                "unidad": mov.material.unidad_medida,
                "stock_actual": f"{stock_actual:g}",
                "stock_max_input": f"{stock_actual:g}",
                "cantidad_solicitada": f"{cantidad_solicitada:g}",
                "cantidad_aprobar": f"{cant_sugerida:g}",
                "disponibilidad": disponibilidad_estado,
            }
        ]
        return context

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            payload = request.POST.dict()

        accion = (payload.get("accion") or "").strip().lower()
        observacion = (payload.get("observacion") or "").strip()
        solicitud_id = payload.get("solicitud_id") or self.kwargs.get("pk") or request.GET.get("id")

        if accion not in {"aprobar", "rechazar"}:
            return JsonResponse({"ok": False, "error": "Acción no válida."}, status=400)

        mov = get_object_or_404(MovimientoInventario.objects.select_related("material"), pk=solicitud_id)

        if accion == "rechazar" and not observacion:
            return JsonResponse(
                {"ok": False, "error": "Por favor, ingresa el motivo del rechazo en la observación."},
                status=400,
            )

        base_motivo = (mov.motivo or "").split("| Obs. Admin:")[0].strip()

        try:
            with transaction.atomic():
                mov_locked = MovimientoInventario.objects.select_for_update().get(pk=mov.pk)
                material_locked = Material.objects.select_for_update().get(pk=mov.material_id)

                if accion == "aprobar":
                    cant_raw = payload.get("cantidad_aprobar")
                    if cant_raw is not None and str(cant_raw).strip() != "":
                        try:
                            cant_aprobar = Decimal(str(cant_raw))
                        except InvalidOperation:
                            return JsonResponse(
                                {"ok": False, "error": "La cantidad a aprobar no es válida."},
                                status=400,
                            )
                    else:
                        cant_aprobar = mov_locked.cantidad

                    if cant_aprobar <= 0:
                        return JsonResponse(
                            {"ok": False, "error": "La cantidad a aprobar debe ser mayor a 0."},
                            status=400,
                        )

                    if (material_locked.stock_actual or Decimal("0")) < cant_aprobar:
                        return JsonResponse(
                            {"ok": False, "error": "No hay stock suficiente en bodega para aprobar esa cantidad."},
                            status=400,
                        )

                    # Rebajar stock en Cardex solo si aún no estaba aprobada
                    if (mov_locked.estado_validacion or "").strip().lower() not in {"aprobada", "despachada"}:
                        material_locked.stock_actual = (material_locked.stock_actual or Decimal("0")) - cant_aprobar
                        material_locked.save(update_fields=["stock_actual"])

                    mov_locked.cantidad = cant_aprobar
                    mov_locked.estado_validacion = "aprobada"
                    if observacion:
                        mov_locked.motivo = (
                            f"{base_motivo} | Obs. Admin: {observacion}"
                            if base_motivo
                            else f"Obs. Admin: {observacion}"
                        )
                    mov_locked.save(update_fields=["cantidad", "estado_validacion", "motivo"])

                    return JsonResponse({
                        "ok": True,
                        "estado": "aprobada",
                        "badge_texto": "Aprobada y Despachada",
                        "badge_clase": "pill-aprobada",
                        "stock_actualizado": f"{material_locked.stock_actual:g}",
                    })

                # Acción: rechazar
                mov_locked.estado_validacion = "rechazada"
                mov_locked.motivo = (
                    f"{base_motivo} | Obs. Admin: {observacion}"
                    if base_motivo
                    else f"Obs. Admin: {observacion}"
                )
                mov_locked.save(update_fields=["estado_validacion", "motivo"])

                return JsonResponse({
                    "ok": True,
                    "estado": "rechazada",
                    "badge_texto": "Rechazada",
                    "badge_clase": "pill-rechazada",
                })

        except Exception:
            return JsonResponse(
                {"ok": False, "error": "Ocurrió un problema al actualizar la solicitud. Intente nuevamente."},
                status=500,
            )