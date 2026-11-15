from django.conf import settings
from django.db import models


class TipoServicio(models.Model):
    """Catálogo de tipos de servicio técnico (define el checklist asociado)."""

    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "TipoServicio"

    def __str__(self):
        return self.nombre


class Obra(models.Model):
    """Obra o instalación donde se ejecutan los servicios de FYAG SpA."""

    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("EN_PROCESO", "En proceso"),
        ("PAUSADA", "Pausada"),
        ("FINALIZADA", "Finalizada"),
        ("CANCELADA", "Cancelada"),
    ]

    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=150)
    cliente_nombre = models.CharField(max_length=150)
    cliente_telefono = models.CharField(max_length=30, blank=True, null=True)
    direccion = models.CharField(max_length=255)
    comuna = models.CharField(max_length=100, blank=True, null=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)

    es_emergencia = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE")

    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_termino_estimada = models.DateField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Obra"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class OrdenTrabajo(models.Model):
    """Orden de trabajo asignada a un técnico dentro de una obra."""

    ESTADO_CHOICES = [
        ("ASIGNADA", "Asignada"),
        ("EN_CURSO", "En curso"),
        ("FINALIZADA", "Finalizada"),
        ("CANCELADA", "Cancelada"),
    ]

    ETAPA_CHOICES = [
        ("DETALLE", "Detalle de obra"),
        ("FORMULARIO", "Formulario técnico"),
        ("INSUMOS", "Consumo de insumos"),
        ("FINALIZADO", "Finalizado"),
    ]

    obra = models.ForeignKey(
        Obra,
        on_delete=models.CASCADE,
        related_name="ordenes_trabajo",
    )
    tipo_servicio = models.ForeignKey(
        TipoServicio,
        on_delete=models.PROTECT,
        related_name="ordenes_trabajo",
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ordenes_asignadas",
    )

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="ASIGNADA")
    etapa_actual = models.CharField(max_length=20, choices=ETAPA_CHOICES, default="DETALLE")

    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio_real = models.DateTimeField(blank=True, null=True)
    fecha_fin_real = models.DateTimeField(blank=True, null=True)

    gps_obtenido = models.BooleanField(default=False)
    latitud_inicio = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitud_inicio = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    class Meta:
        db_table = "OrdenTrabajo"

    def __str__(self):
        return f"OT #{self.id} - {self.obra.codigo} ({self.tipo_servicio.nombre})"