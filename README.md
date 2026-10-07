# Fundacion A+ — Plataforma de Gestion Academica y Asistencia Inteligente

Plataforma integral de administracion academica, control de asistencia automatizado mediante codigos QR, deteccion temprana de riesgo estudiantil, gestion de recursos institucionales y asistente conversacional impulsado por inteligencia artificial para la Fundacion A+.

---

## 1. Descripcion General

La plataforma Fundacion A+ es una solucion web disenada para soportar las operaciones formativas del programa **TrAIning de 100 a 1000+**, enfocado en la capacitacion de jovenes en programacion, pensamiento logico e inteligencia artificial en Quibdo, Choco y el Litoral Pacifico colombiano.

El sistema unifica la gestion de multiples perfiles institucionales (Superadmin, Administradores, Docentes, Estudiantes, Aliados y Donantes), garantizando trazabilidad academica, control de permanencia, gestion de solicitudes de equipos de computo y comunicacion institucional en tiempo real.

---

## 2. Arquitectura del Sistema

La arquitectura de la solucion se compone de tres capas principales desacopladas:

### 2.1. Frontend Web (Single Page Application)
- **Tecnologia:** JavaScript Vanilla estructurado de forma modular (ES6+), HTML5 semantico y Tailwind CSS.
- **Iconografia:** Graficos vectoriales nativos mediante SVG (Heroicons).
- **Visualizacion de Datos:** Integracion con Chart.js para tableros estadisticos y graficas de rendimiento academico.
- **Generacion y Lectura QR:** Procesamiento instantaneo de codigos QR para asistencia docente y estudiantil con qrcodejs.
- **Cache y Persistencia Local:** Capa intermedia en `db.js` con deduplicacion de solicitudes concurrentes y sincronizacion automatica con la API REST.
- **Service Worker:** Soporte PWA con politicas de cache inteligente y actualizacion transparente entre versiones (`sw.js`).

### 2.2. Backend API RESTful (PHP 8.0+)
- **Ubicacion:** Carpeta `/api`.
- **Patron de Diseno:** Enrutador frontal centralizado (`api/index.php`) con controladores modulares dedicados en `api/controllers/`:
  - `notificaciones.php`: Gestion de comunicados institucionales y privados.
  - `recursos.php`: Inventario, solicitudes y prestamos de equipos de computo.
  - `asistencia.php`: Validacion reglamentaria y registro de sesiones por QR.
  - `academico.php`: Control de cohortes, notas y horarios de clase.
  - `usuarios.php`: Administracion de cuentas y perfiles de acceso.
  - `auditoria.php`: Trazabilidad de eventos criticos del sistema.
  - `institucional.php`: Informacion publica y configuracion global.
- **Seguridad:** Autenticacion mediante JSON Web Tokens (JWT) con revocacion inmediata por version (`token_version`), hashing seguro de contraseñas (bcrypt), mitigacion de ataques de fuerza bruta (Rate Limiting) y proteccion contra accesos cruzados no autorizados (IDOR) con scoping estricto por cohorte (`cohortes_permitidas`).
- **Rendimiento:** Compresion GZIP en respuestas JSON y transmision en flujo controlado de documentos anexos en formato PDF.

### 2.3. Microservicio de Chat IA (Python / FastAPI)
- **Ubicacion:** Carpeta `/backend_chat`.
- **Funcionalidad:** Asistente conversacional con streaming de respuestas en tiempo real mediante Server-Sent Events (SSE).
- **Cascada Multimodelo:** Orquestacion con conmutacion automatica ante fallos entre proveedores de modelos de lenguaje (OpenRouter, Groq y Google Gemini).
- **Contextualizacion Dinamica:** Lectura directa de la base de conocimiento institucional almacenada en la base de datos relacional.

### 2.4. Base de Datos Relacional (MySQL / MariaDB)
- **Esquema:** Modelo relacional con 38 tablas operativas, restricciones de clave foranea e indices optimizados (`schema_mysql.sql` y `schema.sql`).
- **Semillas de Datos:** Cuentas administrativas base, perfiles preconfigurados y comunicados institucionales iniciales.

---

## 3. Estructura del Repositorio

```
fundacion-api/
├── index.html                  # Punto de entrada de la interfaz y vistas de los portales
├── style.css                   # Hoja de estilos centralizada y variables de diseño
├── app.js                      # Orquestador del ciclo de vida de la aplicacion y renderizadores
├── db.js                       # Cliente HTTP, gestion de sesion, cache y capa de datos
├── forms.js                    # Motor de generacion y gestion de formularios dinamicos
├── recursos.js                 # Modulo de gestion de inventario y prestamo de equipos
├── comunicados.js              # Centro de notificaciones, comunicados y filtros de avisos
├── pagos.js                    # Modulo financiero de cobros, pagos de docentes y estudiantes
├── proyectos.js                # Portafolio de proyectos institucionales y de estudiantes
├── trainee.js                  # Modulo de seguimiento y evaluacion de becarios trainee
├── chat.js                     # Interfaz del asistente conversacional con streaming IA
├── asistencia.js               # Control de asistencia reglamentaria con codigos QR
├── docentes.js                 # Portal del docente: clases, justificaciones y calificaciones
├── estudiantes.js              # Portal del estudiante: asistencias, horarios y pensum
├── semaforo.js                 # Motor determinista de riesgo academico y seguimiento
├── schema.sql                  # Definicion completa del esquema DDL y datos semilla
├── schema_mysql.sql            # Copia sincronizada del esquema MySQL de produccion
├── package.json                # Metadatos del proyecto y dependencias de entorno
├── sw.js                       # Service Worker para almacenamiento en cache y offline
├── .htaccess                   # Reglas de enrutamiento web y politicas de seguridad Apache
├── .gitignore                  # Definicion de archivos excluidos del repositorio remoto
├── README.md                   # Documentacion tecnica de la plataforma
│
├── api/                        # Backend REST API en PHP
│   ├── config.php              # Configuracion de conexion a base de datos, CORS y zona horaria
│   ├── auth.php                # Endpoints de autenticacion, login, verificacion y renovacion
│   ├── index.php               # Enrutador principal de entidades y despacho a controladores
│   ├── middleware.php          # Validacion de tokens JWT, control de roles y scoping
│   └── controllers/            # Controladores modulares de la logica de negocio
│       ├── academico.php       # Gestion de cursos, notas, modulos y cohortes
│       ├── asistencia.php      # Validacion de escaneo QR y reglas de asistencia
│       ├── auditoria.php       # Registro de bitacora y eventos administrativos
│       ├── comunicacion.php    # Canales de difusion y mensajeria
│       ├── institucional.php   # Parametros generales y metadatos de la institucion
│       ├── notificaciones.php  # Controlador REST de avisos, estados de lectura y roles
│       ├── recursos.php        # Controlador de equipos, estado fisico y prestamos
│       └── usuarios.php        # Administracion de cuentas y permisos
│
└── backend_chat/               # Microservicio de Asistente IA (FastAPI)
    ├── chat_backend.py         # Endpoints de chat y transmision SSE
    ├── db.py                   # Consultas de contexto institucional por rol
    ├── auth.py                 # Verificacion de credenciales de usuario para el chat
    ├── requirements.txt        # Dependencias de Python
    └── README.md               # Documentacion tecnica del servidor de chat
```

---

## 4. Modulos Principales

### 4.1. Semáforo de Riesgo Académico y Alertas
- **Evaluacion Determinista:** Algoritmo ponderado que combina notas acumuladas (calificacion minima institucional: 6.0), porcentaje de asistencia presencial y sanciones disciplinarias.
- **Niveles de Alerta:**
  - **Rojo (Critico):** Estudiantes con promedio inferior al umbral o asistencia inferior al 80%.
  - **Amarillo (Alerta):** Estudiantes en riesgo preventivo con advertencias tempranas.
  - **Verde (Optimo):** Rendimiento academico y asistencia dentro de los estandares.
- **Proteccion a Nuevos Ingresos:** Si un estudiante ingresa recientemente a una cohorte, el sistema toma como base su fecha de ingreso real, evitando generar fallas retroactivas por clases dictadas antes de su vinculacion.
- **Bitacora de Seguimiento:** Registro de intervenciones tutoriales, compromisos de nivelacion y citaciones directas.

### 4.2. Control de Asistencia Inteligente vía Código QR
- **Sesion Diaria Inmutable:** Cada docente inicia su clase generando un codigo QR dinamico con `hora_inicio` registrada en base de datos.
- **Ventana de Tolerancia Reglamentaria (50 minutos):**
  - Minutos 0 a 15: Asistencia registrada como **Presente**.
  - Minutos 16 a 50: Asistencia registrada como **Tardanza**.
  - Minuto 51 en adelante: Cierre automatico de recepcion; inasistencias marcadas como **Falla**.
- **Autenticacion sin Friccion:** Los estudiantes registran su marcacion de forma instantanea al escanear el codigo con la camara de su dispositivo.

### 4.3. Centro de Notificaciones y Comunicados
- **Controlador Frontend y Backend:** Vista especializada con barra de herramientas que permite alternar por categorias (Institucional, Academico, Eventos, Tutorias y Compromisos), filtrar unicamente elementos no leidos y realizar busquedas en tiempo real.
- **Segmentacion Precisa:** Capacidad de emitir comunicados de caracter publico (toda la institucion) o privado dirigidos a cohortes especificas o docentes seleccionados.
- **Marcado de Lectura:** Acciones masivas e individuales para gestionar el estado de los avisos y actualizar los contadores en la barra de navegacion.

### 4.4. Gestion de Recursos y Prestamos de Equipos
- **Catalogo de Dispositivos:** Registro de computadores portatiles, cargadores y accesorios con control de numero de serie, marca, modelo y estado fisico.
- **Flujo de Prestamo:** Los estudiantes y docentes pueden radicar solicitudes justificadas que son evaluadas y aprobadas por la administracion.
- **Trazabilidad:** Control estricto de custodio actual, fecha de devolucion prevista y devolucion efectiva con observaciones de estado.

### 4.5. Gestion Financiera y Comprobantes de Pago
- **Pagos de Estudiantes:** Registro de recaudos de matriculas y mensualidades con soporte digital de consignacion.
- **Honorarios Docentes:** Control de horas laboradas, tarifas acordadas y generacion de reportes de liquidacion.
- **Visor Integrado:** Modal con visor lightbox para inspeccionar recibos y soportes bancarios en formatos de imagen o PDF.

---

## 5. Matriz de Roles y Permisos (RBAC)

El sistema implementa un modelo de control de acceso basado en roles con politicas estrictas:

| Rol | Alcance de Acceso | Modulos Principales |
|---|---|---|
| **Superadmin** | Total e irrestricto en toda la plataforma. | Configuracion, usuarios, perfiles, auditoria, semaforo global, recursos, pagos y comunicados. |
| **Administrador** | Delegado segun perfil configurado. | Gestion de cohortes, calificaciones, recepcion de PQRs y aprobacion de solicitudes. |
| **Docente** | Exclusivo a sus cohortes y materias asignadas. | Generacion de QR de clase, registro de notas, revision de justificaciones y agenda. |
| **Estudiante** | Personal y academico de su cohorte activa. | Escaneo de QR, consulta de notas, solicitud de prestamo de equipos, PQR y avisos. |
| **Aliado Estrategico** | Observatorio de impacto formativo. | Seguimiento consolidado de metricas de avance y calificaciones de cohortes patrocinadas. |
| **Donante** | Monitoreo de impacto social e iniciativas. | Visualizacion de proyectos de estudiantes, impacto comunitario y reportes generales. |

---

## 6. Instalacion y Despliegue Local

### Requisitos Previos
- Servidor web Apache o Nginx con modulo `mod_rewrite` habilitado.
- PHP 8.0 o superior con extensiones `pdo`, `pdo_mysql`, `json`, `mbstring`, `zlib`.
- Servidor de base de datos MySQL 8.0 o MariaDB 10.4+.
- Python 3.10+ (opcional, requerido unicamente para el microservicio de Chat IA).

### Pasos de Instalacion

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone https://github.com/yohanprado04-netizen/Fundaci-n-A-.git
   cd Fundaci-n-A-
   ```

2. **Configuracion de la Base de Datos:**
   - Crear una base de datos vacia en MySQL (ejemplo: `fundacionamas_db`).
   - Importar el esquema oficial:
     ```bash
     mysql -u root -p fundacionamas_db < schema_mysql.sql
     ```

3. **Configuracion de Credenciales en la API:**
   - Abrir el archivo `api/config.php` y verificar los parametros de conexion:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'fundacionamas_db');
     define('DB_USER', 'root');
     define('DB_PASS', '');
     define('JWT_SECRET', 'TU_CLAVE_SECRETA_PERSONALIZADA');
     ```

4. **Acceso al Aplicativo Web:**
   - Si se utiliza XAMPP o Apache, ubicar el proyecto dentro de la carpeta `htdocs` o directorio raiz de publicacion.
   - Acceder desde el navegador a la direccion local:
     ```
     http://localhost/fundacion-api/
     ```

5. **Credenciales Iniciales de Acceso (Modo Pruebas / Administracion):**
   - **Usuario Superadmin:** `superadmin@fundaciona.org`
   - **Contraseña:** Configurada en el esquema inicial de base de datos.

---

## 7. Despliegue del Servicio de Chat IA

Para activar el asistente virtual inteligente:

1. Ingresar al directorio del servicio:
   ```bash
   cd backend_chat
   ```

2. Crear y activar un entorno virtual:
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Linux / macOS:
   source venv/bin/activate
   ```

3. Instalar las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```

4. Configurar las variables de entorno creando un archivo `.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=fundacionamas_db
   OPENROUTER_API_KEY=tu_clave_de_openrouter
   GROQ_API_KEY=tu_clave_de_groq
   GEMINI_API_KEY=tu_clave_de_gemini
   JWT_SECRET=TU_CLAVE_SECRETA_PERSONALIZADA
   ```

5. Iniciar el servidor FastAPI:
   ```bash
   uvicorn chat_backend.py:app --host 0.0.0.0 --port 8001 --reload
   ```

---

## 8. Seguridad y Buenas Practicas

- **Control de Cache en Navegador:** Se utiliza versionamiento sincronizado en los parametros de consulta de todos los recursos estaticos para garantizar que los clientes reciban de inmediato los cambios desplegados sin colisiones de memoria cache.
- **Proteccion Contra Vulnerabilidades Web:** Se aplican tecnicas de saneamiento de entradas con consultas preparadas (Prepared Statements con PDO), previniendo inyeccion SQL.
- **Exclusion de Archivos Locales:** El repositorio mantiene politicas de exclusión para evitar publicar archivos temporales de desarrollo, scripts de automatizacion local de Windows o archivos de entorno confidenciales.

---

## 9. Licencia y Derechos

Desarrollado para la **Fundacion A+** (Quibdo, Choco, Colombia). Todos los derechos reservados.