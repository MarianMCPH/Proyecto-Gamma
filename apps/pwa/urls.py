from django.urls import path
from .views import PWAItinerarioView

app_name = 'pwa'

urlpatterns = [
    path('', PWAItinerarioView.as_view(), name='itinerario'),
]