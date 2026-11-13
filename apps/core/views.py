from django.views.generic import TemplateView

# Vista para el Login de la PWA
class PWALoginView(TemplateView):
    template_name = 'core/login_pwa.html'

class DashboardView(TemplateView):
    template_name = 'core/dashboard_adm.html'
