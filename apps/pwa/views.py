from decimal import Decimal, InvalidOperation
from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from apps.obras.models import OrdenTrabajo
from apps.inventario.models import (
    Insumo,
    ConsumoInsumo,
    MovimientoInventario,
    SolicitudInsumo,
    DetalleSolicitudInsumo,
)
from .models import (
    ActividadChecklist,
    FormularioTecnico,
    RespuestaChecklist,
    EvidenciaFotografica,
    ActaEntregaMandante,
)


def _obtener_orden(orden_id):
    if orden_id:
        return get_object_or_404(OrdenTrabajo, id=orden_id)
    return OrdenTrabajo.objects.first()


class Formulario(View):
    template_name = 'pwa/formulario_tecnico.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        actividades = []
        formulario_tec = None

        if orden:
            actividades = ActividadChecklist.objects.filter(
                tipo_servicio=orden.tipo_servicio,
                activa=True
            ).order_by('orden', 'id')
            formulario_tec = FormularioTecnico.objects.filter(orden_trabajo=orden).first()

        respuestas_previas = {}
        if formulario_tec:
            respuestas_previas = {
                r.actividad_id: r for r in formulario_tec.respuestas.all()
            }

        items_checklist = []
        for act in actividades:
            resp = respuestas_previas.get(act.id)
            estado_actual = ""
            if resp:
                estado_actual = "conforme" if resp.completada else "no_conforme"
            items_checklist.append({
                'actividad': act,
                'estado_actual': estado_actual,
                'observacion_actual': resp.observacion if resp and resp.observacion else "",
            })

        return render(request, self.template_name, {
            'orden': orden,
            'formulario_tec': formulario_tec,
            'items_checklist': items_checklist,
        })

    def post(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        if not orden:
            messages.warning(request, "Modo vista previa: crea una Orden de Trabajo en /admin/ para guardar en BD.")
            return redirect('pwa:insumos')

        tecnico_actual = request.user if request.user.is_authenticated else orden.tecnico
        observaciones = request.POST.get('observaciones_tecnicas', '').strip()

        formulario_tec, _ = FormularioTecnico.objects.update_or_create(
            orden_trabajo=orden,
            defaults={
                'tecnico': tecnico_actual,
                'observaciones_tecnicas': observaciones,
                'estado': 'COMPLETADO',
            }
        )

        actividades = ActividadChecklist.objects.filter(
            tipo_servicio=orden.tipo_servicio,
            activa=True
        )

        for act in actividades:
            valor = request.POST.get(f'actividad_{act.id}')
            obs_item = request.POST.get(f'obs_actividad_{act.id}', '').strip()
            es_completada = (valor == 'conforme')

            RespuestaChecklist.objects.update_or_create(
                formulario=formulario_tec,
                actividad=act,
                defaults={
                    'completada': es_completada,
                    'observacion': obs_item or f"Estado seleccionado: {valor}",
                }
            )

        orden.etapa_actual = 'INSUMOS'
        orden.save(update_fields=['etapa_actual'])

        messages.success(request, "Formulario técnico guardado correctamente.")
        return redirect('pwa:insumos_orden', orden_id=orden.id)


class Insumos(View):
    template_name = 'pwa/consumo_insumos.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        insumos_disponibles = Insumo.objects.filter(activo=True, stock_actual__gt=0).order_by('nombre')
        consumos_previos = ConsumoInsumo.objects.filter(orden_trabajo=orden).select_related('insumo') if orden else []

        return render(request, self.template_name, {
            'orden': orden,
            'insumos': insumos_disponibles,
            'consumos_previos': consumos_previos,
        })

    def post(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        if not orden:
            return redirect('pwa:evidencias')

        tecnico_actual = request.user if request.user.is_authenticated else orden.tecnico
        articulos_ids = request.POST.getlist('articulo[]')
        cantidades = request.POST.getlist('cantidad[]')

        if not articulos_ids or all(not a for a in articulos_ids):
            return redirect('pwa:evidencias_orden', orden_id=orden.id)

        try:
            with transaction.atomic():
                for art_id, cant_str in zip(articulos_ids, cantidades):
                    if not art_id or not cant_str:
                        continue

                    insumo = Insumo.objects.select_for_update().get(id=art_id, activo=True)
                    cantidad = Decimal(cant_str)

                    if cantidad <= 0:
                        raise ValueError(f"Cantidad inválida para {insumo.nombre}.")
                    if insumo.stock_actual < cantidad:
                        raise ValueError(
                            f"Stock insuficiente para {insumo.nombre} "
                            f"(Disponible: {insumo.stock_actual} {insumo.unidad_medida})."
                        )

                    stock_anterior = insumo.stock_actual
                    stock_nuevo = stock_anterior - cantidad

                    ConsumoInsumo.objects.create(
                        orden_trabajo=orden,
                        insumo=insumo,
                        tecnico=tecnico_actual,
                        cantidad=cantidad,
                        confirmado=True,
                        fecha_confirmacion=timezone.now(),
                    )

                    insumo.stock_actual = stock_nuevo
                    insumo.save()

                    MovimientoInventario.objects.create(
                        insumo=insumo,
                        orden_trabajo=orden,
                        usuario=tecnico_actual,
                        tipo='SALIDA_CONSUMO',
                        cantidad=cantidad,
                        stock_anterior=stock_anterior,
                        stock_nuevo=stock_nuevo,
                    )

        except (Insumo.DoesNotExist, InvalidOperation, ValueError) as e:
            messages.error(request, str(e))
            return redirect('pwa:insumos_orden', orden_id=orden.id)

        messages.success(request, "Consumo de insumos registrado y rebajado de stock.")
        return redirect('pwa:evidencias_orden', orden_id=orden.id)


class Solicitudes(View):
    template_name = 'pwa/solicitudes_insumos.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        insumos_catalogo = Insumo.objects.filter(activo=True).order_by('nombre')
        return render(request, self.template_name, {
            'orden': orden,
            'insumos': insumos_catalogo,
        })

    def post(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        if not orden:
            return redirect('pwa:insumos')

        tecnico_actual = request.user if request.user.is_authenticated else orden.tecnico
        insumo_id = request.POST.get('repuesto_solicitado')
        cantidad_str = request.POST.get('cantidad_solicitada')
        justificacion = request.POST.get('justificacion', '').strip()

        if insumo_id and cantidad_str:
            insumo = get_object_or_404(Insumo, id=insumo_id)
            with transaction.atomic():
                solicitud = SolicitudInsumo.objects.create(
                    orden_trabajo=orden,
                    tecnico=tecnico_actual,
                    motivo=justificacion,
                    estado='PENDIENTE',
                )
                DetalleSolicitudInsumo.objects.create(
                    solicitud=solicitud,
                    insumo=insumo,
                    cantidad_solicitada=Decimal(cantidad_str),
                )
            messages.success(request, "Solicitud de insumo enviada a Bodega Central.")
            return redirect('pwa:insumos_orden', orden_id=orden.id)

        messages.error(request, "Debe seleccionar un repuesto y cantidad.")
        return redirect('pwa:solicitudes_orden', orden_id=orden.id)


class Evidencias(View):
    template_name = 'pwa/evidencia_fotografica.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        evidencias_previas = EvidenciaFotografica.objects.filter(orden_trabajo=orden) if orden else []
        return render(request, self.template_name, {
            'orden': orden,
            'evidencias_previas': evidencias_previas,
        })

    def post(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        if not orden:
            return redirect('pwa:firma')

        tecnico_actual = request.user if request.user.is_authenticated else orden.tecnico
        observacion = request.POST.get('observacion_evidencia', '').strip()

        foto_antes = request.FILES.get('foto_antes')
        foto_despues = request.FILES.get('foto_despues')

        if foto_antes:
            EvidenciaFotografica.objects.create(
                orden_trabajo=orden,
                tecnico=tecnico_actual,
                tipo='ANTES',
                imagen=foto_antes,
                observacion=observacion,
            )

        if foto_despues:
            EvidenciaFotografica.objects.create(
                orden_trabajo=orden,
                tecnico=tecnico_actual,
                tipo='DESPUES',
                imagen=foto_despues,
                observacion=observacion,
            )

        for key, archivo in request.FILES.items():
            if key not in ('foto_antes', 'foto_despues'):
                EvidenciaFotografica.objects.create(
                    orden_trabajo=orden,
                    tecnico=tecnico_actual,
                    tipo='ADICIONAL',
                    imagen=archivo,
                    observacion=observacion,
                )

        messages.success(request, "Evidencias fotográficas guardadas correctamente.")
        return redirect('pwa:firma_orden', orden_id=orden.id)


class FirmaMandante(View):
    template_name = 'pwa/firma_mandante.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        acta_previa = ActaEntregaMandante.objects.filter(orden_trabajo=orden).first() if orden else None
        return render(request, self.template_name, {
            'orden': orden,
            'acta_previa': acta_previa,
        })

    def post(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        if not orden:
            return redirect('pwa:sincronizacion')

        rut = request.POST.get('rut_mandante', '').strip()
        nombre = request.POST.get('nombre_completo', '').strip()
        cargo = request.POST.get('cargo_planta', '').strip()
        firma_b64 = request.POST.get('firma_base64', '').strip()

        ActaEntregaMandante.objects.update_or_create(
            orden_trabajo=orden,
            defaults={
                'rut_mandante': rut,
                'nombre_completo': nombre,
                'cargo_planta': cargo,
                'firma_base64': firma_b64,
            }
        )

        orden.estado = 'FINALIZADA'
        orden.etapa_actual = 'FINALIZADO'
        orden.fecha_fin_real = timezone.now()
        orden.save(update_fields=['estado', 'etapa_actual', 'fecha_fin_real'])

        return redirect('pwa:sincronizacion_orden', orden_id=orden.id)


class SincronizacionFinal(View):
    template_name = 'pwa/sincronizacion_faena.html'

    def get(self, request, orden_id=None):
        orden = _obtener_orden(orden_id)
        return render(request, self.template_name, {'orden': orden})