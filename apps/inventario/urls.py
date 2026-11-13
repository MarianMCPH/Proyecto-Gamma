from django.urls import path
from .views import SolicitudInsumo

app_name = 'inventario'

urlpatterns = [
    path('', SolicitudInsumo.as_view(), name='solicitudes'),

]