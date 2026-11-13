from django.urls import path
from .views import PWALoginView

app_name = 'core'

urlpatterns = [
    path('', PWALoginView.as_view(), name='login'),

]