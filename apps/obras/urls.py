from django.urls import path
from .views import ObraListView, ObraDetailView, ObraCreateView, ObraUpdateView, ObraDeleteView, ObraViewAdmin, AuditoriaObras, AuditarObraEspecifica

app_name = 'obras'

urlpatterns = [
    path('', ObraListView.as_view(), name='itinerario'),
    path('', ObraViewAdmin.as_view(), name='ver_obras'),
    path('detalle/', ObraDetailView.as_view(), name='detalle_obra'),
    path('crear/', ObraCreateView.as_view(), name='nueva_obra'),
    path('editar/', ObraUpdateView.as_view(), name='editar_obra'),
    path('eliminar/', ObraDeleteView.as_view(), name='eliminar_obra'),
    path('auditoria/', AuditoriaObras.as_view(), name='auditoria'),
    path('auditar_obra/', AuditarObraEspecifica.as_view(), name='auditar_obra'),
]