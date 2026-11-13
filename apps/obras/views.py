from django.views.generic import TemplateView

class ObraListView(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas para el tecnico."""

    template_name = 'obras/itinerario.html'


class ObraDetailView(TemplateView):
    """Vista para ver el detalle completo de una obra específica."""

    template_name = 'obras/detalles.obras.html'


class ObraCreateView(TemplateView):
    """Vista para crear/registrar una nueva orden de trabajo u obra."""

    template_name = 'obras/nueva_orden.html'

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