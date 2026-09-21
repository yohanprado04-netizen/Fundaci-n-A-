# Fundación A+ — Plataforma de Gestión Académica y Chat IA

Plataforma web integral de administración académica, control de asistencia automatizado con códigos QR, detección temprana en semáforo de riesgo y asistente conversacional inteligente impulsado por IA para la **Fundación A+**.

---

## 1. Arquitectura del Sistema

La solución está construida sobre una arquitectura desacoplada, ligera y de alto rendimiento:

1. **Frontend Web (Single Page Application)**:
   - Desarrollado en JavaScript Vanilla modular, HTML5 semántico y Tailwind CSS.
   - Iconografía vectorial limpia estandarizada con **Heroicons SVG** (sin emojis).
   - Generación y lectura de códigos QR con `qrcode.min.js`.
   - Gráficas estadísticas interactivas con `Chart.js`.
   - Notificaciones y correos transaccionales directos vía `EmailJS`.
   - Caché en memoria con TTL de 25 segundos y deduplicación de peticiones concurrentes en `db.js`.

2. **Backend API (PHP 8.0+)**:
   - Ubicado en la carpeta `/api`.
   - Manejador de persistencia relacional con **PDO y MySQL**.
   - Respuestas JSON ultralivianas con compresión automática GZIP (`ob_gzhandler`).
   - Descarga y visualización de archivos PDF bajo demanda (PQR, memorandos, pensum y trainee), evitando la sobrecarga de datos en listados generales.
   - Control de zona horaria local (`America/Bogota`, UTC-5).

3. **Backend de Chat Inteligente (Python / FastAPI)**:
   - Ubicado en la carpeta `/backend_chat`.
   - Microservicio asíncrono con streaming en tiempo real (Server-Sent Events - SSE) en el puerto `8001`.
   - Conexión directa a MySQL para alimentar el contexto del usuario autenticado y leer la base de conocimiento en vivo (`chat_voz_conocimiento`).
   - Cascada multimodelo con tolerancia a fallos: **OpenRouter (Meta Llama 3.3 70B)** → **Groq (Llama 3.3 / GPT-OSS 20B)** → **Google Gemini (Gemini 2.5 Flash)**.

4. **Base de Datos (MySQL / MariaDB)**:
   - Esquema relacional con integridad referencial (`schema_mysql.sql`).
   - Tablas principales: `usuarios`, `perfiles`, `usuario_perfiles`, `modulos` (cohortes), `horarios`, `notas_modulos`, `sesiones_asistencia`, `asistencia`, `pqr`, `memorandos`, `chat_voz_conocimiento`, `configuracion`.

---

## 2. Estructura del Proyecto

```
fundacion-api/
├── index.html                  # Interfaz principal (sitio público y paneles de usuario)
├── style.css                   # Estilos personalizados y variables de diseño institucional
├── app.js                      # Controlador principal de la interfaz, lógica de negocio y renderizado
├── db.js                       # Capa cliente HTTP (Store, Auth, caché y peticiones a la API)
├── schema_mysql.sql            # Esquema completo de la base de datos MySQL
├── router.php                  # Enrutador para servidor de desarrollo PHP integrado
├── iniciar_servidor.bat        # Script para iniciar servidor web y Chat IA simultáneamente
├── iniciar_chat.bat            # Script para iniciar exclusivamente el Chat IA
├── abrir_puerto_firewall.bat   # Script para habilitar puertos en el Firewall de Windows para red local
├── README.md                   # Documentación técnica general de la plataforma
│
├── api/                        # Backend PHP
│   ├── config.php              # Conexión MySQL, compresión GZIP, cabeceras CORS y zona horaria
│   ├── db.php                  # Instancia PDO y funciones de respuesta JSON
│   ├── auth.php                # Autenticación de credenciales, hash bcrypt y emisión de tokens
│   ├── index.php               # Enrutador REST API (CRUD, QR de asistencia y descarga de archivos)
│   ├── public_info.php         # Endpoint público ligero para el portal institucional
│   └── .htaccess               # Protección de acceso a archivos internos
│
└── backend_chat/               # Servidor de Chat IA (FastAPI)
    ├── chat_backend.py         # Endpoints /chat, /chat/stream y orquestador LLM
    ├── db.py                   # Consultas MySQL y armado de contextos por rol
    ├── auth.py                 # Validación de tokens JWT para el chat
    ├── requirements.txt        # Dependencias de Python (FastAPI, Uvicorn, PyMySQL, PyJWT)
    ├── .env.example            # Plantilla de variables de entorno para el chat
    ├── DEPLOY_RENDER.md        # Guía de despliegue en la nube
    └── README.md               # Documentación específica del servidor de chat
```

---

## 3. Módulos y Funcionalidades Destacadas

### A. Semáforo en Riesgo Académico
- **Superadmin y Administradores**:
  - Habilitado de forma nativa para el **Superadmin** en el menú lateral bajo "Gestión académica".
  - Configurable en **Perfiles y Permisos**: los administradores pueden recibir permisos específicos de **Ver**, **Crear**, **Editar** o **Eliminar**.
  - **Filtro dinámico por cohorte**: Permite filtrar instantáneamente para visualizar únicamente los estudiantes de una cohorte seleccionada o ver todas las cohortes consolidadas.
  - Indicadores en vivo de estudiantes en estado **Crítico (Rojo)**, **Alerta (Amarillo)** y **Óptimo (Verde)**.
  - Exportación a formato CSV adaptada a la cohorte filtrada.
- **Docentes**:
  - Si el docente tiene **dos o más cohortes asignadas**, dispone de un filtro desplegable para aislar y evaluar a los estudiantes de cada cohorte por separado.
  - Si tiene una sola cohorte, el sistema fija automáticamente la vista en su grupo con una insignia informativa.

### B. Control de Asistencia Inteligente vía Código QR
- **Activación única por día (Blindaje Antifraude)**:
  - Una vez que el docente abre el enlace o escanea su QR para iniciar la clase, la sesión queda registrada en la base de datos con su `hora_inicio` inmutable.
  - Si el docente vuelve a abrir el enlace o reescanear el QR ese mismo día, el sistema detecta la activación previa (`yaEstabaActivada: true`), impidiendo reiniciar el temporizador, sobrescribir horas o alterar registros.
- **Ventana de tolerancia reglamentaria (50 minutos)**:
  - Primeros 15 minutos: Registro de asistencia en estado **Presente**.
  - Minuto 16 al 50: Registro de asistencia en estado **Tarde**.
  - Superados los 50 minutos: Registro cerrado automáticamente; los alumnos no registrados conservan su estado de **Falla (pérdida)**.
- **Autonomía para docentes**: Cada docente genera, proyecta, copia y renueva sus propios códigos QR de inicio de clase y de estudiantes desde su panel.
- **Asistencia 0-Click para estudiantes**: Al escanear el QR o abrir el enlace en su dispositivo, el sistema registra su asistencia de inmediato sin necesidad de presionar botones adicionales.

### C. Horarios y Calificaciones por Mes
- **Restricción de periodo**: Un docente con horario definido únicamente puede enviar reportes y calificaciones correspondientes al **mes calendario en curso** (por ejemplo, en septiembre no es posible registrar periodos futuros como octubre).
- **Criterios ponderados**: Configuración flexible de porcentajes de evaluación por materia y cohorte.

### D. Perfiles y Permisos Granulares
- El Superadmin puede definir múltiples perfiles dentro de la categoría `Administrativo` (ej. Coordinador Académico, Asistente de Matrícula, Soporte).
- Asignación matriz por panel: Ver, Crear, Editar y Eliminar.

### E. Chat Asistente con Base de Conocimiento en Tiempo Real
- El panel administrativo permite redactar temas en la base de conocimiento (`chat_voz_conocimiento`).
- El asistente de IA responde de forma contextualizada reconociendo quién pregunta (Estudiante, Docente, Admin o Visitante) y personalizando las respuestas con datos reales de notas, asistencias u horarios.

---

## 4. Guía de Instalación y Puesta en Marcha (Entorno Local)

### Requisitos previos:
- **XAMPP** con Apache y MySQL instalados y en ejecución.
- **PHP 8.0** o superior (incluido en versiones recientes de XAMPP).
- **Python 3.10** o superior con `pip`.

### Paso 1: Configurar la Base de Datos
1. Abre el panel de control de XAMPP e inicia los módulos **Apache** y **MySQL**.
2. Ingresa a `http://localhost/phpmyadmin`.
3. Crea una base de datos llamada `fundacionamas_db` con cotejamiento `utf8mb4_unicode_ci`.
4. Selecciona la base creada, dirígete a la pestaña **Importar** y selecciona el archivo [`schema_mysql.sql`](file:///c:/xampp/htdocs/fundacion-api/schema_mysql.sql) de este repositorio.

### Paso 2: Configurar las Credenciales de la API PHP
Verifica que [`api/config.php`](file:///c:/xampp/htdocs/fundacion-api/api/config.php) contenga los datos de conexión a tu MySQL local:

```php
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'fundacionamas_db');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
```

### Paso 3: Configurar el Chat IA
1. Abre una consola en la carpeta `backend_chat/`:
   ```bash
   cd backend_chat
   pip install -r requirements.txt
   copy .env.example .env
   ```
2. Edita el archivo `backend_chat/.env` con tus claves de API (OpenRouter, Groq o Gemini) y verifica la conexión a la base de datos.

### Paso 4: Iniciar la Plataforma
Para iniciar todo el ecosistema con un solo clic:
- Haz doble clic en [`iniciar_servidor.bat`](file:///c:/xampp/htdocs/fundacion-api/iniciar_servidor.bat).

Este script:
1. Detecta tu dirección IP de red local automáticamente.
2. Inicia el servidor de Chat IA en `http://localhost:8001`.
3. Inicia el servidor web PHP en `http://localhost:8000`.
4. Abre automáticamente tu navegador predeterminado en la plataforma.

> **Acceso desde celulares en la red WiFi**: Si deseas escanear códigos QR o probar la asistencia desde teléfonos móviles conectados a la misma red WiFi, ejecuta [`abrir_puerto_firewall.bat`](file:///c:/xampp/htdocs/fundacion-api/abrir_puerto_firewall.bat) una sola vez como Administrador para habilitar los puertos 8000 y 8001.

---

## 5. Puesta en Marcha en Producción (Hostinger / cPanel / Cloud)

1. **Base de Datos**:
   - Crea la base de datos MySQL y el usuario con privilegios en tu proveedor de hosting.
   - Importa `schema_mysql.sql` mediante phpMyAdmin.

2. **Carga de Archivos Web**:
   - Sube todos los archivos del proyecto a `public_html` (o al subdirectorio correspondiente).
   - Edita `api/config.php` con el `DB_HOST`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` proporcionados por tu hosting.
   - Asegúrate de que la versión de PHP en tu panel esté configurada en **PHP 8.1 o PHP 8.2**.

3. **Despliegue del Chat IA**:
   - Despliega la carpeta `backend_chat` en un servicio en la nube compatible con Python (por ejemplo, [Render.com](https://render.com), Railway o VPS) siguiendo la guía [`backend_chat/DEPLOY_RENDER.md`](file:///c:/xampp/htdocs/fundacion-api/backend_chat/DEPLOY_RENDER.md).
   - Configura las variables de entorno en el panel del servicio en la nube.
   - En `app.js`, configura la URL pública de tu chat desplegado en la variable `CHAT_CONFIG.baseUrl`.

---

## 6. Verificación de Integridad

Para verificar la sintaxis del proyecto sin errores:

```bash
# Validar backend PHP
php -l api/index.php
php -l api/config.php
php -l api/auth.php

# Validar frontend JavaScript
node --check app.js
node --check db.js
```