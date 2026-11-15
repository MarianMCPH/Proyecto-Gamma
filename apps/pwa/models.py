from django.conf import settings
from django.db import models


class ActividadChecklist(models.Model):
    """Ítem de revisión configurado para un tipo de servicio específico."""

    tipo_servicio = models.ForeignKey(
        "obras.TipoServicio",
        on_delete=models.CASCADE,
        related_name="actividades_checklist",
    )
    descripcion = models.CharField(max_length=255)
    es_obligatoria = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=1)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = "ActividadChecklist"
        ordering = ["orden", "id"]

    def __str__(self):
        obligatoria = "Obligatoria" if self.es_obligatoria else "Opcional"
        return f"[{self.tipo_servicio.nombre}] {self.descripcion} ({obligatoria})"


class FormularioTecnico(models.Model):
    """Formulario técnico asociado a una orden de trabajo (soporta guardado en borrador)."""

    ESTADO_CHOICES = [
        ("BORRADOR", "Borrador"),
        ("COMPLETADO", "Completado"),
    ]

    orden_trabajo = models.OneToOneField(
        "obras.OrdenTrabajo",
        on_delete=models.CASCADE,
        related_name="formulario_tecnico",
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="formularios_tecnicos",
    )
    observaciones_tecnicas = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="BORRADOR")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "FormularioTecnico"

    def __str__(self):
        return f"Formulario OT #{self.orden_trabajo_id} ({self.estado})"


class RespuestaChecklist(models.Model):
    """Estado de cumplimiento de cada actividad dentro de un formulario técnico."""

    formulario = models.ForeignKey(
        FormularioTecnico,
        on_delete=models.CASCADE,
        related_name="respuestas",
    )
    actividad = models.ForeignKey(
        ActividadChecklist,
        on_delete=models.PROTECT,
        related_name="respuestas",
    )
    completada = models.BooleanField(default=False)
    observacion = models.CharField(max_length=255, blank=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "RespuestaChecklist"
        unique_together = ("formulario", "actividad")

    def __str__(self):
        estado = "OK" if self.completada else "Pendiente"
        return f"OT #{self.formulario.orden_trabajo_id} - {self.actividad.descripcion}: {estado}"