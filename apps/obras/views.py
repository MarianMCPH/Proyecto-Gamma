from datetime import datetime
from django.contrib.auth import get_user_model
from django.db import DatabaseError, transaction
from django.http import JsonResponse
from django.utils.dateparse import parse_datetime
from django.views.generic import TemplateView

from .models import Cliente, OrdenTrabajo

Usuario = get_user_model()

class ObraListView(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el tecnico."""

    template_name = 'obras/itinerario.html'


class ObraDetailView(TemplateView):
    """Vista para ver el detalle completo de una obra específica."""

    template_name = 'obras/detalles.obras.html'


class ObraCreateView(TemplateView):
    """Vista para crear/registrar una nueva orden de trabajo u obra."""

    template_name = "obras/nueva_orden.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["tecnicos"] = Usuario.objects.filter(is_active=True).order_by("first_name", "username")
        return context

    def post(self, request, *args, **kwargs):
        print("POST recibido:", request.POST.dict())

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
                tecnico = Usuario.objects.get(pk=tecnico_id)
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
            print("ERROR: No existe usuario con pk =", tecnico_id)
            return JsonResponse(
                {"ok": False, "error": "El técnico seleccionado no existe en la base de datos."},
                status=400,
            )
        except Exception as e:
            print("ERROR AL GUARDAR ORDEN:", repr(e))
            return JsonResponse(
                {"ok": False, "error": "Ocurrió un problema al guardar en la base de datos. Vuelva a intentarlo."},
                status=500,
            )

class ObraUpdateView(TemplateView):
    """Vista para editar una obra existente."""

    template_name = 'obras/editar_obra.html'

class ObraDeleteView(TemplateView):
    """Vista para eliminar o dar de baja una obra."""

    template_name = 'obras/eliminar_obra.html'

class ObraViewAdmin(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el administrador."""

    template_name = 'obras/gestion_obras_adm.html'

class AuditoriaObras(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el administrador."""

    template_name = 'obras/auditoria_obras.html'

class AuditarObraEspecifica(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el administrador."""

    template_name = 'obras/auditar_obra_especifica.html'