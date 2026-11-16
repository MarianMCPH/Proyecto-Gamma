# Proyecto-Gamma

# Pasos
### Clonar el repositorio: git clone URL
### Crear el entorno virtual. IMPORTANTE: recordar instalar las dependencias (requirements)
### Crear su propia rama en este formato: rama[nombre]
### Utilizar la 'base' para cada plantilla html (según corresponda)
### Utilizar el archivo css para los estilos
### Ejecutar en la terminal pip install pymysql
### Ejecutar en la terminal pip install bcrypt
### Ejecutar CREATE DATABASE y USE DATABASE en sus bases de datos
### Crear archivo .env y pegar ahi la conexion establecida en el archivo .env.example
### Ejecutar python manage.py check --database default para verificar la conexion
### Ejecutar python manage.py migrate para realizar las migraciones
### Para echar a correr el programa ejecutar: python manage.py runserver

# Agregar a sus ramas (porque se me olvido agregarlo al main)
### Revisar config/settings.py y agregar en sus propias ramas: 
### DATABASES = {
###    'default': {
###        'ENGINE': 'django.db.backends.mysql',
###        'NAME': os.environ.get('DB_NAME', 'bdgamma'),
###        'USER': os.environ.get('DB_USER', 'root'),
###        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
###        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
###        'PORT': os.environ.get('DB_PORT', '3306'),
###        'OPTIONS': {
###            'charset': 'utf8mb4',
###        },
###    }
### } 

### PASSWORD_HASHERS = [
###    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
###    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
###    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
###    "django.contrib.auth.hashers.Argon2PasswordHasher",
###    "django.contrib.auth.hashers.BCryptPasswordHasher",
### ]

### Entrar a mi repositorio y copiar completamente el archivo models (apps/usuarios/models.py). Antes de realizar la migracion

# APPS:
### Core: Se maneja el login.
### Inventario: Se maneja la gestión de inventario y rebajas de stock.
### Obras: Se maneja la gestión de las obras (creacion, visualización, edición y eliminación)
### usuarios: Se maneja la gestion de usuarios (creacion, visualización, edición y eliminación)  
### pwa: Se manejan los pasos (checklist técnico, evidencias fotograficas, etc).

# IMPORTANTE: 
### Tener en cuenta las lineas que modifican los otros colaboradores en las otras ramas para evitar conflictos. Para cualquier duda o conflicto hablar por el grupo.

### Varias de las pantallas tienen su propio js y su propio css específico, y cada pantalla tambien utiliza el css global (style_pwa.css) definido en la base.

# ¿Qué deben hacer?
### Modificar el html correspondiente para que haga el uso de los espacios conectados con los archivos "models" que correspondan
### Modificar las vistas (views) que le correspondan
### Modificar los js segun correspondan