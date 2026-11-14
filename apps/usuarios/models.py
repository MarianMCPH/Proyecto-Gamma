from django.conf import settings
from django.db import models


class Rol(models.Model):
    """Rol del usuario (ej. Técnico, Administrador)."""
    nombre_rol = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'Rol'

    def __str__(self):
        return self.nombre_rol


class PerfilUsuario(models.Model):
    """Datos extra del User de Django (RUT, teléfono, dirección, foto y rol)."""
    ESTADOS = [('activo', 'Activo'), ('inactivo', 'Inactivo')]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='perfil'
    )
    rol = models.ForeignKey(
        Rol, on_delete=models.PROTECT, null=True, blank=True, related_name='usuarios'
    )
    rut = models.CharField(max_length=12, unique=True)
    telefono = models.CharField(max_length=20)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    foto_perfil = models.ImageField(upload_to='perfiles/', blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activo')
    requiere_cambio_password = models.BooleanField(default=True)

    class Meta:
        db_table = 'PerfilUsuario'

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.rut})"