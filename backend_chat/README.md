# Servidor de Chat IA — Fundación A+

Servicio backend de Inteligencia Artificial para el chat interactivo de la Fundación A+. Construido con **FastAPI** y **Python**, proporciona respuestas en tiempo real mediante **Server-Sent Events (SSE)**, alimentándose de la base de conocimiento institucional y del contexto académico de la base de datos MySQL.

---

## 1. Características Principales

- **Streaming en tiempo real (SSE)**: Las respuestas se entregan token por token (`/chat/stream`), proporcionando una experiencia conversacional instantánea y fluida.
- **Cascada de tolerancia a fallos multimodelo**:
  1. **OpenRouter** (`meta-llama/llama-3.3-70b-instruct:free`): Proveedor principal de alto rendimiento y razonamiento.
  2. **Groq** (`openai/gpt-oss-20b` / Llama 3.3): Proveedor secundario ultrarrápido con reintentos automáticos ante límites de tasa (HTTP 429).
  3. **Google Gemini** (`gemini-2.5-flash` / `gemini-1.5-flash`): Proveedor de respaldo final de alta disponibilidad.
- **Integración directa con MySQL (Tiempo Real)**:
  - **Base de Conocimiento Dinámica**: Lee directamente la tabla `chat_voz_conocimiento` gestionada por el Superadmin desde el panel de control.
  - **Contexto según el Rol del Usuario**:
    - **Visitante público**: Acceso a información institucional general, misión, proyectos, donaciones y estado de convocatorias/postulaciones.
    - **Estudiante**: Acceso a sus asignaturas, notas por criterio, promedio general acumulado, porcentaje de asistencia y alertas.
    - **Docente**: Información de sus cohortes a cargo, horarios, materias asignadas, estudiantes en riesgo y estado de calificaciones.
    - **Administrador**: Estadísticas globales, reportes de cohortes, resumen del semáforo de riesgo, PQR y memorandos.
    - **Superadmin**: Visión institucional total, usuarios, métricas de plataforma y configuración global.
- **Detección contextual de entidades**: Reconoce menciones de nombres de cohortes y personas en las preguntas para enriquecer automáticamente el prompt del sistema.
- **Seguridad y tokens JWT**: Valida tokens firmados y contraseñas cifradas en MySQL (bcrypt), impidiendo la suplantación de identidad.

---

## 2. Estructura de Archivos

| Archivo | Descripción |
| :--- | :--- |
| `chat_backend.py` | Aplicación principal FastAPI, endpoints REST/SSE, prompts del sistema y orquestación de proveedores LLM. |
| `db.py` | Conexión a MySQL (PyMySQL), generador de contextos dinámicos por rol y lectura de la base de conocimiento. |
| `auth.py` | Validación de credenciales de usuario, generación y verificación criptográfica de tokens JWT. |
| `knowledge.json` | Copia local de respaldo de preguntas y respuestas institucionales para contingencias sin conexión. |
| `requirements.txt` | Dependencias requeridas del entorno Python. |
| `.env.example` | Plantilla de variables de entorno requeridas. |
| `DEPLOY_RENDER.md` | Guía detallada para el despliegue gratuito en la nube con Render.com. |

---

## 3. Requisitos del Sistema

- **Python 3.10** o superior.
- **MySQL / MariaDB** (activo en XAMPP o en servidor remoto en la nube).
- Acceso a internet para conectar con las APIs de los modelos LLM.

---

## 4. Instalación y Puesta en Marcha en Local

### Paso 1: Instalar dependencias
Abre una terminal en esta carpeta (`backend_chat`) y ejecuta:

```bash
pip install -r requirements.txt
```

### Paso 2: Configurar variables de entorno
Copia la plantilla `.env.example` creando un archivo llamado `.env`:

```bash
copy .env.example .env
```

Edita el archivo `.env` con tus claves:
- `OPENROUTER_API_KEY`: Tu clave obtenida en [OpenRouter](https://openrouter.ai/keys).
- `GROQ_API_KEY`: Tu clave gratuita de [Groq Console](https://console.groq.com/keys).
- `GEMINI_API_KEY`: Tu clave de [Google AI Studio](https://aistudio.google.com/apikey).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Datos de tu base de datos MySQL (por defecto en XAMPP: `127.0.0.1`, `3306`, `root`, sin contraseña, `fundacionamas_db`).
- `SECRET_KEY`: Cadena aleatoria segura para firmar tokens.

### Paso 3: Iniciar el servidor
Para iniciar el servicio en el puerto `8001`:

```bash
python -m uvicorn chat_backend:app --host 0.0.0.0 --port 8001 --reload
```

*O bien, desde la carpeta raíz del proyecto puedes hacer doble clic en el archivo:*
`iniciar_chat.bat` o `iniciar_servidor.bat` (inicia la web y el chat juntos).

---

## 5. Endpoints de la API

### `POST /chat/stream` (Recomendado)
Endpoint principal de mensajería con Server-Sent Events (SSE).

- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Hola, ¿cuáles son mis notas actuales?" }
    ],
    "token": "TOKEN_JWT_DEL_USUARIO_OPCIONAL"
  }
  ```
- **Respuesta (stream de eventos)**:
  ```
  data: {"delta": "Hola"}
  data: {"delta": ", tus notas"}
  data: {"delta": " son..."}
  data: {"done": true}
  ```

### `POST /chat`
Endpoint síncrono estándar (devuelve la respuesta una vez finalizada en su totalidad).

- **Body**: Mismo esquema que `/chat/stream`.
- **Respuesta**:
  ```json
  {
    "response": "Texto completo generado por el modelo."
  }
  ```

### `POST /auth/login`
Autentica credenciales contra MySQL y retorna un token JWT válido para adjuntar en las consultas del chat.

- **Body**:
  ```json
  {
    "email": "estudiante@fundacion.org",
    "password": "Password123"
  }
  ```
- **Respuesta**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

### `GET /health`
Verifica el estado del servicio, modelos configurados y conectividad con MySQL.

- **Respuesta**:
  ```json
  {
    "status": "ok",
    "openrouter_configurado": true,
    "groq_configurado": true,
    "gemini_configurado": true,
    "provider_principal": "OpenRouter (meta-llama/llama-3.3-70b-instruct:free)",
    "base_datos_configurada": true,
    "base_datos_conectada": true,
    "knowledge_entries": 12
  }
  ```

---

## 6. Despliegue en Producción (Render / VPS)

Para alojar el chat en la nube de forma permanente:
1. Sube el repositorio a GitHub.
2. Crea un **Web Service** en [Render.com](https://render.com).
3. Configura:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn chat_backend:app --host 0.0.0.0 --port $PORT`
4. En la pestaña **Environment**, agrega las mismas variables de tu archivo `.env`.
5. Obtendrás una URL HTTPS pública (ejemplo: `https://chat-fundacion-a.onrender.com`).
6. Coloca dicha URL en la constante `CHAT_CONFIG.baseUrl` de `app.js` en el frontend.
