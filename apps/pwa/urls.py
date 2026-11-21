from django.urls import path
from .views import (
    Formulario,
    Insumos,
    Solicitudes,
    Evidencias,
    FirmaMandante,
    SincronizacionFinal,
)

app_name = 'pwa'

urlpatterns = [
    path('', Formulario.as_view(), name='formulario'),
    path('orden/<int:orden_id>/formulario/', Formulario.as_view(), name='formulario_orden'),
    path('insumos/', Insumos.as_view(), name='insumos'),
    path('orden/<int:orden_id>/insumos/', Insumos.as_view(), name='insumos_orden'),
    path('solicitudes/', Solicitudes.as_view(), name='solicitudes'),
    path('orden/<int:orden_id>/solicitudes/', Solicitudes.as_view(), name='solicitudes_orden'),
    path('evidencias/', Evidencias.as_view(), name='evidencias'),
    path('orden/<int:orden_id>/evidencias/', Evidencias.as_view(), name='evidencias_orden'),
    path('firma/', FirmaMandante.as_view(), name='firma'),
    path('orden/<int:orden_id>/firma/', FirmaMandante.as_view(), name='firma_orden'),
    path('sincronizacion/', SincronizacionFinal.as_view(), name='sincronizacion'),
    path('orden/<int:orden_id>/sincronizacion/', SincronizacionFinal.as_view(), name='sincronizacion_orden'),
]