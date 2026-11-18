from django.urls import path
from .views import (
    ObraListView, ObraDetailView, ObraCreateView, ObraUpdateView, 
    ObraDeleteView, ObraViewAdmin, AuditoriaObras, AuditarObraEspecifica, 
    LimpiarAuditoriaView, OcultarGestionObraView
)

app_name = 'obras'

urlpatterns = [
    path('', ObraListView.as_view(), name='itinerario'),
    path('gestion/', ObraViewAdmin.as_view(), name='ver_obras'),
    path('gestion/ocultar/', OcultarGestionObraView.as_view(), name='ocultar_gestion_obra'),
    path('detalle/', ObraDetailView.as_view(), name='detalle_obra'),
    path('crear/', ObraCreateView.as_view(), name='nueva_obra'),
    path('editar/', ObraUpdateView.as_view(), name='editar_obra'),
    path('eliminar/', ObraDeleteView.as_view(), name='eliminar_obra'),
    path('auditoria/', AuditoriaObras.as_view(), name='auditoria'),
    path('auditoria/limpiar/', LimpiarAuditoriaView.as_view(), name='limpiar_auditoria'),
    path('auditar_obra/', AuditarObraEspecifica.as_view(), name='auditar_obra'),
]