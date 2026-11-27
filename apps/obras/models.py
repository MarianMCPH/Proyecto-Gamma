from django.conf import settings
from django.db import models


class Cliente(models.Model):
    """Mandante o empresa cliente que solicita obras y recibe servicios."""

    razon_social = models.CharField(max_length=200)
    rut = models.CharField(max_length=20, unique=True)
    direccion = models.CharField(max_length=255)
    contacto = models.CharField(max_length=150)

    class Meta:
        db_table = "Cliente"

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


class OrdenTrabajo(models.Model):
    """Obra o servicio asignado a un técnico para un cliente, gestionado en web y PWA."""

    ESTADOS = [
        ("programada", "Programada"),
        ("en_proceso", "En proceso"),
        ("pendiente_auditoria", "Pendiente de auditoría"),
        ("aprobada", "Aprobada"),
        ("observada", "Observada"),
        ("facturada", "Facturada"),
    ]

    cliente = models.ForeignKey(
        Cliente, on_delete=models.PROTECT, related_name="ordenes_trabajo"
    )
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ordenes_asignadas",
    )

    tipo_servicio = models.CharField(max_length=100)
    fecha_programada = models.DateField()
    direccion = models.CharField(max_length=255)
    estado = models.CharField(max_length=30, choices=ESTADOS, default="programada")
    presupuesto_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    kit = models.ForeignKey(
        "inventario.KitHerramientas",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_trabajo",
    )

    latitud_inicio = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitud_inicio = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    fecha_inicio_faena = models.DateTimeField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    auditor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ordenes_auditadas",
        null=True,
        blank=True,
    )
    fecha_auditoria = models.DateTimeField(null=True, blank=True)
    observacion_auditoria = models.TextField(blank=True, null=True)
    inmutable = models.BooleanField(default=False)
    desactivada_gestion = models.BooleanField(default=False)

    class Meta:
        db_table = "OrdenTrabajo"

    def __str__(self):
        return f"OT #{self.pk} - {self.cliente.razon_social}"


class Checklist(models.Model):
    """Protocolo de revisión técnica asociado a una orden de trabajo en la PWA."""

    orden = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="checklists"
    )
    uuid_sync = models.CharField(max_length=64, unique=True, null=True, blank=True)
    categoria_faena = models.CharField(max_length=120)
    fecha_ejecucion = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "Checklist"

    def __str__(self):
        return f"Checklist #{self.pk} - OT #{self.orden.pk}"


class DetalleChecklist(models.Model):
    """Ítems individuales del checklist técnico y su validación obligatoria."""

    checklist = models.ForeignKey(
        Checklist, on_delete=models.CASCADE, related_name="detalles"
    )
    item = models.CharField(max_length=255)
    resultado = models.CharField(max_length=255)
    obligatorio = models.BooleanField(default=True)

    class Meta:
        db_table = "DetalleChecklist"

    def __str__(self):
        return f"{self.item}: {self.resultado}"


class EvidenciaFotografica(models.Model):
    """Respaldo fotográfico capturado en la PWA con compresión (< 500 KB) y tolerancia a red."""

    orden = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="evidencias"
    )
    uuid_sync = models.CharField(max_length=64, unique=True, null=True, blank=True)
    url_imagen = models.ImageField(upload_to="evidencias_obras/")
    peso_kb = models.PositiveIntegerField(null=True, blank=True)
    fecha_captura = models.DateTimeField(auto_now_add=True)

    # Qué muestra la foto y la observación del técnico (los envía la PWA)
    TIPO_ANTES = "antes"
    TIPO_DESPUES = "despues"
    TIPO_FALLA = "falla"
    TIPO_CHOICES = [
        (TIPO_ANTES, "Antes"),
        (TIPO_DESPUES, "Después"),
        (TIPO_FALLA, "Falla (solicitud de insumos)"),
    ]
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, blank=True, default="")
    descripcion = models.TextField(blank=True, default="")

    class Meta:
        db_table = "EvidenciaFotografica"

    def __str__(self):
        return f"Evidencia #{self.pk} - OT #{self.orden.pk}"


class FirmaDigital(models.Model):
    """Conformidad del mandante en la PWA mediante lienzo táctil Canvas e inmutabilidad."""

    orden = models.OneToOneField(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="firma_digital"
    )
    uuid_sync = models.CharField(max_length=64, unique=True, null=True, blank=True)
    imagen_base64_url = models.TextField()
    nombre_firmante = models.CharField(max_length=150)
    fecha = models.DateTimeField(auto_now_add=True)

    rut_firmante = models.CharField(max_length=20, blank=True, null=True)
    cargo_firmante = models.CharField(max_length=120, blank=True, null=True)
    hash_integridad = models.CharField(max_length=128, blank=True, null=True)

    class Meta:
        db_table = "FirmaDigital"

    def __str__(self):
        return f"Firma OT #{self.orden.pk} - {self.nombre_firmante}"


class Presupuesto(models.Model):
    """Presupuestos o hallazgos/requerimientos adicionales asociados a una orden de trabajo."""

    orden = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="presupuestos"
    )
    uuid_sync = models.CharField(max_length=64, unique=True, null=True, blank=True)
    descripcion = models.TextField()
    monto_estimado = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.CharField(max_length=40)

    class Meta:
        db_table = "Presupuesto"

    def __str__(self):
        return f"Presupuesto #{self.pk} - OT #{self.orden.pk}"


class ReporteGenerado(models.Model):
    """Historial de reportes generados desde el Panel Administrativo."""

    titulo = models.CharField(max_length=180)
    fecha_desde = models.DateField()
    fecha_hasta = models.DateField()
    secciones_incluidas = models.JSONField(default=list, blank=True)
    formato = models.CharField(max_length=10, default="PDF")
    contenido_html = models.TextField()
    generado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reportes_generados",
    )
    fecha_generacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reportegenerado"
        ordering = ["-fecha_generacion", "-id"]

    def __str__(self):
        return f"{self.titulo} ({self.fecha_desde} al {self.fecha_hasta})"
