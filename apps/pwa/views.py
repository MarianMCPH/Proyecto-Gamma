import base64
import binascii
import hashlib
import io
import json
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView
from PIL import Image

from apps.inventario.models import Material, MovimientoInventario
from apps.obras.models import EvidenciaFotografica, FirmaDigital, OrdenTrabajo


class Formulario(TemplateView):

    template_name = 'pwa/formulario_tecnico.html'

class Insumos(TemplateView):

    template_name = 'pwa/consumo_insumos.html'


# =====================================================================
# Solicitudes, Evidencias, Firma Mandante y Sincronización
# =====================================================================

CLAVE_SESION_ORDEN = "pwa_orden_actual"
ESTADOS_BLOQUEADOS = {"aprobada", "facturada"}
MAX_FOTO_KB = 600            # la PWA comprime a ~250 KB; esto es un tope de seguridad


def obtener_orden_actual(request):
    """Orden con la que trabaja el técnico en la PWA.

    1) ?orden=<id> en la URL (queda guardada en la sesión para los pasos siguientes)
    2) la guardada en la sesión
    3) si no hay ninguna, la orden más reciente programada o en proceso
       (del técnico conectado, si hay login)
    """
    qs = OrdenTrabajo.objects.select_related("cliente", "tecnico")
    orden_id = request.GET.get("orden") or request.session.get(CLAVE_SESION_ORDEN)

    orden = None
    if orden_id:
        try:
            orden = qs.filter(pk=int(orden_id)).first()
        except (TypeError, ValueError):
            orden = None

    if orden is None:
        candidatas = qs.filter(estado__in=["en_proceso", "programada"])
        if request.user.is_authenticated:
            propias = candidatas.filter(tecnico=request.user)
            if propias.exists():
                candidatas = propias
        orden = candidatas.order_by("-id").first()

    if orden is not None:
        request.session[CLAVE_SESION_ORDEN] = orden.pk
    return orden


def nombre_usuario(usuario):
    if not usuario:
        return "Sin asignar"
    return usuario.get_full_name().strip() or usuario.username


def datos_faena(orden):
    """Datos mínimos de la orden que necesita el JS (se entregan con json_script)."""
    if orden is None:
        return None
    return {
        "id": orden.pk,
        "tipo": orden.tipo_servicio or "",
        "cliente": orden.cliente.razon_social if orden.cliente else "Sin cliente",
        "tecnico": nombre_usuario(orden.tecnico),
        "bloqueada": orden_bloqueada(orden),
    }


def orden_bloqueada(orden):
    return orden.inmutable or (orden.estado or "").strip().lower() in ESTADOS_BLOQUEADOS


class OrdenPWAMixin:
    """Agrega la orden actual y sus datos al contexto de las pantallas de la PWA."""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = obtener_orden_actual(self.request)
        context["orden"] = orden
        context["faena"] = datos_faena(orden)
        return context


class Solicitudes(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/solicitudes_insumos.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["materiales"] = Material.objects.order_by("nombre")
        return context


class Evidencias(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/evidencia_fotografica.html'


class FirmaMandante(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/firma_mandante.html'


class SincronizacionFinal(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/sincronizacion_faena.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = context["orden"]
        firma = FirmaDigital.objects.filter(orden=orden).first() if orden else None
        context["firma"] = firma
        context["cierre_registrado"] = bool(firma and orden.fecha_cierre)
        return context


# ---------------------------------------------------------------------
# API para la cola de sincronización (static/js/faena_store.js)
# Cada envío trae un uuid_sync: si llega dos veces (reintento sin red),
# el servidor responde OK sin duplicar el registro.
# ---------------------------------------------------------------------

class ErrorEnvio(Exception):
    def __init__(self, mensaje, status=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status


def leer_json(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        raise ErrorEnvio("El envío no tiene un formato JSON válido.")


def orden_para_envio(payload):
    try:
        orden = OrdenTrabajo.objects.select_related("tecnico").get(pk=int(payload.get("orden")))
    except (TypeError, ValueError, OrdenTrabajo.DoesNotExist):
        raise ErrorEnvio("La orden de trabajo no existe.", status=404)
    if orden_bloqueada(orden):
        raise ErrorEnvio("La orden ya fue aprobada y no admite cambios.", status=409)
    return orden


def uuid_valido(valor):
    valor = (valor or "").strip()
    if not valor or len(valor) > 64:
        raise ErrorEnvio("Falta el identificador de sincronización (uuid_sync).")
    return valor


def imagen_desde_data_url(data_url, nombre):
    """Convierte 'data:image/jpeg;base64,...' en un archivo para ImageField, validando que sea imagen."""
    if not isinstance(data_url, str) or "," not in data_url:
        raise ErrorEnvio("Una de las fotos no tiene un formato válido.")
    cabecera, datos = data_url.split(",", 1)
    if not cabecera.startswith("data:image/"):
        raise ErrorEnvio("Uno de los archivos no es una imagen.")
    try:
        contenido = base64.b64decode(datos, validate=True)
    except (binascii.Error, ValueError):
        raise ErrorEnvio("Una de las fotos llegó dañada.")
    peso_kb = round(len(contenido) / 1024)
    if peso_kb > MAX_FOTO_KB:
        raise ErrorEnvio(f"Una foto pesa {peso_kb} KB; el máximo es {MAX_FOTO_KB} KB.")
    try:
        Image.open(io.BytesIO(contenido)).verify()
    except Exception:
        raise ErrorEnvio("Uno de los archivos no es una imagen válida.")
    return ContentFile(contenido, name=nombre), peso_kb


class EnvioPWAView(View):
    """Base: lee el JSON, ejecuta procesar() en una transacción y responde siempre JSON."""

    def post(self, request, *args, **kwargs):
        try:
            payload = leer_json(request)
            with transaction.atomic():
                datos = self.procesar(request, payload)
            return JsonResponse({"ok": True, **(datos or {})})
        except ErrorEnvio as e:
            return JsonResponse({"ok": False, "error": e.mensaje}, status=e.status)
        except IntegrityError:
            # Mismo uuid_sync enviado en paralelo: ya quedó guardado
            return JsonResponse({"ok": True, "duplicado": True})

    def procesar(self, request, payload):
        raise NotImplementedError


class ApiSolicitud(EnvioPWAView):
    """Solicitud de repuesto desde terreno -> MovimientoInventario pendiente (la ve Bodega en inventario/)."""

    def procesar(self, request, payload):
        uuid_sync = uuid_valido(payload.get("uuid_sync"))
        existente = MovimientoInventario.objects.filter(uuid_sync=uuid_sync).first()
        if existente:
            return {"id": existente.pk, "duplicado": True}

        orden = orden_para_envio(payload)
        try:
            material = Material.objects.get(pk=int(payload.get("material")))
        except (TypeError, ValueError, Material.DoesNotExist):
            raise ErrorEnvio("El artículo solicitado no existe en el catálogo.")
        try:
            cantidad = Decimal(str(payload.get("cantidad")))
        except (InvalidOperation, TypeError):
            raise ErrorEnvio("La cantidad no es válida.")
        if cantidad <= 0:
            raise ErrorEnvio("La cantidad debe ser mayor a 0.")
        justificacion = (payload.get("justificacion") or "").strip()
        if not justificacion:
            raise ErrorEnvio("Falta la justificación de la solicitud.")

        fotos = payload.get("fotos") or []
        if len(fotos) > 2:
            raise ErrorEnvio("Se permiten hasta 2 fotos por solicitud.")

        usuario = request.user if request.user.is_authenticated else orden.tecnico
        mov = MovimientoInventario.objects.create(
            material=material,
            orden=orden,
            usuario=usuario,
            uuid_sync=uuid_sync,
            tipo_mov="consumo",
            cantidad=cantidad,
            motivo=f"Solicitud desde terreno: {justificacion}"[:255],
            estado_validacion="pendiente",
        )

        # Fotos de la falla: quedan como evidencia de la orden (archivo con prefijo "falla_SOL-<id>")
        for i, foto in enumerate(fotos, start=1):
            archivo, peso_kb = imagen_desde_data_url(foto.get("dataUrl") if isinstance(foto, dict) else foto,
                                                     f"falla_SOL-{mov.pk}_{i}.jpg")
            EvidenciaFotografica.objects.create(
                orden=orden, uuid_sync=f"{uuid_sync[:58]}-f{i}", url_imagen=archivo, peso_kb=peso_kb,
            )
        return {"id": mov.pk, "codigo": f"#SOL-{mov.pk}"}


class ApiEvidencia(EnvioPWAView):
    """Una foto (antes o después) de un bloque de evidencias -> EvidenciaFotografica."""

    def procesar(self, request, payload):
        uuid_sync = uuid_valido(payload.get("uuid_sync"))
        existente = EvidenciaFotografica.objects.filter(uuid_sync=uuid_sync).first()
        if existente:
            return {"id": existente.pk, "duplicado": True}

        orden = orden_para_envio(payload)
        tipo = payload.get("tipo")
        if tipo not in {"antes", "despues"}:
            raise ErrorEnvio("Tipo de foto no válido (antes/despues).")
        bloque = int(payload.get("bloque") or 1)
        # El tipo y el bloque quedan en el nombre del archivo: el modelo no tiene un campo para eso
        archivo, peso_kb = imagen_desde_data_url(payload.get("dataUrl"), f"{tipo}_OT-{orden.pk}_b{bloque}.jpg")
        ev = EvidenciaFotografica.objects.create(
            orden=orden, uuid_sync=uuid_sync, url_imagen=archivo, peso_kb=peso_kb,
        )
        return {"id": ev.pk}


class ApiCerrarFaena(EnvioPWAView):
    """Firma del mandante + cierre de la orden (pasa a pendiente de auditoría)."""

    def procesar(self, request, payload):
        uuid_sync = uuid_valido(payload.get("uuid_sync"))
        existente = FirmaDigital.objects.filter(uuid_sync=uuid_sync).first()
        if existente:
            return {"id": existente.pk, "duplicado": True}

        orden = orden_para_envio(payload)
        if FirmaDigital.objects.filter(orden=orden).exists():
            raise ErrorEnvio("Esta orden ya tiene la firma del mandante registrada.", status=409)

        nombres = list(EvidenciaFotografica.objects.filter(orden=orden).values_list("url_imagen", flat=True))
        tiene_antes = any("/antes_" in n or n.startswith("antes_") for n in nombres)
        tiene_despues = any("/despues_" in n or n.startswith("despues_") for n in nombres)
        if not (tiene_antes and tiene_despues):
            raise ErrorEnvio("Faltan las fotos «Antes» y «Después» de la faena.")

        firma = payload.get("firma") or {}
        nombre = (firma.get("nombre") or "").strip()
        rut = (firma.get("rut") or "").strip()
        cargo = (firma.get("cargo") or "").strip()
        imagen = firma.get("imagen_base64") or ""
        if not (nombre and rut and cargo):
            raise ErrorEnvio("Faltan datos del receptor (RUT, nombre o cargo).")
        if not imagen.startswith("data:image/png;base64,"):
            raise ErrorEnvio("La firma no tiene un formato válido.")

        hash_integridad = hashlib.sha256(
            f"{orden.pk}|{rut}|{nombre}|{cargo}|{imagen}".encode("utf-8")
        ).hexdigest()
        nueva = FirmaDigital.objects.create(
            orden=orden,
            uuid_sync=uuid_sync,
            imagen_base64_url=imagen,
            nombre_firmante=nombre[:150],
            rut_firmante=rut[:20],
            cargo_firmante=cargo[:120],
            hash_integridad=hash_integridad,
        )

        orden.estado = "pendiente_auditoria"
        orden.fecha_cierre = timezone.now()
        orden.save(update_fields=["estado", "fecha_cierre"])
        return {"id": nueva.pk, "cerrada_en": orden.fecha_cierre.isoformat()}
