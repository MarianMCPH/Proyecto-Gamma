from django.urls import path

from .views import (
    CrearKitView,
    DetalleKitView,
    DetalleSolicitudView,
    EditarKitView,
    EliminarKitView,
    KitHerramientasView,
    NuevoMaterialView,
    SolicitudInsumo,
)

app_name = "inventario"

urlpatterns = [
    path("", SolicitudInsumo.as_view(), name="solicitudes"),
    # codigo agregado por Luciano
    path("detalle/", DetalleSolicitudView.as_view(), name="detalle_solicitud"),
    path("kits/", KitHerramientasView.as_view(), name="kits_herramientas"),
    path("kits/nuevo/", CrearKitView.as_view(), name="crear_kit"),
    path("kits/<int:pk>/", DetalleKitView.as_view(), name="detalle_kit"),
    path("kits/<int:pk>/editar/", EditarKitView.as_view(), name="editar_kit"),
    path("kits/<int:pk>/eliminar/", EliminarKitView.as_view(), name="eliminar_kit"),
    path("materiales/nuevo/", NuevoMaterialView.as_view(), name="nuevo_material"),
]