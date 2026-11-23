# Proyecto-Gamma

### Urilizar los modelos que ya estan definidos en el main, en caso de agregar nuevas cosas o nuevas modificaciones, documentarlo y enviarlo por el grupo.

# Pasos
### Clonar el repositorio: git clone URL
### Crear el entorno virtual. IMPORTANTE: recordar instalar las dependencias (requirements)
### Crear su propia rama en este formato: rama[nombre]
### Utilizar la 'base' para cada plantilla html (según corresponda)
### Utilizar el archivo css para los estilos
### Ejecutar CREATE DATABASE y USE DATABASE en sus bases de datos
### Crear archivo .env y pegar ahi la conexion establecida en el archivo .env.example
### Ejecutar python manage.py check --database default para verificar la conexion
### Ejecutar python manage.py migrate para realizar las migraciones
### Para echar a correr el programa ejecutar: python manage.py runserver

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