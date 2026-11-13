from django.views.generic import TemplateView

class Formulario(TemplateView):

    template_name = 'pwa/formulario_tecnico.html'

class Insumos(TemplateView):

    template_name = 'pwa/consumo_insumos.html'

class Solicitudes(TemplateView):

    template_name = 'pwa/solicitudes_insumos.html'