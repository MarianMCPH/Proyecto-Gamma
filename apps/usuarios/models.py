from django.conf import settings
from django.db import models


class Rol(models.Model):
    """Rol funcional dentro de FYAG SpA (ej. Tecnico, Administrador)."""

    # Nombre identificador del rol asignado al usuario
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        db_table = "Rol"

    def __str__(self):
        return self.nombre


class PerfilUsuario(models.Model):
    """Extensión del modelo User de Django con datos operativos y de contacto del trabajador."""

    # Relación uno a uno con el usuario base de Django (su contraseña se hashea con Bcrypt vía set_password)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )

    # Rol funcional del trabajador en el sistema
    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        related_name="perfiles",
        null=True,
        blank=True,
    )

    # Datos de identificación y contacto requeridos en el formulario
    rut = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=30, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)

    # Marca si el usuario debe cambiar su contraseña temporal al primer inicio de sesión
    requiere_cambio_password = models.BooleanField(default=True)

    class Meta:
        db_table = "PerfilUsuario"

    def __str__(self):
        nombre_completo = self.usuario.get_full_name() or self.usuario.username
        rol_nombre = self.rol.nombre if self.rol else "Sin rol"
        return f"{nombre_completo} ({rol_nombre})"