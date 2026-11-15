from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

class ChecklistTecnico(models.Model):
    obra = models.ForeignKey('obras.Obra', on_delete=models.CASCADE, related_name='checklists')
    tecnico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='checklists_realizados')
    fecha_revision = models.DateField(auto_now_add=True, db_index=True)
    observaciones = models.TextField(blank=True)
    aprobado = models.BooleanField(default=False)

    class Meta:
        db_table = 'checklists'
        indexes = [
            models.Index(fields=['obra', 'fecha_revision'], name='idx_chk_obra_fecha'),
        ]

class EvidenciaFotografica(models.Model):
    obra = models.ForeignKey('obras.Obra', on_delete=models.CASCADE, related_name='evidencias')
    url_imagen = models.ImageField(
        upload_to='evidencias/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])]
    )
    peso_bytes = models.PositiveIntegerField(default=0)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'evidencias_fotograficas'

    def save(self, *args, **kwargs):
        if self.url_imagen:
            self.peso_bytes = self.url_imagen.size
        super().save(*args, **kwargs)

class FirmaDigital(models.Model):
    obra = models.OneToOneField('obras.Obra', on_delete=models.CASCADE, related_name='firma_cliente')
    url_imagen = models.ImageField(
        upload_to='firmas/',
        validators=[FileExtensionValidator(allowed_extensions=['png', 'jpg', 'jpeg'])]
    )
    firmante = models.CharField(max_length=150)
    peso_bytes = models.PositiveIntegerField(default=0)
    fecha_firma = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'firmas_digitales'

    def save(self, *args, **kwargs):
        if self.url_imagen:
            self.peso_bytes = self.url_imagen.size
        super().save(*args, **kwargs)