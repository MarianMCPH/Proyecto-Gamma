from django.db import models

# Create your models here.
from django.db import models

class Inventario(models.Model):
    ESTADOS_MATERIAL = [
        ('operativo', 'Operativo'),
        ('desgastado', 'Desgastado'),
        ('requiere_reposicion', 'Requiere Reposición'),
    ]

    obra = models.ForeignKey(
        'obras.Obra',
        on_delete=models.CASCADE,
        related_name='items_inventario'
    )
    item = models.CharField(max_length=120, db_index=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado_material = models.CharField(max_length=40, choices=ESTADOS_MATERIAL, default='operativo')
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventario'
        indexes = [
            models.Index(fields=['obra', 'estado_material'], name='idx_inv_obra_estado'),
        ]

    def __str__(self):
        return f"{self.item} - {self.obra.nombre}"