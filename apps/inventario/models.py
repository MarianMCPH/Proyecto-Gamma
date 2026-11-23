from decimal import Decimal

<<<<<<< HEAD
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
=======
from django.conf import settings
from django.db import models
from django.db.models import F, Sum


class Material(models.Model):
    """Catálogo de insumos, repuestos y materiales de bodega / bodega móvil."""

    # Campos base del diagrama relacional para Material
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=50, unique=True)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unidad_medida = models.CharField(max_length=30)

    # Umbral para alertas de stock bajo/crítico en el panel administrativo
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Precio unitario base para presupuestos y kits de herramientas
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "Material"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class KitHerramientas(models.Model):
    """Kit de materiales y herramientas asociado a un tipo de servicio."""

    nombre = models.CharField(max_length=150)
    tipo_servicio = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "KitHerramientas"
        ordering = ["-id"]

    def __str__(self):
        return f"{self.nombre} ({self.tipo_servicio})"

    @property
    def total_presupuesto(self):
        """Calcula automáticamente el presupuesto total del kit."""
        total = self.detalles.aggregate(
            total=Sum(F("cantidad") * F("precio_unitario"))
        )["total"]
        return total if total is not None else Decimal("0.00")


class DetalleKitHerramienta(models.Model):
    """Material incluido dentro de un kit con su cantidad y precio unitario."""

    kit = models.ForeignKey(
        KitHerramientas, on_delete=models.CASCADE, related_name="detalles"
    )
    material = models.ForeignKey(
        Material, on_delete=models.PROTECT, related_name="detalles_kit"
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "DetalleKitHerramienta"
        unique_together = ("kit", "material")

    @property
    def subtotal(self):
        return (self.cantidad or Decimal("0")) * (self.precio_unitario or Decimal("0"))

    def __str__(self):
        return f"{self.material.nombre} x{self.cantidad} ({self.kit.nombre})"


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
>>>>>>> origin/main
