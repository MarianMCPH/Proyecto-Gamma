from datetime import datetime
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.views import View
from django.views.generic import TemplateView

from .models import Cliente, OrdenTrabajo

Usuario = get_user_model()
CLAVE_SESION_AUDITORIA = "ordenes_ocultas_auditoria"


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
    """Vista para ver el detalle completo de una obra específica."""

    template_name = "obras/detalles.obras.html"


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
    """Vista para editar una obra existente."""

    template_name = "obras/editar_obra.html"


class ObraDeleteView(TemplateView):
    """Vista para eliminar o dar de baja una obra."""

    template_name = "obras/eliminar_obra.html"


class ObraViewAdmin(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el administrador."""

    template_name = "obras/gestion_obras_adm.html"


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
    """Vista para auditar una obra específica."""

    template_name = "obras/auditar_obra_especifica.html"