from django.urls import path
from .views import Formulario,Insumos,Solicitudes

app_name = 'pwa'

urlpatterns = [
    path('', Formulario.as_view(), name='formulario'),
    path('insumos/', Insumos.as_view(), name='insumos'),
    path('solicitudes/', Solicitudes.as_view(), name='solicitudes'),
]