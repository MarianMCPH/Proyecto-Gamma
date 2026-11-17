from django.urls import path
from .views import Formulario,Insumos,Solicitudes, Evidencias, FirmaMandante, SincronizacionFinal
from .views import ApiSolicitud, ApiCancelarSolicitud, ApiEvidencia, ApiCerrarFaena

app_name = 'pwa'

urlpatterns = [
    path('', Formulario.as_view(), name='formulario'),
    path('insumos/', Insumos.as_view(), name='insumos'),
    path('solicitudes/', Solicitudes.as_view(), name='solicitudes'),
    path('evidencias/', Evidencias.as_view(), name='evidencias'),
    path('firma/', FirmaMandante.as_view(), name='firma'),
    path('sincronizacion/', SincronizacionFinal.as_view(), name='sincronizacion'),

    # API de la cola de sincronización offline (static/js/faena_store.js)
    path('api/solicitud/', ApiSolicitud.as_view(), name='api_solicitud'),
    path('api/solicitud/cancelar/', ApiCancelarSolicitud.as_view(), name='api_cancelar_solicitud'),
    path('api/evidencia/', ApiEvidencia.as_view(), name='api_evidencia'),
    path('api/cerrar-faena/', ApiCerrarFaena.as_view(), name='api_cerrar_faena'),
]
