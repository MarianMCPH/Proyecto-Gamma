from django.urls import path
from .views import PWALoginView
from .views import DashboardView
from .views import PWALogoutView

app_name = 'core'

urlpatterns = [
    path('', PWALoginView.as_view(), name='login'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('logout/', PWALogoutView.as_view(), name='logout'),
]