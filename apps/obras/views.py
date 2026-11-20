from datetime import datetime
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views import View
from django.views.generic import TemplateView

from apps.inventario.models import MovimientoInventario
from .models import Cliente, OrdenTrabajo

Usuario = get_user_model()
CLAVE_SESION_AUDITORIA = "ordenes_ocultas_auditoria"
CLAVE_SESION_GESTION_OCULTAS = "ordenes_ocultas_gestion"


def obtener_tecnicos_activos():
    """Retorna únicamente usuarios activos con rol Técnico asignado en su perfil."""
    return (
        Usuario.objects.select_related("perfil", "perfil__rol")
        .filter(
            Q(perfil__rol__nombre__iexact="Tecnico") | Q(perfil__rol__nombre__iexact="Técnico"),
            is_active=True,
        )
        .order_by("first_name", "last_name", "username")
    )


class ObraListView(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el tecnico."""

    template_name = "obras/itinerario.html"


class ObraDetailView(TemplateView):
    """Vista para ver el detalle completo de una obra específica desde la base de datos."""

    template_name = "obras/detalles.obras.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        obra_id = self.request.GET.get("id")
        orden = None
        if obra_id:
            orden = OrdenTrabajo.objects.select_related("cliente", "tecnico").filter(pk=obra_id).first()
        context["orden"] = orden
        return context


class ObraCreateView(TemplateView):
    """Vista para crear/registrar una nueva orden de trabajo u obra."""

    template_name = "obras/nueva_orden.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["tecnicos"] = obtener_tecnicos_activos()
        return context

    def post(self, request, *args, **kwargs):
        cliente_nombre = request.POST.get("cliente_nombre", "").strip()
        contacto_planta = request.POST.get("contacto_planta", "").strip()
        telefono_contacto = request.POST.get("telefono_contacto", "").strip()
        tipo_servicio = request.POST.get("tipo_servicio", "").strip()
        tecnico_id = request.POST.get("tecnico", "").strip()
        fecha_hora_inicio = request.POST.get("fecha_hora_inicio", "").strip()
        direccion_faena = request.POST.get("direccion_faena", "").strip()
        instrucciones = request.POST.get("instrucciones", "").strip()
        urgencia = request.POST.get("urgencia", "Normal").strip()

        if not all([
            cliente_nombre,
            contacto_planta,
            telefono_contacto,
            tipo_servicio,
            tecnico_id,
            fecha_hora_inicio,
            direccion_faena,
            instrucciones,
        ]):
            return JsonResponse(
                {"ok": False, "error": "Complete todos los campos obligatorios antes de guardar."},
                status=400,
            )

        try:
            dt_programada = datetime.strptime(fecha_hora_inicio, "%Y-%m-%dT%H:%M")
        except ValueError:
            return JsonResponse(
                {"ok": False, "error": "La fecha y hora programada no tiene un formato válido."},
                status=400,
            )

        try:
            with transaction.atomic():
                tecnico = obtener_tecnicos_activos().get(pk=tecnico_id)
                contacto_formateado = f"{contacto_planta} ({telefono_contacto})"

                cliente = Cliente.objects.filter(razon_social__iexact=cliente_nombre).first()
                if cliente is None:
                    rut_temporal = f"SIN-RUT-{OrdenTrabajo.objects.count() + 1}-{int(datetime.now().timestamp())}"[:20]
                    cliente = Cliente.objects.create(
                        razon_social=cliente_nombre,
                        rut=rut_temporal,
                        direccion=direccion_faena,
                        contacto=contacto_formateado,
                    )
                else:
                    cliente.contacto = contacto_formateado
                    if direccion_faena:
                        cliente.direccion = direccion_faena
                    cliente.save()

                detalle_instrucciones = (
                    f"[{urgencia}] Contacto en planta: {contacto_planta} | Tel: {telefono_contacto}\n"
                    f"{instrucciones}"
                )

                OrdenTrabajo.objects.create(
                    cliente=cliente,
                    tecnico=tecnico,
                    tipo_servicio=tipo_servicio,
                    fecha_programada=dt_programada.date(),
                    direccion=direccion_faena,
                    estado="programada",
                    observacion_auditoria=detalle_instrucciones,
                )

            return JsonResponse({"ok": True})

        except Usuario.DoesNotExist:
            return JsonResponse(
                {"ok": False, "error": "El técnico seleccionado no es válido o no tiene rol de Técnico activo."},
                status=400,
            )
        except Exception:
            return JsonResponse(
                {"ok": False, "error": "Ocurrió un problema al guardar en la base de datos. Vuelva a intentarlo."},
                status=500,
            )


class ObraUpdateView(TemplateView):
    """Vista para editar una obra existente y guardar sus cambios."""

    template_name = "obras/editar_obra.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        obra_id = self.request.GET.get("id")
        orden = None
        if obra_id:
            orden = OrdenTrabajo.objects.select_related("cliente", "tecnico").filter(pk=obra_id).first()

        context["orden"] = orden
        context["tecnicos"] = obtener_tecnicos_activos()
        return context

    def post(self, request, *args, **kwargs):
        obra_id = request.POST.get("obra_id") or self.request.GET.get("id")
        orden = OrdenTrabajo.objects.filter(pk=obra_id).first()

        if not orden:
            return JsonResponse({"ok": False, "error": "No se encontró la orden de trabajo."}, status=404)

        cliente_nombre = request.POST.get("cliente_nombre", "").strip()
        rut_cliente = request.POST.get("rut_cliente", "").strip()
        contacto_cliente = request.POST.get("contacto_cliente", "").strip()
        tipo_servicio = request.POST.get("tipo_servicio", "").strip()
        tecnico_id = request.POST.get("tecnico", "").strip()
        direccion_faena = request.POST.get("direccion_faena", "").strip()
        fecha_programada = request.POST.get("fecha_programada", "").strip()

        if not all([cliente_nombre, tipo_servicio, tecnico_id, direccion_faena]):
            return JsonResponse({"ok": False, "error": "Complete los campos obligatorios."}, status=400)

        try:
            with transaction.atomic():
                tecnico = obtener_tecnicos_activos().get(pk=tecnico_id)

                if orden.cliente:
                    orden.cliente.razon_social = cliente_nombre
                    if rut_cliente:
                        orden.cliente.rut = rut_cliente
                    if contacto_cliente:
                        orden.cliente.contacto = contacto_cliente
                    orden.cliente.direccion = direccion_faena
                    orden.cliente.save()

                orden.tipo_servicio = tipo_servicio
                orden.tecnico = tecnico
                orden.direccion = direccion_faena
                if fecha_programada:
                    orden.fecha_programada = fecha_programada
                orden.save()

            return JsonResponse({"ok": True})
        except Usuario.DoesNotExist:
            return JsonResponse({"ok": False, "error": "El técnico seleccionado no es válido."}, status=400)
        except Exception:
            return JsonResponse({"ok": False, "error": "Error al actualizar la orden."}, status=500)


class ObraDeleteView(TemplateView):
    """Vista para eliminar o dar de baja una obra."""

    template_name = "obras/eliminar_obra.html"


class ObraViewAdmin(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el administrador."""

    template_name = "obras/gestion_obras_adm.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        ids_ocultos = set(self.request.session.get(CLAVE_SESION_GESTION_OCULTAS, []))

        ordenes = (
            OrdenTrabajo.objects.select_related("cliente", "tecnico")
            .exclude(id__in=ids_ocultos)
            .order_by("-id")
        )

        lista_ordenes = []
        total_todas = 0
        total_en_proceso = 0
        total_pendientes = 0
        total_emergencias = 0
        total_finalizadas = 0

        for orden in ordenes:
            total_todas += 1
            estado_raw = (orden.estado or "").strip().lower()

            es_emergencia = (
                "emergencia" in (orden.tipo_servicio or "").lower()
                or "urgente" in (orden.tipo_servicio or "").lower()
                or "emergencia" in (orden.observacion_auditoria or "").lower()
                or "urgente" in (orden.observacion_auditoria or "").lower()
            )
            if es_emergencia:
                total_emergencias += 1

            if estado_raw == "en_proceso":
                total_en_proceso += 1
                categoria = "en_proceso"
                badge_clase = "bg-info text-dark"
            elif estado_raw in ["aprobada", "facturada"]:
                total_finalizadas += 1
                categoria = "finalizadas"
                badge_clase = "bg-success text-white"
            else:
                total_pendientes += 1
                categoria = "pendientes"
                badge_clase = "bg-warning text-dark"

            tecnico_nombre = "Sin asignar"
            if orden.tecnico:
                tecnico_nombre = orden.tecnico.get_full_name().strip() or orden.tecnico.username

            cliente_nombre = orden.cliente.razon_social if orden.cliente else "Sin cliente"

            lista_ordenes.append({
                "id": orden.id,
                "cliente": cliente_nombre,
                "tipo_servicio": orden.tipo_servicio or "-",
                "tecnico": tecnico_nombre,
                "estado_label": orden.get_estado_display(),
                "badge_clase": badge_clase,
                "categoria": categoria,
                "es_emergencia": es_emergencia,
            })

        context["ordenes"] = lista_ordenes
        context["total_todas"] = total_todas
        context["total_en_proceso"] = total_en_proceso
        context["total_pendientes"] = total_pendientes
        context["total_emergencias"] = total_emergencias
        context["total_finalizadas"] = total_finalizadas
        return context


class OcultarGestionObraView(View):
    """Marca o desmarca desactivada_gestion en la base de datos."""

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            ids = payload.get("ids", [])
            accion = payload.get("accion", "toggle")
        except (ValueError, UnicodeDecodeError):
            ids = request.POST.getlist("ids[]")
            accion = request.POST.get("accion", "toggle")

        ids_objetivo = [int(i) for i in ids if str(i).isdigit()]
        if not ids_objetivo:
            return JsonResponse({"ok": False, "error": "Seleccione al menos una obra."}, status=400)

        ordenes = OrdenTrabajo.objects.filter(pk__in=ids_objetivo)
        for orden in ordenes:
            if accion == "activar":
                orden.desactivada_gestion = False
            elif accion == "desactivar":
                orden.desactivada_gestion = True
            else:
                orden.desactivada_gestion = not orden.desactivada_gestion
            orden.save(update_fields=["desactivada_gestion"])

        return JsonResponse({"ok": True, "actualizadas": ordenes.count()})


class AuditoriaObras(TemplateView):
    """Vista para listar, filtrar y auditar las órdenes de trabajo."""

    template_name = "obras/auditoria_obras.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        ids_ocultos = set(self.request.session.get(CLAVE_SESION_AUDITORIA, []))

        ordenes = (
            OrdenTrabajo.objects.select_related("cliente", "tecnico")
            .exclude(id__in=ids_ocultos)
            .order_by("-id")
        )

        lista_ordenes = []
        total_en_proceso = 0
        total_pendientes = 0
        total_aprobadas = 0

        for orden in ordenes:
            estado_raw = (orden.estado or "").strip().lower()

            if estado_raw in {"en_proceso", "en proceso", "en_curso", "en curso"}:
                categoria = "en_proceso"
                badge_clase = "bg-info text-dark"
                estado_label = "En proceso"
                total_en_proceso += 1
            elif estado_raw in {"aprobada", "aprobadas", "validada", "validadas", "auditada", "auditadas"}:
                categoria = "aprobadas"
                badge_clase = "bg-success text-white"
                estado_label = "Aprobada"
                total_aprobadas += 1
            else:
                categoria = "pendientes"
                badge_clase = "bg-warning text-dark"
                estado_label = "Pendiente"
                total_pendientes += 1

            tecnico_nombre = "Sin asignar"
            if orden.tecnico:
                tecnico_nombre = orden.tecnico.get_full_name().strip() or orden.tecnico.username

            cliente_nombre = orden.cliente.razon_social if orden.cliente else "Sin cliente"

            lista_ordenes.append({
                "id": orden.id,
                "cliente": cliente_nombre,
                "tipo_servicio": orden.tipo_servicio or "-",
                "tecnico": tecnico_nombre,
                "estado_label": estado_label,
                "estado_raw": orden.estado or "",
                "badge_clase": badge_clase,
                "categoria": categoria,
            })

        context["ordenes_auditoria"] = lista_ordenes
        context["total_todas"] = len(lista_ordenes)
        context["total_en_proceso"] = total_en_proceso
        context["total_pendientes"] = total_pendientes
        context["total_aprobadas"] = total_aprobadas
        return context


class LimpiarAuditoriaView(View):
    """Oculta de la pantalla de auditoría las órdenes seleccionadas sin eliminarlas del historial."""

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            ids = payload.get("ids", [])
        except (ValueError, UnicodeDecodeError):
            ids = request.POST.getlist("ids[]")

        ids_nuevos = []
        for raw_id in ids:
            try:
                ids_nuevos.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        if not ids_nuevos:
            return JsonResponse(
                {"ok": False, "error": "Para quitar obras primero debe seleccionar al menos una obra."},
                status=400,
            )

        actuales = set(request.session.get(CLAVE_SESION_AUDITORIA, []))
        actuales.update(ids_nuevos)
        request.session[CLAVE_SESION_AUDITORIA] = list(actuales)
        request.session.modified = True

        return JsonResponse({"ok": True, "actualizadas": len(ids_nuevos)})


class AuditarObraEspecifica(TemplateView):
    """Vista para auditar y aprobar una obra específica con sus datos reales."""

    template_name = "obras/auditar_obra_especifica.html"

    def _obtener_orden(self):
        orden_id = (
            self.kwargs.get("pk")
            or self.request.GET.get("id")
            or self.request.POST.get("orden_id")
        )
        qs = OrdenTrabajo.objects.select_related("cliente", "tecnico")
        if orden_id:
            return get_object_or_404(qs, pk=orden_id)
        return qs.order_by("-id").first()

    def _obtener_campo_archivo(self, obj, nombres):
        if not obj:
            return ""
        for nombre in nombres:
            valor = getattr(obj, nombre, None)
            if valor:
                if hasattr(valor, "url"):
                    try:
                        return valor.url
                    except ValueError:
                        continue
                if isinstance(valor, str) and valor.strip():
                    return valor.strip()
        return ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = self._obtener_orden()

        if not orden:
            context["orden_auditoria"] = None
            return context

        estado_raw = (orden.estado or "").strip().lower()
        if estado_raw in {"aprobada", "aprobadas", "validada", "validadas", "auditada", "auditadas"}:
            estado_label = "Aprobada"
            es_aprobada = True
        elif estado_raw in {"en_proceso", "en proceso", "en_curso", "en curso"}:
            estado_label = "En proceso"
            es_aprobada = False
        else:
            estado_label = "Pendiente de Aprobación"
            es_aprobada = False

        cliente = getattr(orden, "cliente", None)
        mandante = cliente.razon_social if cliente else "Sin mandante"
        rut_cliente = cliente.rut if (cliente and cliente.rut) else "Sin RUT"
        contacto_raw = (cliente.contacto if (cliente and cliente.contacto) else "").strip()
        contacto_nombre = contacto_raw.split("(")[0].strip() if contacto_raw else "Sin contacto registrado"

        tecnico_nombre = "Sin asignar"
        if orden.tecnico:
            tecnico_nombre = orden.tecnico.get_full_name().strip() or orden.tecnico.username

        fecha_cierre_dt = getattr(orden, "fecha_cierre", None) or getattr(orden, "fecha_fin", None)
        if fecha_cierre_dt and hasattr(fecha_cierre_dt, "strftime"):
            fecha_cierre = fecha_cierre_dt.strftime("%d/%m/%Y - %H:%M hrs")
        elif orden.fecha_programada:
            fecha_cierre = f"{orden.fecha_programada.strftime('%d/%m/%Y')} (Programada)"
        else:
            fecha_cierre = "Pendiente de cierre"

        lat = getattr(orden, "latitud", None) or getattr(orden, "gps_lat", None)
        lng = getattr(orden, "longitud", None) or getattr(orden, "gps_lng", None)
        if lat and lng:
            gps_faena = f"{lat}, {lng}"
        else:
            gps_faena = orden.direccion or (cliente.direccion if cliente else "Sin ubicación registrada")

        checklist_items = []
        obs_texto = (orden.observacion_auditoria or "").strip()
        if obs_texto:
            for linea in obs_texto.splitlines():
                limpia = linea.strip(" -•\t")
                if limpia:
                    checklist_items.append(limpia)

        movimientos = (
            MovimientoInventario.objects.select_related("material")
            .filter(orden=orden)
            .exclude(estado_validacion__iexact="rechazada")
            .order_by("id")
        )
        materiales_consumidos = []
        for mov in movimientos:
            cant = f"{mov.cantidad:g}" if mov.cantidad is not None else "0"
            unidad = mov.material.unidad_medida if mov.material else "un"
            materiales_consumidos.append({
                "nombre": mov.material.nombre if mov.material else "Material",
                "cantidad": f"{cant} {unidad}",
            })

        evidencia_1 = self._obtener_campo_archivo(
            orden, ("foto_antes", "imagen_antes", "evidencia_1", "foto_1", "imagen_1")
        )
        evidencia_2 = self._obtener_campo_archivo(
            orden, ("foto_despues", "imagen_despues", "evidencia_2", "foto_2", "imagen_2")
        )
        firma_url = self._obtener_campo_archivo(
            orden, ("firma_cliente", "firma_mandante", "firma", "firma_digital")
        )

        firmante_nombre = getattr(orden, "firmado_por", None) or contacto_nombre
        firmante_rut = getattr(orden, "rut_firmante", None) or rut_cliente
        firmante_cargo = getattr(orden, "cargo_firmante", None) or "Responsable en Planta"
        firmante_fecha = (
            fecha_cierre_dt.strftime("%d/%m/%Y %H:%M:%S hrs")
            if (fecha_cierre_dt and hasattr(fecha_cierre_dt, "strftime"))
            else fecha_cierre
        )

        context["orden_auditoria"] = {
            "id": orden.id,
            "codigo_ot": f"#OT-{orden.id}",
            "mandante": mandante,
            "rut": rut_cliente,
            "contacto": contacto_raw or contacto_nombre,
            "tipo_servicio": orden.tipo_servicio or "-",
            "estado_label": estado_label,
            "es_aprobada": es_aprobada,
            "tecnico": tecnico_nombre,
            "fecha_cierre": fecha_cierre,
            "gps_faena": gps_faena,
            "checklist_items": checklist_items,
            "materiales_consumidos": materiales_consumidos,
            "evidencia_1": evidencia_1,
            "evidencia_2": evidencia_2,
            "firmante_nombre": firmante_nombre,
            "firmante_rut": firmante_rut,
            "firmante_cargo": firmante_cargo,
            "firmante_fecha": firmante_fecha,
            "firma_url": firma_url,
        }
        return context

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            payload = request.POST.dict()

        orden_id = payload.get("orden_id") or self.kwargs.get("pk") or request.GET.get("id")
        if not orden_id:
            return JsonResponse({"ok": False, "error": "No se especificó la orden a aprobar."}, status=400)

        orden = get_object_or_404(OrdenTrabajo, pk=orden_id)

        try:
            orden.estado = "aprobada"
            orden.save(update_fields=["estado"])
            return JsonResponse({
                "ok": True,
                "estado_label": "Aprobada",
            })
        except Exception:
            return JsonResponse(
                {"ok": False, "error": "No se pudo aprobar la obra en la base de datos. Intente nuevamente."},
                status=500,
            )