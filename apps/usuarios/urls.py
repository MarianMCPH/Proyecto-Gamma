from django.urls import path
from .views import UsuariosView, NuevoUsuario

app_name = 'usuarios'

urlpatterns = [
    path('', UsuariosView.as_view(), name='ver_usuarios'),
    path('nuevo_usuario/', NuevoUsuario.as_view(), name='nuevo_usuario'),
]