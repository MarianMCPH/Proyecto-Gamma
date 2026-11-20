from django.urls import path

# codigo agregado por Luciano
from .views import SolicitudInsumo, DetalleSolicitudView
from .views import (
    KitHerramientasView,
    DetalleKitView,
    EditarKitView,
    EliminarKitView,
)

app_name = 'inventario'

urlpatterns = [
    path('', SolicitudInsumo.as_view(), name='solicitudes'),
    
    # codigo agregado por Luciano
    path('detalle/', DetalleSolicitudView.as_view(), name='detalle_solicitud'),

    # Modulo de Kit de herramientas
    path('kits/', KitHerramientasView.as_view(), name='kits_herramientas'),
    path('kits/<int:pk>/', DetalleKitView.as_view(), name='detalle_kit'),
    path('kits/<int:pk>/editar/', EditarKitView.as_view(), name='editar_kit'),
    path('kits/<int:pk>/eliminar/', EliminarKitView.as_view(), name='eliminar_kit'),
]