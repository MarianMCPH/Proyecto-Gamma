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

try:
    # Kits de materiales por tipo de servicio (módulo Kits de Herramientas de inventario)
    from apps.inventario.models import KitHerramientas
except ImportError:          # rama que todavía no tiene el modelo de kits
    KitHerramientas = None
from apps.obras.models import Checklist, EvidenciaFotografica, FirmaDigital, OrdenTrabajo


class Formulario(TemplateView):

    template_name = 'pwa/formulario_tecnico.html'

class Insumos(TemplateView):

    template_name = 'pwa/consumo_insumos.html'


# =====================================================================
# Solicitudes, Evidencias, Firma Mandante y Sincronización
# =====================================================================

CLAVE_SESION_ORDEN = "pwa_orden_actual"
ESTADOS_BLOQUEADOS = {"aprobada", "facturada", "cancelada"}
MAX_FOTO_KB = 500            # requisito: fotos bajo 500 KB (la PWA las comprime antes de enviar)
PREFIJO_SOLICITUD = "Solicitud desde terreno"       # marca los MovimientoInventario que son solicitudes

PASOS_FAENA = [
    (1, "Formulario"),
    (2, "Insumos"),
    (3, "Evidencias"),
    (4, "Firma"),
    (5, "Sincronización"),
]


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
        "cancelada": orden_cancelada(orden),
        "motivo_bloqueo": motivo_bloqueo(orden),
    }


def orden_cancelada(orden):
    return (orden.estado or "").strip().lower() == "cancelada"


def orden_bloqueada(orden):
    return orden.inmutable or (orden.estado or "").strip().lower() in ESTADOS_BLOQUEADOS


def motivo_bloqueo(orden):
    """Texto para el técnico de por qué la orden ya no admite cambios ('' si no está bloqueada)."""
    if orden_cancelada(orden):
        # razon_cancelacion lo agrega el módulo de Obras Canceladas (puede no existir en ramas antiguas)
        razon = (getattr(orden, "razon_cancelacion", "") or "").strip()
        return f"La obra #{orden.pk} fue cancelada" + (f" (motivo: {razon})" if razon else "") + " y no admite cambios."
    if orden_bloqueada(orden):
        return f"La orden #{orden.pk} ya fue aprobada por administración y no admite cambios."
    return ""


class OrdenPWAMixin:
    """Agrega la orden actual, sus datos y la etapa del servicio al contexto de las pantallas de la PWA."""

    paso_actual = None
    detalle_paso = ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = obtener_orden_actual(self.request)
        context["orden"] = orden
        context["faena"] = datos_faena(orden)
        context["pasos"] = PASOS_FAENA
        context["paso_actual"] = self.paso_actual
        context["nombre_paso"] = dict(PASOS_FAENA).get(self.paso_actual, "")
        context["detalle_paso"] = self.detalle_paso
        return context


def formato_cantidad(valor):
    """Decimal('2.00') -> '2', Decimal('0.50') -> '0.5'."""
    return f"{valor.normalize():f}" if valor is not None else "0"


def estado_solicitud(valor):
    """Mismo criterio que la bandeja de Bodega (inventario/views.py)."""
    v = (valor or "pendiente").strip().lower()
    if v in {"aprobada", "aprobadas", "despachada", "despachadas"}:
        return "aprobada", "Aprobada"
    if v in {"rechazada", "rechazadas"}:
        return "rechazada", "Rechazada"
    return "pendiente", "Pendiente"


def solicitudes_de_orden(orden):
    """Solicitudes hechas desde la PWA para una orden (MovimientoInventario marcados como solicitud)."""
    if orden is None:
        return []
    filas = []
    movimientos = (MovimientoInventario.objects.select_related("material")
                   .filter(orden=orden, motivo__startswith=PREFIJO_SOLICITUD))
    for m in movimientos:
        slug, label = estado_solicitud(m.estado_validacion)
        filas.append({
            "uuid_sync": m.uuid_sync or "",
            "codigo": f"#SOL-{m.pk}",
            "articulo": m.material.nombre,
            "cantidad": f"{formato_cantidad(m.cantidad)} {m.material.unidad_medida}",
            "estado": slug, "estado_label": label,
            "fecha": m.fecha,
        })
    return filas


def kits_de_orden(orden):
    """Kit(s) de la orden.
    1) El kit asignado a la obra al crearla (OrdenTrabajo.kit).
    2) Si no tiene uno, los kits activos de su tipo de servicio (sin importar mayúsculas)."""
    if KitHerramientas is None:
        return []
    if orden is None:
        return KitHerramientas.objects.none()
    kit_id = getattr(orden, "kit_id", None)
    if kit_id:
        return KitHerramientas.objects.filter(pk=kit_id)
    return KitHerramientas.objects.filter(activo=True, tipo_servicio__iexact=(orden.tipo_servicio or "").strip())


def materiales_del_kit(orden):
    """Materiales que el técnico puede pedir o consumir en esta orden: los de su(s) kit(s).
    También sirve para la pantalla de Consumo de Insumos (Paso 2)."""
    kits = kits_de_orden(orden)
    if not kits:
        return Material.objects.none()
    return Material.objects.filter(detalles_kit__kit__in=kits).distinct().order_by("nombre")


class Solicitudes(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/solicitudes_insumos.html'
    paso_actual = 2
    detalle_paso = "solicitud de piezas o insumos"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = context["orden"]
        context["kits_disponibles"] = KitHerramientas is not None
        context["kits"] = list(kits_de_orden(orden))
        context["materiales"] = materiales_del_kit(orden)
        context["mis_solicitudes"] = solicitudes_de_orden(orden)
        return context


class Evidencias(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/evidencia_fotografica.html'
    paso_actual = 3


class FirmaMandante(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/firma_mandante.html'
    paso_actual = 4


def nombre_archivo(evidencia):
    return (evidencia.url_imagen.name or "").rsplit("/", 1)[-1]


def tipo_evidencia(evidencia):
    """'antes', 'despues' o 'falla'. Usa el campo `tipo` si existe; si no (o está vacío), el nombre del archivo."""
    tipo = getattr(evidencia, "tipo", "") or ""
    if tipo:
        return tipo
    nombre = nombre_archivo(evidencia)
    for t in ("antes", "despues", "falla"):
        if nombre.startswith(f"{t}_"):
            return t
    return ""


def verificar_orden(orden):
    """Revisión previa al cierre: checklist, materiales, fotos y firma registrados en la base de datos."""
    # Checklist técnico de la orden
    checklist = (Checklist.objects.filter(orden=orden).prefetch_related("detalles")
                 .order_by("-id").first())
    if checklist is None:
        v_checklist = {"ok": False, "texto": "Sin registrar"}
    else:
        detalles = list(checklist.detalles.all())
        faltan = [d for d in detalles if d.obligatorio and not (d.resultado or "").strip()]
        if faltan:
            v_checklist = {"ok": False, "texto": f"Incompleto: faltan {len(faltan)} ítems obligatorios"}
        else:
            v_checklist = {"ok": True, "texto": f"Completado ({len(detalles)} ítems)"}

    # Materiales consumidos: movimientos de la orden que no son solicitudes ni rechazados
    materiales = (MovimientoInventario.objects.filter(orden=orden)
                  .exclude(motivo__startswith=PREFIJO_SOLICITUD)
                  .exclude(estado_validacion__iexact="rechazada").count())
    v_materiales = ({"ok": True, "texto": f"{materiales} registro(s) de consumo"} if materiales
                    else {"ok": False, "texto": "Sin registrar"})

    # Fotos (Paso 3)
    tipos = [tipo_evidencia(e) for e in EvidenciaFotografica.objects.filter(orden=orden)]
    antes = tipos.count("antes")
    despues = tipos.count("despues")
    v_fotos = {"ok": bool(antes and despues),
               "texto": f"{antes} antes · {despues} después" if (antes or despues) else "Sin fotos adjuntas"}

    # Firma (Paso 4)
    firma = FirmaDigital.objects.filter(orden=orden).first()
    v_firma = ({"ok": True, "texto": f"Registrada: {firma.nombre_firmante}"} if firma
               else {"ok": False, "texto": "Sin firma del mandante"})

    return firma, [
        {"nombre": "Checklist técnico", **v_checklist},
        {"nombre": "Materiales utilizados", **v_materiales},
        {"nombre": "Fotografías (antes y después)", **v_fotos},
        {"nombre": "Firma del mandante", **v_firma},
    ]


class SincronizacionFinal(OrdenPWAMixin, TemplateView):

    template_name = 'pwa/sincronizacion_faena.html'
    paso_actual = 5

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = context["orden"]
        firma, verificacion = verificar_orden(orden) if orden else (None, [])
        context["firma"] = firma
        context["verificacion"] = verificacion
        context["cierre_registrado"] = bool(firma and orden.fecha_cierre)
        context["estado_orden"] = orden.get_estado_display() if orden else ""
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
        raise ErrorEnvio(motivo_bloqueo(orden), status=409)
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
    """Solicitud desde terreno de un material del kit del servicio -> MovimientoInventario pendiente
    (la ve Bodega en inventario/)."""

    def procesar(self, request, payload):
        uuid_sync = uuid_valido(payload.get("uuid_sync"))
        existente = MovimientoInventario.objects.filter(uuid_sync=uuid_sync).first()
        if existente:
            return {"id": existente.pk, "duplicado": True}

        orden = orden_para_envio(payload)
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

        try:
            material = Material.objects.get(pk=int(payload.get("material")))
        except (TypeError, ValueError, Material.DoesNotExist):
            raise ErrorEnvio("El artículo solicitado no existe en el catálogo.")
        if not materiales_del_kit(orden).filter(pk=material.pk).exists():
            raise ErrorEnvio(f"«{material.nombre}» no pertenece al kit del servicio «{orden.tipo_servicio}».")

        usuario = request.user if request.user.is_authenticated else orden.tecnico
        if usuario is None:
            raise ErrorEnvio("La orden no tiene técnico asignado.")
        registro = MovimientoInventario.objects.create(
            material=material,
            orden=orden,
            usuario=usuario,
            uuid_sync=uuid_sync,
            tipo_mov="consumo",
            cantidad=cantidad,
            motivo=f"{PREFIJO_SOLICITUD}: {justificacion}"[:255],
            estado_validacion="pendiente",
        )
        codigo = f"SOL-{registro.pk}"

        # Fotos de la falla: quedan como evidencia de la orden (archivo con prefijo "falla_<codigo>")
        for i, foto in enumerate(fotos, start=1):
            archivo, peso_kb = imagen_desde_data_url(foto.get("dataUrl") if isinstance(foto, dict) else foto,
                                                     f"falla_{codigo}_{i}.jpg")
            datos_foto = {"orden": orden, "uuid_sync": f"{uuid_sync[:58]}-f{i}", "url_imagen": archivo, "peso_kb": peso_kb}
            if "tipo" in {f.name for f in EvidenciaFotografica._meta.get_fields()}:
                datos_foto["tipo"] = "falla"
            EvidenciaFotografica.objects.create(**datos_foto)
        return {"id": registro.pk, "codigo": f"#{codigo}"}


class ApiCancelarSolicitud(EnvioPWAView):
    """Cancela una solicitud que Bodega todavía no revisa.
    Una solicitud pendiente aún no mueve stock (el stock se rebaja al aprobarla), por eso se elimina.
    """

    def procesar(self, request, payload):
        uuid_sync = uuid_valido(payload.get("uuid_sync"))
        registro = MovimientoInventario.objects.filter(uuid_sync=uuid_sync, motivo__startswith=PREFIJO_SOLICITUD).first()
        if registro is None:
            return {"cancelada": True, "ya_no_existia": True}
        slug, label = estado_solicitud(registro.estado_validacion)
        if slug != "pendiente":
            raise ErrorEnvio(f"La solicitud ya fue {label.lower()} por Bodega y no se puede cancelar.", status=409)
        if registro.orden and orden_bloqueada(registro.orden):
            raise ErrorEnvio(motivo_bloqueo(registro.orden), status=409)
        for ev in EvidenciaFotografica.objects.filter(uuid_sync__startswith=f"{uuid_sync[:58]}-f"):
            ev.url_imagen.delete(save=False)
            ev.delete()
        registro.delete()
        return {"cancelada": True}


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
        datos = {"orden": orden, "uuid_sync": uuid_sync, "url_imagen": archivo, "peso_kb": peso_kb}
        # Campos `tipo` y `descripcion` del modelo (si la rama aún no los tiene, se omiten)
        campos = {f.name for f in EvidenciaFotografica._meta.get_fields()}
        if "tipo" in campos:
            datos["tipo"] = tipo
        if "descripcion" in campos:
            datos["descripcion"] = (payload.get("observacion") or "").strip()
        ev = EvidenciaFotografica.objects.create(**datos)
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

        tipos = {tipo_evidencia(e) for e in EvidenciaFotografica.objects.filter(orden=orden)}
        if not {"antes", "despues"} <= tipos:
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
