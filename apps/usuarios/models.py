from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings

class PerfilUsuario(models.Model):
    ROLES = [
        ('admin', 'Administrador'),
        ('tecnico', 'Técnico Agrícola'),
    ]

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil'
    )
    rol = models.CharField(max_length=20, choices=ROLES, default='tecnico', db_index=True)
    telefono = models.CharField(max_length=20, blank=True)
    zona_asignada = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'perfiles_usuario'

    def __str__(self):
        return f"{self.usuario.username} ({self.get_rol_display()})"