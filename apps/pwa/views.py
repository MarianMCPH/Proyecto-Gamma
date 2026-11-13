from django.views.generic import TemplateView

class Formulario(TemplateView):

    template_name = 'pwa/formulario_tecnico.html'

class Insumos(TemplateView):

    template_name = 'pwa/consumo_insumos.html'

class Solicitudes(TemplateView):

    template_name = 'pwa/solicitudes_insumos.html'

class Evidencias(TemplateView):

    template_name = 'pwa/evidencia_fotografica.html'

class FirmaMandante(TemplateView):

    template_name = 'pwa/firma_mandante.html'

class SincronizacionFinal(TemplateView):

    template_name = 'pwa/sincronizacion_faena.html'