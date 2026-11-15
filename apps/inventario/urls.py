from django.urls import path
# codigo agregado por Luciano
from .views import SolicitudInsumo, DetalleSolicitudView

app_name = 'inventario'

urlpatterns = [
    path('', SolicitudInsumo.as_view(), name='solicitudes'),
    
    # codigo agregado por Luciano
    path('detalle/', DetalleSolicitudView.as_view(), name='detalle_solicitud'),
]