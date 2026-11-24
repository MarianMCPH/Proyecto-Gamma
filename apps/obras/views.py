from datetime import datetime, timedelta
from django.utils import timezone
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views import View
from django.views.generic import TemplateView
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.views import View

from apps.inventario.models import MovimientoInventario
from .models import Cliente, OrdenTrabajo, ReporteGenerado

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
        mostrando_historial = self.request.GET.get("historial") == "1"
        ids_ocultos = set(self.request.session.get(CLAVE_SESION_AUDITORIA, []))

        qs_base = OrdenTrabajo.objects.select_related("cliente", "tecnico").order_by("-id")
        total_historial = qs_base.count()

        if mostrando_historial:
            ordenes = qs_base
        else:
            ordenes = qs_base.exclude(id__in=ids_ocultos)

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
        context["mostrando_historial"] = mostrando_historial
        context["total_historial"] = total_historial
        context["total_ocultas"] = len(ids_ocultos)
        return context


class LimpiarAuditoriaView(View):
    """Oculta o restaura en la pantalla de auditoría las órdenes sin eliminarlas del historial."""

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            payload = {"ids": request.POST.getlist("ids[]"), "accion": request.POST.get("accion", "limpiar")}

        accion = (payload.get("accion") or "limpiar").strip().lower()

        if accion == "restaurar":
            request.session[CLAVE_SESION_AUDITORIA] = []
            request.session.modified = True
            return JsonResponse({"ok": True})

        ids_nuevos = []
        for raw_id in payload.get("ids", []):
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
        if estado_raw in {"aprobada", "aprobadas", "validada", "validadas", "auditada", "auditadas", "facturada", "finalizada", "finalizadas"}:
            estado_label = "Aprobada"
            es_aprobada = True
            paso_actual = 4
        elif estado_raw in {"en_proceso", "en proceso", "en_curso", "en curso", "ejecucion", "en_ejecucion"}:
            estado_label = "En proceso"
            es_aprobada = False
            paso_actual = 2
        elif estado_raw in {"pendiente_auditoria", "pendiente de auditoria", "pendiente de auditoría", "en_revision", "en revision", "revision", "revisión"}:
            estado_label = "En revisión"
            es_aprobada = False
            paso_actual = 3
        else:
            estado_label = "Pendiente de Aprobación"
            es_aprobada = False
            paso_actual = 3

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

        lat = getattr(orden, "latitud_inicio", None) or getattr(orden, "latitud", None) or getattr(orden, "gps_lat", None)
        lng = getattr(orden, "longitud_inicio", None) or getattr(orden, "longitud", None) or getattr(orden, "gps_lng", None)
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

        fecha_prog_str = orden.fecha_programada.strftime("%d/%m/%Y") if orden.fecha_programada else "Sin fecha"
        fecha_inicio_dt = getattr(orden, "fecha_inicio_faena", None)
        fecha_inicio_str = (
            fecha_inicio_dt.strftime("%d/%m/%Y %H:%M")
            if (fecha_inicio_dt and hasattr(fecha_inicio_dt, "strftime"))
            else ("En curso" if paso_actual >= 2 else "Pendiente")
        )
        fecha_revision_str = (
            fecha_cierre_dt.strftime("%d/%m/%Y %H:%M")
            if (fecha_cierre_dt and hasattr(fecha_cierre_dt, "strftime"))
            else ("En auditoría" if paso_actual >= 3 else "Pendiente")
        )
        fecha_auditoria_dt = getattr(orden, "fecha_auditoria", None)
        fecha_final_str = (
            fecha_auditoria_dt.strftime("%d/%m/%Y %H:%M")
            if (fecha_auditoria_dt and hasattr(fecha_auditoria_dt, "strftime"))
            else ("Aprobada" if paso_actual >= 4 else "Pendiente")
        )

        etapas_definidas = [
            (1, "Programada", "bi-calendar-check", fecha_prog_str),
            (2, "En proceso", "bi-tools", fecha_inicio_str),
            (3, "En revisión", "bi-clipboard-check", fecha_revision_str),
            (4, "Finalizada", "bi-patch-check-fill", fecha_final_str),
        ]

        etapas_avance = []
        for num, titulo, icono, detalle in etapas_definidas:
            if num < paso_actual:
                estado_etapa = "completada"
            elif num == paso_actual:
                estado_etapa = "actual"
            else:
                estado_etapa = "pendiente"
            etapas_avance.append({
                "numero": num,
                "titulo": titulo,
                "icono": icono,
                "detalle": detalle,
                "estado": estado_etapa,
            })

        porcentaje_avance = int(((paso_actual - 1) / 3) * 100)

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
            "etapas_avance": etapas_avance,
            "porcentaje_avance": porcentaje_avance,
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

class ProgresoResultadosObrasView(TemplateView):
    """Vista ejecutiva de progreso, distribución por estado y evolución temporal de obras."""

    template_name = "obras/progreso_resultados.html"

    MESES_ES = [
        "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ]
    DIAS_SEMANA_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    def _clasificar_estado(self, estado_raw: str):
        estado = (estado_raw or "").strip().lower()
        if estado in {
            "aprobada", "aprobadas", "finalizada", "finalizadas",
            "facturada", "completada", "validada",
        }:
            return "finalizadas", "Finalizada", "badge-estado-finalizada", "bi-check-circle-fill"
        if estado in {
            "en_proceso", "en proceso", "en_curso", "en curso",
            "ejecucion", "en_ejecucion",
        }:
            return "en_ejecucion", "En ejecución", "badge-estado-ejecucion", "bi-play-circle-fill"
        if estado in {
            "cancelada", "canceladas", "anulada", "anuladas",
            "rechazada", "baja",
        }:
            return "canceladas", "Cancelada", "badge-estado-cancelada", "bi-x-circle-fill"
        return "pendientes", "Pendiente", "badge-estado-pendiente", "bi-clock-fill"

    def _obtener_fecha_referencia(self, orden):
        for campo in ("fecha_programada", "fecha_cierre", "fecha_fin", "fecha_creacion", "created_at"):
            val = getattr(orden, campo, None)
            if val:
                return val.date() if hasattr(val, "date") else val
        return None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        mostrando_historial = self.request.GET.get("historial") == "1"

        periodo = (self.request.GET.get("periodo") or "anio").strip().lower()
        if periodo not in {"semana", "mes", "anio", "todos"}:
            periodo = "anio"

        if mostrando_historial:
            periodo = "todos"

        hoy = timezone.localdate()
        if periodo == "semana":
            fecha_inicio = hoy - timedelta(days=6)
            periodo_label = "Última semana"
            titulo_barras = "Obras por día (últimos 7 días)"
        elif periodo == "mes":
            fecha_inicio = hoy - timedelta(days=29)
            periodo_label = "Último mes"
            titulo_barras = "Obras por semana (último mes)"
        elif periodo == "anio":
            fecha_inicio = hoy.replace(month=1, day=1)
            periodo_label = f"Año {hoy.year}"
            titulo_barras = "Obras por mes"
        else:
            fecha_inicio = None
            periodo_label = "Historial completo"
            titulo_barras = "Obras por mes (histórico completo)"

        # Siempre consultamos todas las órdenes registradas en BD (sin excluir ocultas de bandejas)
        qs = OrdenTrabajo.objects.select_related("cliente", "tecnico").order_by("-fecha_programada", "-id")
        todas_ordenes = list(qs)
        total_historico = len(todas_ordenes)

        ordenes_filtradas = []
        for orden in todas_ordenes:
            fecha_ref = self._obtener_fecha_referencia(orden)
            if fecha_inicio is not None and fecha_ref is not None and fecha_ref < fecha_inicio:
                continue
            ordenes_filtradas.append((orden, fecha_ref))

        total_obras = len(ordenes_filtradas)
        conteos = {
            "finalizadas": 0,
            "en_ejecucion": 0,
            "pendientes": 0,
            "canceladas": 0,
        }

        lista_obras = []
        for orden, fecha_ref in ordenes_filtradas:
            cat, label, badge_clase, icono = self._clasificar_estado(orden.estado)
            conteos[cat] += 1

            cliente_nombre = orden.cliente.razon_social if orden.cliente else "Sin cliente"
            tecnico_nombre = "Sin asignar"
            if orden.tecnico:
                tecnico_nombre = orden.tecnico.get_full_name().strip() or orden.tecnico.username

            fecha_texto = fecha_ref.strftime("%d/%m/%Y") if fecha_ref else "-"
            busqueda = (
                f"{cliente_nombre} {orden.tipo_servicio or ''} "
                f"{tecnico_nombre} {label} {fecha_texto}".lower()
            )

            lista_obras.append({
                "cliente": cliente_nombre,
                "tipo_servicio": orden.tipo_servicio or "-",
                "tecnico": tecnico_nombre,
                "fecha": fecha_texto,
                "categoria": cat,
                "estado_label": label,
                "badge_clase": badge_clase,
                "icono": icono,
                "busqueda": busqueda,
            })

        def pct(valor):
            return round((valor / total_obras) * 100, 1) if total_obras > 0 else 0.0

        pct_finalizadas = pct(conteos["finalizadas"])
        pct_ejecucion = pct(conteos["en_ejecucion"])
        pct_pendientes = pct(conteos["pendientes"])
        pct_canceladas = pct(conteos["canceladas"])

        barras_labels = []
        barras_valores = []

        if periodo == "semana":
            for i in range(6, -1, -1):
                dia = hoy - timedelta(days=i)
                barras_labels.append(f"{self.DIAS_SEMANA_ES[dia.weekday()]} {dia.day}")
                barras_valores.append(sum(1 for _, f in ordenes_filtradas if f == dia))
        elif periodo == "mes":
            for bloque in range(4):
                inicio_b = hoy - timedelta(days=27 - bloque * 7)
                fin_b = inicio_b + timedelta(days=6)
                barras_labels.append(f"Sem {bloque + 1}")
                barras_valores.append(
                    sum(1 for _, f in ordenes_filtradas if f and inicio_b <= f <= fin_b)
                )
        else:
            meses_indices = list(range(1, hoy.month + 1)) if periodo == "anio" else list(range(1, 13))
            if not meses_indices:
                meses_indices = [hoy.month]
            for m in meses_indices:
                barras_labels.append(self.MESES_ES[m])
                barras_valores.append(
                    sum(
                        1
                        for _, f in ordenes_filtradas
                        if f and f.month == m and (periodo != "anio" or f.year == hoy.year)
                    )
                )

        context.update({
            "periodo_actual": periodo,
            "periodo_label": periodo_label,
            "titulo_barras": titulo_barras,
            "mostrando_historial": mostrando_historial,
            "total_historico": total_historico,
            "total_obras": total_obras,
            "total_finalizadas": conteos["finalizadas"],
            "total_en_ejecucion": conteos["en_ejecucion"],
            "total_pendientes": conteos["pendientes"],
            "total_canceladas": conteos["canceladas"],
            "pct_finalizadas": pct_finalizadas,
            "pct_ejecucion": pct_ejecucion,
            "pct_pendientes": pct_pendientes,
            "pct_canceladas": pct_canceladas,
            "barras_labels_json": json.dumps(barras_labels),
            "barras_valores_json": json.dumps(barras_valores),
            "dona_valores_json": json.dumps([
                conteos["finalizadas"],
                conteos["en_ejecucion"],
                conteos["pendientes"],
                conteos["canceladas"],
            ]),
            "obras_progreso": lista_obras,
        })
        return context

class ReportesObrasView(TemplateView):
    """Pantalla de generación de reportes e historial."""

    template_name = "obras/reportes.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        hoy = timezone.localdate()

        reportes = ReporteGenerado.objects.select_related("generado_por").all()[:40]
        lista_reportes = []
        for rep in reportes:
            autor = "Administrador"
            if rep.generado_por:
                autor = rep.generado_por.get_full_name().strip() or rep.generado_por.username

            lista_reportes.append({
                "id": rep.id,
                "titulo": rep.titulo,
                "fecha_generacion": timezone.localtime(rep.fecha_generacion).strftime("%d/%m/%Y %H:%M"),
                "autor": autor,
                "formato": rep.formato,
                "secciones": rep.secciones_incluidas or [],
            })

        context["fecha_desde_default"] = hoy.replace(day=1).strftime("%Y-%m-%d")
        context["fecha_hasta_default"] = hoy.strftime("%Y-%m-%d")
        context["historial_reportes"] = lista_reportes
        return context


class GenerarReportePDFView(View):
    """Genera un reporte sencillo según fechas y checkboxes, y lo guarda en el historial."""

    def _clasificar(self, estado_raw: str):
        estado = (estado_raw or "").strip().lower()
        if estado in {"aprobada", "aprobadas", "finalizada", "finalizadas", "facturada", "completada", "validada"}:
            return "finalizadas"
        if estado in {"en_proceso", "en proceso", "en_curso", "en curso", "ejecucion", "en_ejecucion"}:
            return "en_ejecucion"
        if estado in {"cancelada", "canceladas", "anulada", "anuladas", "rechazada", "baja"}:
            return "canceladas"
        return "pendientes"

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            payload = request.POST.dict()

        desde_str = (payload.get("fecha_desde") or "").strip()
        hasta_str = (payload.get("fecha_hasta") or "").strip()
        opciones = payload.get("opciones") or {}

        if not desde_str or not hasta_str:
            return JsonResponse({"ok": False, "error": "Seleccione ambas fechas (Desde y Hasta)."}, status=400)

        try:
            fecha_desde = datetime.strptime(desde_str, "%Y-%m-%d").date()
            fecha_hasta = datetime.strptime(hasta_str, "%Y-%m-%d").date()
        except ValueError:
            return JsonResponse({"ok": False, "error": "Fechas no válidas."}, status=400)

        if fecha_desde > fecha_hasta:
            return JsonResponse({"ok": False, "error": "'Desde' no puede ser mayor que 'Hasta'."}, status=400)

        inc_total = bool(opciones.get("total_obras", True))
        inc_finalizadas = bool(opciones.get("finalizadas", True))
        inc_ejecucion = bool(opciones.get("en_ejecucion", True))
        inc_canceladas = bool(opciones.get("canceladas", True))
        inc_graficos = bool(opciones.get("graficos", True))

        if not any([inc_total, inc_finalizadas, inc_ejecucion, inc_canceladas, inc_graficos]):
            return JsonResponse({"ok": False, "error": "Marque al menos una opción en 'Información incluida'."}, status=400)

        ordenes = list(
            OrdenTrabajo.objects.select_related("cliente", "tecnico")
            .filter(fecha_programada__range=(fecha_desde, fecha_hasta))
            .order_by("fecha_programada", "id")
        )

        grupos = {"finalizadas": [], "en_ejecucion": [], "pendientes": [], "canceladas": []}
        for o in ordenes:
            grupos[self._clasificar(o.estado)].append({
                "cliente": o.cliente.razon_social if o.cliente else "Sin cliente",
                "servicio": o.tipo_servicio or "-",
                "tecnico": (o.tecnico.get_full_name().strip() or o.tecnico.username) if o.tecnico else "Sin asignar",
                "fecha": o.fecha_programada.strftime("%d/%m/%Y") if o.fecha_programada else "-",
                "motivo": (o.observacion_auditoria or "Sin motivo registrado.").strip(),
            })

        total = len(ordenes)
        pct_fin = round((len(grupos["finalizadas"]) / total) * 100, 1) if total > 0 else 0

        secciones = []
        if inc_total:
            secciones.append("Total de obras")
        if inc_finalizadas:
            secciones.append("Obras finalizadas")
        if inc_ejecucion:
            secciones.append("Obras en ejecución")
        if inc_canceladas:
            secciones.append("Obras canceladas y sus motivos")
        if inc_graficos:
            secciones.append("Gráficos de resultados")

        logo_url = request.build_absolute_uri(static("img/logo.png"))

        html_reporte = render_to_string(
            "obras/hoja_reporte.html",
            {
                "logo_url": logo_url,
                "nombre_empresa": "Frío y Agroindustria SpA",
                "fecha_desde": fecha_desde.strftime("%d/%m/%Y"),
                "fecha_hasta": fecha_hasta.strftime("%d/%m/%Y"),
                "inc_total": inc_total,
                "inc_finalizadas": inc_finalizadas,
                "inc_ejecucion": inc_ejecucion,
                "inc_canceladas": inc_canceladas,
                "inc_graficos": inc_graficos,
                "total_obras": total,
                "pct_finalizadas": pct_fin,
                "finalizadas": grupos["finalizadas"],
                "en_ejecucion": grupos["en_ejecucion"],
                "pendientes": grupos["pendientes"],
                "canceladas": grupos["canceladas"],
            },
        )

        titulo = f"Reporte de Obras ({fecha_desde.strftime('%d/%m/%Y')} - {fecha_hasta.strftime('%d/%m/%Y')})"
        rep = ReporteGenerado.objects.create(
            titulo=titulo,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            secciones_incluidas=secciones,
            formato="PDF",
            contenido_html=html_reporte,
            generado_por=request.user if request.user.is_authenticated else None,
        )

        return JsonResponse({"ok": True, "id": rep.id})


class VerReporteHTMLView(View):
    """Devuelve la hoja HTML del reporte guardado para mostrarla en grande o imprimir/guardar como PDF."""

    def get(self, request, pk, *args, **kwargs):
        rep = get_object_or_404(ReporteGenerado, pk=pk)
        return JsonResponse({"ok": True, "titulo": rep.titulo, "html": rep.contenido_html})