from django.urls import path
from .views import PWALoginView
from .views import DashboardView

app_name = 'core'

urlpatterns = [
    path('', PWALoginView.as_view(), name='login'),
    path('', DashboardView.as_view(), name='dashboard'),
]