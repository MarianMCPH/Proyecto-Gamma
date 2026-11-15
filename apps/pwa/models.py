from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings

class ChecklistTecnico(models.Model):
    obra = models.ForeignKey(
        'obras.Obra',
        on_delete=models.CASCADE,
        related_name='checklists'
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='checklists_realizados'
    )
    fecha_revision = models.DateField(auto_now_add=True, db_index=True)
    observaciones = models.TextField(blank=True)
    evidencia_foto = models.ImageField(upload_to='evidencias_pwa/', null=True, blank=True)
    aprobado = models.BooleanField(default=False)

    class Meta:
        db_table = 'checklists'
        indexes = [
            models.Index(fields=['obra', 'fecha_revision'], name='idx_chk_obra_fecha'),
        ]

    def __str__(self):
        return f"Checklist {self.obra.nombre} - {self.fecha_revision}"