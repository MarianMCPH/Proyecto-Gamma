from django.urls import path
from .views import ObraListView, ObraDetailView, ObraCreateView, ObraUpdateView, ObraDeleteView

app_name = 'obras'

urlpatterns = [
    path('', ObraListView.as_view(), name='itinerario'),
    path('detalle/', ObraDetailView.as_view(), name='detalle_obra'),
    path('crear/', ObraCreateView.as_view(), name='crear_obra'),
    path('editar', ObraUpdateView.as_view(), name='editar_obra'),
    path('eliminar', ObraDeleteView.as_view(), name='eliminar_obra'),
]