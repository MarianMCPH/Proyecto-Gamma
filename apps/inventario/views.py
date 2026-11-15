from django.views.generic import TemplateView


class SolicitudInsumo(TemplateView):
    """Vista para listar y filtrar las solicitudes de insumos enviadas desde terreno."""
    template_name = 'inventario/solicitudes_insumos.html'


class DetalleSolicitudView(TemplateView):
    """Vista para revisar, aprobar o rechazar el detalle de una solicitud de insumos."""
    template_name = 'inventario/detalle_solicitud.html'