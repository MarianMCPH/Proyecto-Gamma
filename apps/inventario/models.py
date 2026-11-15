from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Insumo(models.Model):
    """Material o insumo disponible en el inventario central de FYAG SpA."""

    UNIDAD_CHOICES = [
        ("UN", "Unidad"),
        ("MT", "Metro"),
        ("KG", "Kilogramo"),
        ("LT", "Litro"),
        ("CJ", "Caja"),
    ]

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    unidad_medida = models.CharField(max_length=10, choices=UNIDAD_CHOICES, default="UN")
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "Insumo"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.stock_actual} {self.unidad_medida})"


class ConsumoInsumo(models.Model):
    """Registro de insumos utilizados en una orden de trabajo."""

    orden_trabajo = models.ForeignKey(
        "obras.OrdenTrabajo",
        on_delete=models.PROTECT,
        related_name="consumos_insumos",
    )
    insumo = models.ForeignKey(
        Insumo,
        on_delete=models.PROTECT,
        related_name="consumos",
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="consumos_registrados",
    )
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    confirmado = models.BooleanField(default=False)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_confirmacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "ConsumoInsumo"

    def __str__(self):
        return f"OT #{self.orden_trabajo_id} - {self.insumo.nombre}: {self.cantidad}"


class MovimientoInventario(models.Model):
    """Historial de movimientos para actualizar y auditar el inventario central."""

    TIPO_CHOICES = [
        ("ENTRADA", "Entrada a bodega"),
        ("SALIDA_CONSUMO", "Salida por consumo en OT"),
        ("AJUSTE", "Ajuste de inventario"),
    ]

    insumo = models.ForeignKey(
        Insumo,
        on_delete=models.PROTECT,
        related_name="movimientos",
    )
    orden_trabajo = models.ForeignKey(
        "obras.OrdenTrabajo",
        on_delete=models.SET_NULL,
        related_name="movimientos_inventario",
        blank=True,
        null=True,
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="movimientos_inventario",
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    stock_anterior = models.DecimalField(max_digits=10, decimal_places=2)
    stock_nuevo = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "MovimientoInventario"

    def __str__(self):
        return f"{self.tipo} - {self.insumo.nombre} ({self.cantidad})"


class SolicitudInsumo(models.Model):
    """Solicitud de insumos adicionales realizada por el técnico desde terreno."""

    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("APROBADA", "Aprobada"),
        ("RECHAZADA", "Rechazada"),
        ("DESPACHADA", "Despachada"),
    ]

    orden_trabajo = models.ForeignKey(
        "obras.OrdenTrabajo",
        on_delete=models.CASCADE,
        related_name="solicitudes_insumos",
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="solicitudes_insumos",
    )
    motivo = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE")
    fecha_solicitud = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "SolicitudInsumo"

    def __str__(self):
        return f"Solicitud #{self.id} - OT #{self.orden_trabajo_id} ({self.estado})"


class DetalleSolicitudInsumo(models.Model):
    """Ítems solicitados dentro de una solicitud de insumos adicionales."""

    solicitud = models.ForeignKey(
        SolicitudInsumo,
        on_delete=models.CASCADE,
        related_name="detalles",
    )
    insumo = models.ForeignKey(
        Insumo,
        on_delete=models.PROTECT,
        related_name="detalles_solicitud",
    )
    cantidad_solicitada = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    class Meta:
        db_table = "DetalleSolicitudInsumo"

    def __str__(self):
        return f"Solicitud #{self.solicitud_id}: {self.cantidad_solicitada} {self.insumo.nombre}"