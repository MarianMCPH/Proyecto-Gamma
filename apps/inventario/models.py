from django.conf import settings
from django.db import models


class Material(models.Model):
    """Catálogo de insumos, repuestos y materiales de bodega / bodega móvil."""

    # Campos base del diagrama relacional para Material
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=50, unique=True)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unidad_medida = models.CharField(max_length=30)

    # Umbral para alertas de stock bajo/crítico en el panel administrativo
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "Material"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class MovimientoInventario(models.Model):
    """Registro de movimientos de inventario (consumo en obra, ingresos o reversas) y trazabilidad Cardex."""

    TIPOS_MOVIMIENTO = [
        ("consumo", "Consumo en obra"),
        ("ingreso", "Ingreso a bodega"),
        ("reversa", "Reversa compensatoria"),
    ]

    # Relaciones del diagrama (FK material_id, FK orden_id, FK usuario_id)
    material = models.ForeignKey(
        Material, on_delete=models.PROTECT, related_name="movimientos"
    )
    orden = models.ForeignKey(
        "obras.OrdenTrabajo",
        on_delete=models.PROTECT,
        related_name="movimientos_inventario",
        null=True,
        blank=True,
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="movimientos_inventario",
    )

    # Campos base del diagrama para MovimientoInventario y sincronización offline/online
    uuid_sync = models.CharField(max_length=64, unique=True, null=True, blank=True)
    tipo_mov = models.CharField(max_length=30, choices=TIPOS_MOVIMIENTO, default="consumo")
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=255, blank=True, null=True)

    # Estado de validación/despacho para solicitudes o movimientos revisados en administración
    estado_validacion = models.CharField(max_length=30, default="pendiente")

    class Meta:
        db_table = "MovimientoInventario"

    def __str__(self):
        return f"{self.get_tipo_mov_display()} - {self.material.nombre} ({self.cantidad} {self.material.unidad_medida})"