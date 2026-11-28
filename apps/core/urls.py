from django.urls import path
from . import views


app_name = 'core'

urlpatterns = [
    path('', views.InicioEmpresaView.as_view(), name='inicio'),
    path('login/', views.PWALoginView.as_view(), name='login'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('logout/', views.PWALogoutView.as_view(), name='logout'),
]