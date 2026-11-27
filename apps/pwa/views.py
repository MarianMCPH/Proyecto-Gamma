import base64
import hashlib
import io
import uuid
from decimal import Decimal, InvalidOperation

from PIL import Image
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import models, transaction
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView

from apps.inventario.models import Material, MovimientoInventario
from apps.obras.models import Checklist, DetalleChecklist, OrdenTrabajo

User = get_user_model()

ITEMS_PROTOCOLO_BASE = [
    ("item_1", "Estado y Limpieza de Filtros de Aire"),
    ("item_2", "PresiÃ³n de Gas Refrigerante"),
    ("item_3", "Limpieza de SerpentÃ­n (Evaporador y Condensador)"),
]


def _obtener_orden_activa(request):
    """Obtiene la OrdenTrabajo desde GET, POST, sesiÃ³n o la primera disponible."""
    orden_id = request.GET.get("orden_id") or request.POST.get("orden_id")
    if orden_id:
        orden = OrdenTrabajo.objects.filter(pk=orden_id).select_related("cliente", "tecnico").first()
        if orden:
            request.session["pwa_orden_id"] = orden.pk
            return orden

    session_orden_id = request.session.get("pwa_orden_id")
    if session_orden_id:
        orden = OrdenTrabajo.objects.filter(pk=session_orden_id).select_related("cliente", "tecnico").first()
        if orden:
            return orden

    orden = (
        OrdenTrabajo.objects.filter(estado__in=["en_proceso", "programada", "pendiente"])
        .select_related("cliente", "tecnico")
        .order_by("id")
        .first()
    ) or OrdenTrabajo.objects.select_related("cliente", "tecnico").order_by("id").first()

    if orden:
        request.session["pwa_orden_id"] = orden.pk
    return orden


def _resolver_usuario_operacion(request, orden=None):
    """Asegura un User vÃ¡lido incluso si se prueba la PWA sin iniciar sesiÃ³n."""
    if request.user.is_authenticated:
        return request.user
    if orden and orden.tecnico_id:
        return orden.tecnico
    return User.objects.first()


def _optimizar_imagen_cellar(archivo, prefijo="evidencia"):
    """Comprime la imagen a JPEG (< 500 KB) y retorna un ContentFile con tamaÃ±o exacto."""
    try:
        img = Image.open(archivo)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        calidad = 82
        img.save(buffer, format="JPEG", quality=calidad, optimize=True)

        while buffer.tell() > 480 * 1024 and calidad > 45:
            buffer.seek(0)
            buffer.truncate()
            calidad -= 10
            img.save(buffer, format="JPEG", quality=calidad, optimize=True)

        contenido = buffer.getvalue()
        peso_kb = max(1, round(len(contenido) / 1024))
        nombre_final = f"{prefijo}_{uuid.uuid4().hex[:10]}.jpg"
        return ContentFile(contenido, name=nombre_final), peso_kb
    except Exception:
        archivo.seek(0)
        contenido = archivo.read()
        peso_kb = max(1, round(len(contenido) / 1024))
        return ContentFile(contenido, name=archivo.name), peso_kb


class PWABaseView(TemplateView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["orden"] = _obtener_orden_activa(self.request)
        return context


class Formulario(View):
    template_name = "pwa/formulario_tecnico.html"

    def _build_context(self, request, orden):
        checklist = orden.checklists.order_by("-id").first() if orden else None
        respuestas_guardadas = (
            {d.item: d.resultado for d in checklist.detalles.all()} if checklist else {}
        )

        items_formulario = [
            {
                "name": field_name,
                "label": label,
                "valor": respuestas_guardadas.get(label, ""),
            }
            for field_name, label in ITEMS_PROTOCOLO_BASE
        ]

        return {
            "orden": orden,
            "checklist": checklist,
            "items_formulario": items_formulario,
            "observaciones": checklist.observaciones if checklist and checklist.observaciones else "",
        }

    def get(self, request):
        orden = _obtener_orden_activa(request)
        return render(request, self.template_name, self._build_context(request, orden))

    def post(self, request):
        orden = _obtener_orden_activa(request)
        if not orden:
            messages.error(request, "No existe una Orden de Trabajo activa en la base de datos.")
            return render(request, self.template_name, self._build_context(request, None))

        respuestas = []
        for field_name, label in ITEMS_PROTOCOLO_BASE:
            valor = (request.POST.get(field_name) or "").strip()
            if not valor:
                messages.error(request, f"Debe completar el Ã­tem: {label}.")
                return render(request, self.template_name, self._build_context(request, orden))
            respuestas.append((label, valor))

        observaciones = (request.POST.get("observaciones_tecnicas") or "").strip()

        with transaction.atomic():
            if orden.estado in ("programada", "pendiente"):
                orden.estado = "en_proceso"
                fields_to_update = ["estado"]
                if hasattr(orden, "fecha_inicio_faena") and not orden.fecha_inicio_faena:
                    orden.fecha_inicio_faena = timezone.now()
                    fields_to_update.append("fecha_inicio_faena")
                orden.save(update_fields=fields_to_update)

            checklist = orden.checklists.order_by("-id").first()
            if checklist:
                checklist.categoria_faena = orden.tipo_servicio
                checklist.fecha_ejecucion = timezone.now()
                checklist.observaciones = observaciones
                checklist.save(update_fields=["categoria_faena", "fecha_ejecucion", "observaciones"])
            else:
                checklist = Checklist.objects.create(
                    orden=orden,
                    uuid_sync=str(uuid.uuid4()),
                    categoria_faena=orden.tipo_servicio,
                    fecha_ejecucion=timezone.now(),
                    observaciones=observaciones,
                )

            for label, valor in respuestas:
                DetalleChecklist.objects.update_or_create(
                    checklist=checklist,
                    item=label,
                    defaults={"resultado": valor, "obligatorio": True},
                )

        url_insumos = f"{reverse('pwa:insumos')}?orden_id={orden.pk}"
        return redirect(url_insumos)


class Insumos(View):
    template_name = "pwa/consumo_insumos.html"

    def _build_context(self, orden):
        materiales = Material.objects.all().order_by("nombre")
        consumos_previos = (
            MovimientoInventario.objects.filter(orden=orden, tipo_mov="consumo")
            .select_related("material")
            .order_by("-fecha")
            if orden
            else []
        )
        return {
            "orden": orden,
            "materiales": materiales,
            "consumos_previos": consumos_previos,
        }

    def get(self, request):
        orden = _obtener_orden_activa(request)
        return render(request, self.template_name, self._build_context(orden))

    def post(self, request):
        orden = _obtener_orden_activa(request)
        if not orden:
            messages.error(request, "No existe una Orden de Trabajo activa para rebajar insumos.")
            return render(request, self.template_name, self._build_context(None))

        usuario = _resolver_usuario_operacion(request, orden)
        if not usuario:
            messages.error(request, "No existe un usuario tÃ©cnico registrado para asociar el movimiento.")
            return render(request, self.template_name, self._build_context(orden))

        articulos_ids = request.POST.getlist("articulo[]")
        cantidades_raw = request.POST.getlist("cantidad[]")

        consumos_agrupados = {}
        for art_id, cant_str in zip(articulos_ids, cantidades_raw):
            if not art_id or not cant_str:
                continue
            try:
                mat_pk = int(art_id)
                cantidad = Decimal(str(cant_str))
                if cantidad <= 0:
                    raise InvalidOperation
            except (ValueError, InvalidOperation):
                messages.error(request, "Cantidad o material invÃ¡lido en el formulario.")
                return render(request, self.template_name, self._build_context(orden))

            consumos_agrupados[mat_pk] = consumos_agrupados.get(mat_pk, Decimal("0")) + cantidad

        if not consumos_agrupados:
            messages.error(request, "Seleccione al menos un material y su cantidad.")
            return render(request, self.template_name, self._build_context(orden))

        try:
            with transaction.atomic():
                for mat_pk, cantidad_total in consumos_agrupados.items():
                    material = Material.objects.select_for_update().get(pk=mat_pk)
                    if material.stock_actual < cantidad_total:
                        raise ValueError(
                            f"Stock insuficiente para {material.nombre} "
                            f"(disponible: {material.stock_actual} {material.unidad_medida})."
                        )

                    material.stock_actual -= cantidad_total
                    material.save(update_fields=["stock_actual"])

                    MovimientoInventario.objects.create(
                        material=material,
                        orden=orden,
                        usuario=usuario,
                        uuid_sync=str(uuid.uuid4()),
                        tipo_mov="consumo",
                        cantidad=cantidad_total,
                        motivo=f"Consumo en faena OT #{orden.pk}",
                        estado_validacion="aprobado",
                    )
        except Material.DoesNotExist:
            messages.error(request, "Uno de los materiales seleccionados ya no existe.")
            return render(request, self.template_name, self._build_context(orden))
        except ValueError as exc:
            messages.error(request, str(exc))
            return render(request, self.template_name, self._build_context(orden))

        url_evidencias = f"{reverse('pwa:evidencias')}?orden_id={orden.pk}"
        return redirect(url_evidencias)


class Solicitudes(PWABaseView):
    template_name = "pwa/solicitudes_insumos.html"


class Evidencias(View):
    template_name = "pwa/evidencia_fotografica.html"

    def _build_context(self, orden):
        evidencias_previas = orden.evidencias.all().order_by("id") if orden else []
        return {
            "orden": orden,
            "evidencias_previas": evidencias_previas,
        }

    def get(self, request):
        orden = _obtener_orden_activa(request)
        return render(request, self.template_name, self._build_context(orden))

    def post(self, request):
        orden = _obtener_orden_activa(request)
        if not orden:
            messages.error(request, "No existe una Orden de Trabajo activa para adjuntar evidencias.")
            return render(request, self.template_name, self._build_context(None))

        foto_antes = request.FILES.get("foto_antes")
        foto_despues = request.FILES.get("foto_despues")

        if not foto_antes or not foto_despues:
            messages.error(request, "Debe adjuntar tanto la Foto Antes como la Foto DespuÃ©s.")
            return render(request, self.template_name, self._build_context(orden))

        observacion = (request.POST.get("observacion") or request.POST.get("observaciones") or "").strip()
        usuario = _resolver_usuario_operacion(request, orden)

        lote_fotos = [("antes", foto_antes), ("despues", foto_despues)]
        for key in request.FILES:
            if key not in ("foto_antes", "foto_despues"):
                for extra in request.FILES.getlist(key):
                    if extra:
                        lote_fotos.append(("adicional", extra))

        EvidenciaModel = OrdenTrabajo._meta.get_field("evidencias").related_model
        campos_modelo = {f.name for f in EvidenciaModel._meta.concrete_fields}

        try:
            with transaction.atomic():
                for tipo_foto, archivo in lote_fotos:
                    archivo_opt, peso_kb = _optimizar_imagen_cellar(archivo, prefijo=tipo_foto)

                    kwargs = {"orden": orden}
                    if "url_imagen" in campos_modelo:
                        kwargs["url_imagen"] = archivo_opt
                    if "peso_kb" in campos_modelo:
                        kwargs["peso_kb"] = peso_kb
                    if "uuid_sync" in campos_modelo:
                        kwargs["uuid_sync"] = str(uuid.uuid4())
                    if "tipo" in campos_modelo:
                        kwargs["tipo"] = tipo_foto
                    elif "etapa" in campos_modelo:
                        kwargs["etapa"] = tipo_foto
                    elif "categoria" in campos_modelo:
                        kwargs["categoria"] = tipo_foto
                    if "observacion" in campos_modelo:
                        kwargs["observacion"] = observacion
                    elif "observaciones" in campos_modelo:
                        kwargs["observaciones"] = observacion
                    elif "descripcion" in campos_modelo:
                        kwargs["descripcion"] = observacion
                    if "subido_por" in campos_modelo and usuario:
                        kwargs["subido_por"] = usuario
                    elif "usuario" in campos_modelo and usuario:
                        kwargs["usuario"] = usuario

                    EvidenciaModel.objects.create(**kwargs)
        except Exception as exc:
            messages.error(request, f"Error al subir evidencias a Clever Cloud Cellar: {exc}")
            return render(request, self.template_name, self._build_context(orden))

        url_firma = f"{reverse('pwa:firma')}?orden_id={orden.pk}"
        return redirect(url_firma)


class FirmaMandante(View):
    template_name = "pwa/firma_mandante.html"

    def get(self, request):
        orden = _obtener_orden_activa(request)
        return render(request, self.template_name, {"orden": orden})

    def post(self, request):
        orden = _obtener_orden_activa(request)
        if not orden:
            messages.error(request, "No existe una Orden de Trabajo activa para firmar.")
            return render(request, self.template_name, {"orden": None})

        rut_mandante = (request.POST.get("rut_mandante") or "").strip()
        nombre_completo = (request.POST.get("nombre_completo") or "").strip()
        cargo_planta = (request.POST.get("cargo_planta") or "").strip()
        firma_base64 = (request.POST.get("firma_base64") or "").strip()

        if not rut_mandante or not nombre_completo or not cargo_planta or not firma_base64:
            messages.error(request, "Complete los datos del receptor y dibuje la firma en el lienzo.")
            return render(request, self.template_name, {"orden": orden})

        try:
            imgstr = firma_base64.split(";base64,", 1)[1] if ";base64," in firma_base64 else firma_base64
            firma_bytes = base64.b64decode(imgstr)
            hash_integridad = hashlib.sha256(firma_bytes).hexdigest()
        except Exception:
            messages.error(request, "No se pudo procesar el trazo de la firma digital.")
            return render(request, self.template_name, {"orden": orden})

        FirmaModel = OrdenTrabajo._meta.get_field("firma_digital").related_model
        campos_firma = {f.name: f for f in FirmaModel._meta.concrete_fields}
        archivo_firma = ContentFile(firma_bytes, name=f"firma_ot_{orden.pk}_{uuid.uuid4().hex[:8]}.png")

        defaults = {}
        if "nombre_firmante" in campos_firma:
            defaults["nombre_firmante"] = nombre_completo
        if "hash_integridad" in campos_firma:
            defaults["hash_integridad"] = hash_integridad
        if "uuid_sync" in campos_firma:
            defaults["uuid_sync"] = str(uuid.uuid4())

        for campo_rut in ("rut_firmante", "rut_mandante", "rut"):
            if campo_rut in campos_firma:
                defaults[campo_rut] = rut_mandante
                break

        for campo_cargo in ("cargo_firmante", "cargo_planta", "cargo"):
            if campo_cargo in campos_firma:
                defaults[campo_cargo] = cargo_planta
                break

        for campo_b64 in ("firma_base64", "trazo_base64"):
            if campo_b64 in campos_firma:
                defaults[campo_b64] = firma_base64
                break

        for nombre_campo, field_obj in campos_firma.items():
            if isinstance(field_obj, models.FileField):
                defaults[nombre_campo] = archivo_firma
                break

        for campo_fecha in ("fecha_firma", "fecha_creacion"):
            if campo_fecha in campos_firma and not getattr(campos_firma[campo_fecha], "auto_now_add", False):
                defaults[campo_fecha] = timezone.now()
                break

        with transaction.atomic():
            FirmaModel.objects.update_or_create(orden=orden, defaults=defaults)

            orden.estado = "pendiente_auditoria"
            orden.inmutable = True
            fields_to_update = ["estado", "inmutable"]
            if hasattr(orden, "fecha_fin_faena"):
                orden.fecha_fin_faena = timezone.now()
                fields_to_update.append("fecha_fin_faena")
            orden.save(update_fields=fields_to_update)

        url_sync = f"{reverse('pwa:sincronizacion')}?orden_id={orden.pk}"
        return redirect(url_sync)


class SincronizacionFinal(PWABaseView):
    template_name = "pwa/sincronizacion_faena.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        orden = context.get("orden")
        firma = getattr(orden, "firma_digital", None) if orden else None
        rut_receptor = ""
        if firma:
            rut_receptor = (
                getattr(firma, "rut_firmante", "")
                or getattr(firma, "rut_mandante", "")
                or getattr(firma, "rut", "")
            )

        context["firma"] = firma
        context["rut_receptor"] = rut_receptor
        context["total_insumos"] = (
            MovimientoInventario.objects.filter(orden=orden, tipo_mov="consumo").count() if orden else 0
        )
        context["total_evidencias"] = orden.evidencias.count() if orden else 0
        context["fecha_finalizacion"] = (
            getattr(orden, "fecha_fin_faena", None)
            or getattr(firma, "fecha_firma", None)
            or timezone.now()
        )
        return context
