from django.urls import path
from . import views

app_name = "inventario"

urlpatterns = [
    path("", views.SolicitudInsumo.as_view(), name="solicitudes"),
    # codigo agregado por Luciano
    path("detalle/", views.DetalleSolicitudView.as_view(), name="detalle_solicitud"),
    path("kits/", views.KitHerramientasView.as_view(), name="kits_herramientas"),
    path("kits/nuevo/", views.CrearKitView.as_view(), name="crear_kit"),
    path("kits/<int:pk>/",views.DetalleKitView.as_view(), name="detalle_kit"),
    path("kits/<int:pk>/editar/", views.EditarKitView.as_view(), name="editar_kit"),
    path("kits/<int:pk>/eliminar/", views.EliminarKitView.as_view(), name="eliminar_kit"),
    path("materiales/nuevo/", views.NuevoMaterialView.as_view(), name="nuevo_material"),
    path("limpiar/", views.LimpiarSolicitudes.as_view(), name="limpiar_solicitudes"),
]