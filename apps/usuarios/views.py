from django.views.generic import TemplateView


class UsuariosView(TemplateView):
    template_name = 'usuarios/personal_usuarios.html'

class NuevoUsuario(TemplateView):
    template_name = 'usuarios/nuevo_usuario.html'