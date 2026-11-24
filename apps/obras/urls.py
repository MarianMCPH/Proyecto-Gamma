from django.urls import path
from . import views

app_name = 'obras'

urlpatterns = [
    path('', views.ObraListView.as_view(), name='itinerario'),
    path('gestion/', views.ObraViewAdmin.as_view(), name='ver_obras'),
    path('gestion/ocultar/', views.OcultarGestionObraView.as_view(), name='ocultar_gestion_obra'),
    path('detalle/', views.ObraDetailView.as_view(), name='detalle_obra'),
    path('crear/', views.ObraCreateView.as_view(), name='nueva_obra'),
    path('editar/', views.ObraUpdateView.as_view(), name='editar_obra'),
    path('eliminar/', views.ObraDeleteView.as_view(), name='eliminar_obra'),
    path('auditoria/', views.AuditoriaObras.as_view(), name='auditoria'),
    path('auditoria/limpiar/', views.LimpiarAuditoriaView.as_view(), name='limpiar_auditoria'),
    path('auditar_obra/', views.AuditarObraEspecifica.as_view(), name='auditar_obra'),
    path("progreso-resultados/", views.ProgresoResultadosObrasView.as_view(), name="progreso_resultados"),
    path("reportes/", views.ReportesObrasView.as_view(), name="reportes"),
    path("reportes/generar/", views.GenerarReportePDFView.as_view(), name="generar_reporte_pdf"),
    path("reportes/<int:pk>/ver/", views.VerReporteHTMLView.as_view(), name="ver_reporte_html"),
]
