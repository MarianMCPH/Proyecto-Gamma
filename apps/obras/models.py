from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings

class Obra(models.Model):
    ESTADOS = [
        ('planificada', 'Planificada'),
        ('en_progreso', 'En Progreso'),
        ('finalizada', 'Finalizada'),
    ]

    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='obras_asignadas'
    )
    nombre = models.CharField(max_length=150)
    ubicacion = models.CharField(max_length=200)
    estado = models.CharField(max_length=30, choices=ESTADOS, default='en_progreso', db_index=True)
    fecha_inicio = models.DateField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'obras'
        indexes = [
            models.Index(fields=['tecnico', 'estado'], name='idx_obra_tecnico_estado'),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.get_estado_display()})"