from django.urls import path
from .views import Formulario,Insumos,Solicitudes, Evidencias, FirmaMandante, SincronizacionFinal

app_name = 'pwa'

urlpatterns = [
    path('', Formulario.as_view(), name='formulario'),
    path('insumos/', Insumos.as_view(), name='insumos'),
    path('solicitudes/', Solicitudes.as_view(), name='solicitudes'),
    path('evidencias/', Evidencias.as_view(), name='evidencias'),
    path('firma/', FirmaMandante.as_view(), name='firma'),
    path('sincronizacion/', SincronizacionFinal.as_view(), name='sincronizacion'),
]