from django.contrib.auth import get_user_model
from django.db import DatabaseError, IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView

from .models import PerfilUsuario, Rol

Usuario = get_user_model()


class UsuariosView(TemplateView):
    """Listado general de personal y usuarios registrados."""

    template_name = "usuarios/personal_usuarios.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        usuarios_qs = (
            Usuario.objects.select_related("perfil", "perfil__rol")
            .all()
            .order_by("first_name", "last_name", "username")
        )

        lista_usuarios = []
        total_tecnicos = 0
        total_administradores = 0

        for u in usuarios_qs:
            perfil = getattr(u, "perfil", None)
            rol_nombre = perfil.rol.nombre if (perfil and perfil.rol) else ("Administrador" if u.is_staff else "Sin rol")
            rol_clave = rol_nombre.lower()

            if "tecnico" in rol_clave or "técnico" in rol_clave:
                total_tecnicos += 1
                categoria = "tecnico"
            elif "admin" in rol_clave:
                total_administradores += 1
                categoria = "administrador"
            else:
                categoria = "otro"

            nombre_completo = u.get_full_name().strip() or u.username
            lista_usuarios.append({
                "id": u.id,
                "nombre_completo": nombre_completo,
                "rut": perfil.rut if perfil else "Sin RUT",
                "rol": rol_nombre,
                "categoria": categoria,
                "correo": u.email or u.username,
                "is_active": u.is_active,
                "foto_url": perfil.foto_perfil.url if (perfil and perfil.foto_perfil) else "",
            })

        context["usuarios_lista"] = lista_usuarios
        context["total_todos"] = len(lista_usuarios)
        context["total_tecnicos"] = total_tecnicos
        context["total_administradores"] = total_administradores
        return context


class NuevoUsuario(TemplateView):
    """Vista para registrar un nuevo usuario, foto de perfil y datos operativos."""

    template_name = "usuarios/nuevo_usuario.html"

    def post(self, request, *args, **kwargs):
        nombres = request.POST.get("nombres", "").strip()
        rut = request.POST.get("rut", "").strip()
        correo = request.POST.get("correo", "").strip().lower()
        telefono = request.POST.get("telefono", "").strip()
        direccion = request.POST.get("direccion", "").strip()
        rol_nombre = request.POST.get("rol", "").strip()
        estado_cuenta = request.POST.get("estado_cuenta", "Activo").strip()
        password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")
        foto_perfil = request.FILES.get("foto_perfil")

        if not all([nombres, rut, correo, telefono, rol_nombre, password, confirm_password]):
            return JsonResponse(
                {"ok": False, "error": "Complete todos los campos obligatorios antes de guardar."},
                status=400,
            )

        if len(password) < 8:
            return JsonResponse(
                {
                    "ok": False,
                    "field_error": "password",
                    "error": "La contraseña debe tener al menos 8 caracteres.",
                },
                status=400,
            )

        if password != confirm_password:
            return JsonResponse(
                {
                    "ok": False,
                    "field_error": "confirm_password",
                    "error": "Las contraseñas no coinciden. Revíselas e inténtelo nuevamente.",
                },
                status=400,
            )

        correo_existe = (
            Usuario.objects.filter(email__iexact=correo).exists()
            or Usuario.objects.filter(username__iexact=correo).exists()
        )
        if correo_existe:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ese correo ya ha sido registrado anteriormente. Por favor, pruebe con otro correo.",
                },
                status=400,
            )

        if PerfilUsuario.objects.filter(rut__iexact=rut).exists():
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ese RUT ya se encuentra registrado en el sistema. Verifique e intente con otro.",
                },
                status=400,
            )

        partes_nombre = nombres.split(maxsplit=1)
        first_name = partes_nombre[0]
        last_name = partes_nombre[1] if len(partes_nombre) > 1 else ""
        is_active = estado_cuenta.lower() == "activo"
        is_staff = rol_nombre.lower() == "administrador"

        try:
            with transaction.atomic():
                rol_obj, _ = Rol.objects.get_or_create(
                    nombre=rol_nombre,
                    defaults={"descripcion": f"Rol {rol_nombre}"},
                )

                usuario = Usuario(
                    username=correo,
                    email=correo,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=is_active,
                    is_staff=is_staff,
                )
                usuario.set_password(password)
                usuario.save()

                PerfilUsuario.objects.create(
                    usuario=usuario,
                    rol=rol_obj,
                    rut=rut,
                    telefono=telefono,
                    direccion=direccion or None,
                    foto_perfil=foto_perfil,
                    requiere_cambio_password=True,
                )

            return JsonResponse({"ok": True})

        except IntegrityError:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ese correo ya ha sido registrado anteriormente. Por favor, pruebe con otro correo.",
                },
                status=400,
            )
        except DatabaseError:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ocurrió un problema al guardar en la base de datos. Vuelva a intentarlo.",
                },
                status=500,
            )


class DetalleEditarUsuarioView(TemplateView):
    """Vista para visualizar y editar los datos de un usuario existente."""

    template_name = "usuarios/detalle_usuario.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        usuario = get_object_or_404(Usuario.objects.select_related("perfil", "perfil__rol"), pk=self.kwargs["pk"])
        perfil = getattr(usuario, "perfil", None)

        context["usuario_obj"] = usuario
        context["perfil_obj"] = perfil
        context["nombre_completo"] = usuario.get_full_name().strip() or usuario.username
        context["rol_actual"] = perfil.rol.nombre if (perfil and perfil.rol) else ("Administrador" if usuario.is_staff else "Tecnico")
        return context

    def post(self, request, *args, **kwargs):
        usuario = get_object_or_404(Usuario, pk=self.kwargs["pk"])
        perfil = getattr(usuario, "perfil", None)

        nombres = request.POST.get("nombres", "").strip()
        rut = request.POST.get("rut", "").strip()
        correo = request.POST.get("correo", "").strip().lower()
        telefono = request.POST.get("telefono", "").strip()
        direccion = request.POST.get("direccion", "").strip()
        rol_nombre = request.POST.get("rol", "").strip()
        estado_cuenta = request.POST.get("estado_cuenta", "Activo").strip()
        nueva_password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")
        foto_perfil = request.FILES.get("foto_perfil")

        if not all([nombres, rut, correo, telefono, rol_nombre]):
            return JsonResponse(
                {"ok": False, "error": "Complete todos los campos obligatorios antes de actualizar."},
                status=400,
            )

        # Validar contraseña solo si el administrador ingresó una nueva
        if nueva_password or confirm_password:
            if len(nueva_password) < 8:
                return JsonResponse(
                    {
                        "ok": False,
                        "field_error": "password",
                        "error": "La nueva contraseña debe tener al menos 8 caracteres.",
                    },
                    status=400,
                )
            if nueva_password != confirm_password:
                return JsonResponse(
                    {
                        "ok": False,
                        "field_error": "confirm_password",
                        "error": "Las contraseñas no coinciden.",
                    },
                    status=400,
                )

        # Validar correo único excluyendo al propio usuario
        correo_duplicado = (
            Usuario.objects.filter(email__iexact=correo).exclude(pk=usuario.pk).exists()
            or Usuario.objects.filter(username__iexact=correo).exclude(pk=usuario.pk).exists()
        )
        if correo_duplicado:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ese correo ya está registrado por otro usuario. Por favor, pruebe con otro.",
                },
                status=400,
            )

        # Validar RUT único excluyendo al propio perfil
        rut_qs = PerfilUsuario.objects.filter(rut__iexact=rut)
        if perfil:
            rut_qs = rut_qs.exclude(pk=perfil.pk)
        if rut_qs.exists():
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ese RUT ya pertenece a otro usuario registrado.",
                },
                status=400,
            )

        partes_nombre = nombres.split(maxsplit=1)
        first_name = partes_nombre[0]
        last_name = partes_nombre[1] if len(partes_nombre) > 1 else ""
        is_active = estado_cuenta.lower() == "activo"
        is_staff = rol_nombre.lower() == "administrador"

        try:
            with transaction.atomic():
                rol_obj, _ = Rol.objects.get_or_create(
                    nombre=rol_nombre,
                    defaults={"descripcion": f"Rol {rol_nombre}"},
                )

                usuario.username = correo
                usuario.email = correo
                usuario.first_name = first_name
                usuario.last_name = last_name
                usuario.is_active = is_active
                usuario.is_staff = is_staff

                if nueva_password:
                    usuario.set_password(nueva_password)
                usuario.save()

                if perfil is None:
                    perfil = PerfilUsuario(usuario=usuario)

                perfil.rol = rol_obj
                perfil.rut = rut
                perfil.telefono = telefono
                perfil.direccion = direccion or None
                if foto_perfil:
                    perfil.foto_perfil = foto_perfil
                if nueva_password:
                    perfil.requiere_cambio_password = True
                perfil.save()

            return JsonResponse({"ok": True})

        except DatabaseError:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Ocurrió un error al actualizar el usuario en la base de datos. Vuelva a intentarlo.",
                },
                status=500,
            )