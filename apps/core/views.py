from django.shortcuts import render, redirect
from django.views import View
from django.views.generic import TemplateView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.utils import timezone
from django.db.models import F, Q
from apps.usuarios.models import PerfilUsuario
from apps.obras.models import OrdenTrabajo
from apps.inventario.models import Material, MovimientoInventario


class InicioEmpresaView(TemplateView):
    template_name = 'core/pagina_inicio.html'  # o 'core/inicio.html' si la guardaste ahí

class PWALoginView(View):
    template_name = 'core/login_pwa.html'

    def get(self, request):
        if request.user.is_authenticated:
            return self.redirigir_segun_rol(request.user)
        return render(request, self.template_name)

    def post(self, request):
        identificador = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        perfil = PerfilUsuario.objects.filter(rut__iexact=identificador).first()
        username_real = perfil.usuario.username if perfil else identificador

        user = authenticate(request, username=username_real, password=password)
        if user:
            login(request, user)
            return self.redirigir_segun_rol(user)

        messages.error(request, 'Usuario, RUT o contraseña incorrectos.')
        return render(request, self.template_name)

    def redirigir_segun_rol(self, user):
        if user.is_superuser:
            return redirect('core:dashboard')
        rol = getattr(getattr(user, 'perfil', None), 'rol', None)
        if rol and rol.nombre.strip().lower() == 'administrador':
            return redirect('core:dashboard')
        return redirect('obras:itinerario')


class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'core/dashboard_adm.html'
    login_url = 'core:login'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        hoy = timezone.localdate()

        # 1. KPIs superiores (conteo exacto de la base de datos)
        context['obras_hoy'] = OrdenTrabajo.objects.filter(fecha_programada=hoy).count()
        context['servicios_ejecucion'] = OrdenTrabajo.objects.filter(estado='en_proceso').count()
        context['emergencias_activas'] = OrdenTrabajo.objects.filter(
            estado__in=['programada', 'en_proceso']
        ).filter(
            Q(tipo_servicio__icontains='emergencia') |
            Q(tipo_servicio__icontains='urgente') |
            Q(observacion_auditoria__icontains='urgente') |
            Q(observacion_auditoria__icontains='emergencia') |
            Q(observacion_auditoria__icontains='critica') |
            Q(observacion_auditoria__icontains='crítica') |
            Q(observacion_auditoria__icontains='alta')
        ).count()
        context['finalizados_auditar'] = OrdenTrabajo.objects.filter(estado='pendiente_auditoria').count()

        # 2. Listado de obras activas para la tabla
        context['ordenes_activas'] = OrdenTrabajo.objects.filter(
            estado__in=['programada', 'en_proceso', 'observada']
        )

        # 3. Alertas de inventario
        context['alertas_stock'] = Material.objects.filter(stock_actual__lte=F('stock_minimo'))
        context['solicitudes_pendientes'] = MovimientoInventario.objects.filter(estado_validacion='pendiente')

        return context


class PWALogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('core:login')

    def post(self, request):
        logout(request)
        return redirect('core:login')