from decimal import Decimal, InvalidOperation
import json

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views import View
from django.views.generic import TemplateView

from apps.obras.models import OrdenTrabajo
from .models import DetalleKitHerramienta, KitHerramientas, Material, MovimientoInventario


def _obtener_tipos_servicio():
    """Obtiene tipos de servicio desde OrdenTrabajo junto con opciones base."""
    base = [
        "Climatización",
        "Proyecto eléctrico",
        "Mantención preventiva",
        "Emergencia en terreno",
    ]
    desde_bd = list(
        OrdenTrabajo.objects.exclude(tipo_servicio__isnull=True)
        .exclude(tipo_servicio__exact="")
        .values_list("tipo_servicio", flat=True)
        .distinct()
    )
    combinados = []
    vistos = set()
    for item in base + desde_bd:
        limpio = item.strip()
        clave = limpio.lower()
        if limpio and clave not in vistos:
            vistos.add(clave)
            combinados.append(limpio)
    return combinados


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


class KitHerramientasView(TemplateView):
    """Pantalla principal del módulo de Kit de herramientas + mini inventario."""

    template_name = "inventario/kits_herramientas.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        kits = KitHerramientas.objects.prefetch_related("detalles__material").all()
        materiales = Material.objects.order_by("nombre")

        kits_data = []
        for kit in kits:
            kits_data.append({
                "id": kit.id,
                "nombre": kit.nombre,
                "tipo_servicio": kit.tipo_servicio,
                "descripcion": kit.descripcion or "",
                "cantidad_items": kit.detalles.count(),
                "total_presupuesto": kit.total_presupuesto,
            })

        context["kits"] = kits_data
        context["materiales"] = materiales
        context["tipos_servicio"] = _obtener_tipos_servicio()
        return context

    def post(self, request, *args, **kwargs):
        accion = (request.POST.get("accion") or "").strip()

        if accion == "crear_material":
            codigo = (request.POST.get("codigo") or "").strip()
            nombre = (request.POST.get("nombre") or "").strip()
            unidad = (request.POST.get("unidad_medida") or "un").strip()
            try:
                stock_actual = Decimal(request.POST.get("stock_actual") or "0")
                stock_minimo = Decimal(request.POST.get("stock_minimo") or "0")
                precio_unitario = Decimal(request.POST.get("precio_unitario") or "0")
            except InvalidOperation:
                return JsonResponse({"ok": False, "error": "Valores numéricos inválidos."}, status=400)

            if not codigo or not nombre:
                return JsonResponse({"ok": False, "error": "Código y nombre son obligatorios."}, status=400)

            if Material.objects.filter(codigo__iexact=codigo).exists():
                return JsonResponse({"ok": False, "error": "Ya existe un material con ese código."}, status=400)

            mat = Material.objects.create(
                codigo=codigo,
                nombre=nombre,
                unidad_medida=unidad,
                stock_actual=stock_actual,
                stock_minimo=stock_minimo,
                precio_unitario=precio_unitario,
            )
            return JsonResponse({
                "ok": True,
                "material": {
                    "id": mat.id,
                    "codigo": mat.codigo,
                    "nombre": mat.nombre,
                    "unidad_medida": mat.unidad_medida,
                    "stock_actual": f"{mat.stock_actual:g}",
                    "precio_unitario": f"{mat.precio_unitario:.2f}",
                },
            })

        if accion == "actualizar_precio_material":
            mat_id = request.POST.get("material_id")
            try:
                nuevo_precio = Decimal(request.POST.get("precio_unitario") or "0")
                if nuevo_precio < 0:
                    raise InvalidOperation
            except InvalidOperation:
                return JsonResponse({"ok": False, "error": "Precio inválido."}, status=400)

            mat = get_object_or_404(Material, pk=mat_id)
            mat.precio_unitario = nuevo_precio
            mat.save(update_fields=["precio_unitario"])
            return JsonResponse({"ok": True, "precio_unitario": f"{mat.precio_unitario:.2f}"})

        nombre_kit = (request.POST.get("nombre") or "").strip()
        tipo_servicio = (request.POST.get("tipo_servicio") or "").strip()
        descripcion = (request.POST.get("descripcion") or "").strip()

        material_ids = request.POST.getlist("material_id[]")
        cantidades = request.POST.getlist("cantidad[]")
        precios = request.POST.getlist("precio_unitario[]")

        if not nombre_kit or not tipo_servicio:
            return JsonResponse({"ok": False, "error": "Indica el nombre del kit y el tipo de servicio."}, status=400)

        try:
            with transaction.atomic():
                kit = KitHerramientas.objects.create(
                    nombre=nombre_kit,
                    tipo_servicio=tipo_servicio,
                    descripcion=descripcion,
                )

                for idx, mat_id in enumerate(material_ids):
                    if not str(mat_id).isdigit():
                        continue
                    mat = Material.objects.filter(pk=int(mat_id)).first()
                    if not mat:
                        continue

                    cant_raw = cantidades[idx] if idx < len(cantidades) else "1"
                    precio_raw = precios[idx] if idx < len(precios) else ""

                    cant = Decimal(cant_raw or "1")
                    if cant <= 0:
                        continue

                    precio = (
                        Decimal(precio_raw)
                        if (precio_raw and str(precio_raw).strip() != "")
                        else (mat.precio_unitario or Decimal("0"))
                    )
                    if precio < 0:
                        precio = Decimal("0")

                    if precio_raw and str(precio_raw).strip() != "":
                        mat.precio_unitario = precio
                        mat.save(update_fields=["precio_unitario"])

                    DetalleKitHerramienta.objects.update_or_create(
                        kit=kit,
                        material=mat,
                        defaults={"cantidad": cant, "precio_unitario": precio},
                    )

            return JsonResponse({"ok": True, "redirect_url": reverse("inventario:detalle_kit", args=[kit.id])})
        except Exception:
            return JsonResponse({"ok": False, "error": "No se pudo crear el kit."}, status=500)


class DetalleKitView(TemplateView):
    """Visualiza un kit con sus materiales, precios y presupuesto total calculado."""

    template_name = "inventario/detalle_kit.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        kit = get_object_or_404(
            KitHerramientas.objects.prefetch_related("detalles__material"),
            pk=kwargs.get("pk"),
        )
        items = []
        for det in kit.detalles.all():
            items.append({
                "id": det.id,
                "codigo": det.material.codigo,
                "nombre": det.material.nombre,
                "unidad": det.material.unidad_medida,
                "cantidad": det.cantidad,
                "precio_unitario": det.precio_unitario,
                "subtotal": det.subtotal,
            })

        context["kit"] = kit
        context["items"] = items
        context["total_presupuesto"] = kit.total_presupuesto
        return context


class EditarKitView(TemplateView):
    """Permite editar el kit, sus materiales, cantidades y precios."""

    template_name = "inventario/editar_kit.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        kit = get_object_or_404(
            KitHerramientas.objects.prefetch_related("detalles__material"),
            pk=kwargs.get("pk"),
        )
        context["kit"] = kit
        context["detalles"] = list(kit.detalles.select_related("material").all())
        context["materiales"] = Material.objects.order_by("nombre")
        context["tipos_servicio"] = _obtener_tipos_servicio()
        return context

    def post(self, request, *args, **kwargs):
        kit = get_object_or_404(KitHerramientas, pk=kwargs.get("pk"))
        nombre_kit = (request.POST.get("nombre") or "").strip()
        tipo_servicio = (request.POST.get("tipo_servicio") or "").strip()
        descripcion = (request.POST.get("descripcion") or "").strip()

        material_ids = request.POST.getlist("material_id[]")
        cantidades = request.POST.getlist("cantidad[]")
        precios = request.POST.getlist("precio_unitario[]")

        if not nombre_kit or not tipo_servicio:
            return JsonResponse({"ok": False, "error": "Nombre y tipo de servicio son obligatorios."}, status=400)

        try:
            with transaction.atomic():
                kit.nombre = nombre_kit
                kit.tipo_servicio = tipo_servicio
                kit.descripcion = descripcion
                kit.save(update_fields=["nombre", "tipo_servicio", "descripcion"])

                kit.detalles.all().delete()
                for idx, mat_id in enumerate(material_ids):
                    if not str(mat_id).isdigit():
                        continue
                    mat = Material.objects.filter(pk=int(mat_id)).first()
                    if not mat:
                        continue
                    cant = Decimal((cantidades[idx] if idx < len(cantidades) else "1") or "1")
                    if cant <= 0:
                        continue
                    precio_raw = precios[idx] if idx < len(precios) else ""
                    precio = (
                        Decimal(precio_raw)
                        if (precio_raw and str(precio_raw).strip() != "")
                        else (mat.precio_unitario or Decimal("0"))
                    )
                    DetalleKitHerramienta.objects.create(
                        kit=kit,
                        material=mat,
                        cantidad=cant,
                        precio_unitario=precio,
                    )

            return JsonResponse({"ok": True, "redirect_url": reverse("inventario:detalle_kit", args=[kit.id])})
        except Exception:
            return JsonResponse({"ok": False, "error": "No se pudo actualizar el kit."}, status=500)


class EliminarKitView(View):
    """Elimina un kit de herramientas."""

    def post(self, request, *args, **kwargs):
        kit = get_object_or_404(KitHerramientas, pk=kwargs.get("pk"))
        kit.delete()
        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"ok": True})
        return redirect("inventario:kits_herramientas")