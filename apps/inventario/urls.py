from django.urls import path
from . import views

app_name = "inventario"

urlpatterns = [
    path("solicitudes/", views.SolicitudInsumo.as_view(), name="solicitudes"),
    path("solicitudes/limpiar/", views.LimpiarSolicitudesInsumoView.as_view(), name="limpiar_solicitudes"),
    path("solicitudes/detalle/", views.DetalleSolicitudView.as_view(), name="detalle_solicitud"),
    
]