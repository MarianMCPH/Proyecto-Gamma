from django.contrib.auth import get_user_model
from django.db import DatabaseError, IntegrityError, transaction
from django.http import JsonResponse
from django.views.generic import TemplateView

from .models import PerfilUsuario, Rol

Usuario = get_user_model()


class UsuariosView(TemplateView):
    template_name = 'usuarios/personal_usuarios.html'

class NuevoUsuario(TemplateView):
    """Vista para registrar un nuevo usuario y su perfil operativo."""

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

        # 1. Validar campos obligatorios (dirección es opcional)
        if not all([nombres, rut, correo, telefono, rol_nombre, password, confirm_password]):
            return JsonResponse(
                {"ok": False, "error": "Complete todos los campos obligatorios antes de guardar."},
                status=400,
            )

        # 2. Validar coincidencia de contraseñas
        if password != confirm_password:
            return JsonResponse(
                {
                    "ok": False,
                    "field_error": "confirm_password",
                    "error": "Las contraseñas no coinciden. Revíselas e inténtelo nuevamente.",
                },
                status=400,
            )

        # 3. Verificar que el correo no esté registrado anteriormente
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

        # Verificar que el RUT no esté duplicado
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
                # Cifra la contraseña con el hasheador configurado (Bcrypt)
                usuario.set_password(password)
                usuario.save()

                PerfilUsuario.objects.create(
                    usuario=usuario,
                    rol=rol_obj,
                    rut=rut,
                    telefono=telefono,
                    direccion=direccion or None,
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
                    "error": "Ocurrió un problema de conexión o guardado en la base de datos. Vuelva a intentarlo.",
                },
                status=500,
            )