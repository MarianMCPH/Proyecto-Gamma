from django.views.generic import TemplateView

class ObraListView(TemplateView):
    """Vista para listar y buscar todas las obras activas y finalizadas."""

    template_name = 'obras/itinerario.html'


class ObraDetailView(TemplateView):
    """Vista para ver el detalle completo de una obra específica."""

    template_name = 'obras/detalles.obras.html'


class ObraCreateView(TemplateView):
    """Vista para crear/registrar una nueva orden de trabajo u obra."""

    template_name = 'obras/crear_obra.html'

class ObraUpdateView(TemplateView):
    """Vista para editar una obra existente."""

    template_name = 'obras/editar_obra.html'

class ObraDeleteView(TemplateView):
    """Vista para eliminar o dar de baja una obra."""

    template_name = 'obras/eliminar_obra.html'
