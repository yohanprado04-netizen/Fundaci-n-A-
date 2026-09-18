# Cómo poner el chat en internet (Render, plan gratis)

Esta guía asume que es la primera vez que despliegas algo. Son ~20 minutos.

## 0. Qué vas a subir

Todo lo que está en esta carpeta (`backend_chat/`), **excepto**:
- `.env` (si llegas a crear uno local para probar) — nunca se sube.
- `__pycache__/` si aparece.

Sí se sube: `chat_backend.py`, `db.py`, `auth.py`, `requirements.txt`,
`.env.example`, este mismo archivo. `knowledge.json` ya NO es necesario
(ver sección 6) — puedes dejarlo o borrarlo, el backend no lo usa más.

## 1. Consigue tus API keys de IA (Groq es el proveedor PRINCIPAL, Gemini es el respaldo)

El backend intenta responder primero con **Groq** (más rápido); si Groq falla
o no tiene key configurada, usa **Gemini** como respaldo automático. Para
que el chat use Groq como querías, necesitas la key de los dos — si solo
configuras Gemini, el chat funcionará igual pero SIEMPRE por el camino de
respaldo, nunca por Groq.

### Key de Groq (la principal)
1. Entra a **https://console.groq.com/keys** con una cuenta (puedes
   registrarte gratis).
2. Botón **"Create API Key"**, ponle un nombre y cópiala — Groq solo la
   muestra una vez.
3. Guárdala en un lugar seguro. Nunca la pegues en el código ni la subas a
   ningún repositorio.

### Key de Gemini (el respaldo)
1. Entra a **https://aistudio.google.com/apikey** con tu cuenta de Google.
2. Botón **"Create API key"**.
3. Copia la key que te da (empieza distinto cada vez, guárdala en un lugar
   seguro — no la compartas ni la subas a ningún repositorio).

## 2. Genera tu SECRET_KEY (para el login del chat)

Esta es una cadena secreta que el backend usa para firmar los tokens de
sesión — nada que ver con las keys de Groq/Gemini. Necesitas una distinta
para producción (no reutilices ninguna que hayas visto de ejemplo). Puedes
generarla así, en cualquier terminal con Python instalado:

```
python -c "import secrets; print(secrets.token_hex(32))"
```

Copia el resultado (una cadena larga de letras y números) — la vas a
necesitar en el paso 4.

## 3. Datos de conexión a tu base de datos MySQL

Necesitas los 5 datos de conexión de donde esté alojada tu base de datos
`fundacion_bd` (el mismo phpMyAdmin/hosting donde importaste el esquema):
host, puerto (normalmente 3306), usuario, contraseña, y el nombre de la
base de datos. Si tu hosting solo permite conexiones desde ciertas IPs,
revisa si necesitas habilitar el acceso remoto o la IP de Render
(Render usa IPs dinámicas en el plan free — si tu proveedor de MySQL exige
una lista fija de IPs permitidas, este es el punto a resolver con ellos
antes de continuar).

## 4. Sube esta carpeta a GitHub

1. Crea una cuenta en **https://github.com** si no tienes.
2. Crea un repositorio nuevo (puede ser privado), por ejemplo
   `fundacion-a-mas-chat-backend`.
3. Sube el contenido de esta carpeta `backend_chat/` a ese repositorio
   (puedes arrastrar los archivos directamente desde la web de GitHub con
   "Add file" → "Upload files", no necesitas usar la terminal).

## 5. Crea el servicio en Render

1. Entra a **https://render.com** y crea una cuenta (puedes registrarte
   con tu cuenta de GitHub directamente, es más rápido).
2. Botón **"New +"** → **"Web Service"**.
3. Conecta tu cuenta de GitHub y selecciona el repositorio que subiste.
4. Completa el formulario:
   - **Name**: lo que quieras, ej. `fundacion-a-mas-chat`
   - **Region**: la más cercana (Oregon suele ir bien para Latinoamérica)
   - **Branch**: `main` (o la que uses)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn chat_backend:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**
5. Antes de crear el servicio, baja hasta **"Environment Variables"** y
   agrega TODAS estas (botón "Add Environment Variable" para cada una):
   - `GROQ_API_KEY` — tu key real de Groq del paso 1
   - `GEMINI_API_KEY` — tu key real de Gemini del paso 1
   - `SECRET_KEY` — la cadena que generaste en el paso 2
   - `DB_HOST` — host de tu MySQL (paso 3)
   - `DB_PORT` — normalmente `3306`
   - `DB_USER` — usuario de tu MySQL
   - `DB_PASSWORD` — contraseña de tu MySQL
   - `DB_NAME` — `fundacion_bd`
6. Botón **"Create Web Service"**. Render va a instalar todo y arrancar el
   servidor — tarda unos minutos la primera vez.

## 6. Prueba que funciona

Cuando termine el despliegue, Render te muestra una URL pública, algo como:

    https://fundacion-a-mas-chat.onrender.com

Ábrela en el navegador agregando `/health` al final:

    https://fundacion-a-mas-chat.onrender.com/health

Deberías ver algo como:
```json
{"status":"ok","groq_configurado":true,"gemini_configurado":true,"base_datos_configurada":true,"knowledge_entries":3}
```
- `groq_configurado: true` confirma que el chat intentará Groq primero.
- `base_datos_configurada: true` confirma que las 5 variables de MySQL
  quedaron bien puestas (si dice `false`, revisa DB_HOST/DB_USER/DB_NAME).
- `knowledge_entries` es cuántas preguntas activas hay ahora mismo en la
  tabla `chat_voz_conocimiento` — si tu base de datos ya tiene datos
  reales del panel "Chat de voz", debería ser mayor que 0.

## 7. Conecta el widget del chat a esta URL

Abre `chat_widget_fundacion_a_mas.html` (o el archivo del widget que use
tu sitio) y busca la línea con `API_URL`. Cámbiala por tu URL real de
Render, agregando `/chat` al final:

```js
const API_URL = "https://fundacion-a-mas-chat.onrender.com/chat";
```

## 8. Login del chat (nuevo — necesario para el contexto por rol)

Ya no basta con llamar `/chat` directamente para que el asistente conozca
el rol de quien pregunta. El flujo correcto, del lado del frontend
(`app.js`), es:

1. Justo después de que la persona inicia sesión en la app (con su email
   y contraseña normales), el frontend llama:
   ```
   POST /auth/login
   { "email": "...", "password": "..." }
   ```
   y recibe `{ "token": "eyJ..." }`.
2. Ese token se guarda (en memoria de la sesión del navegador) y se manda
   en cada mensaje del chat:
   ```
   POST /chat
   { "messages": [...], "token": "eyJ..." }
   ```
3. Si la persona no ha iniciado sesión (visitante del sitio público), el
   chat sigue funcionando igual que antes: simplemente no se manda
   `token`, y el backend lo trata como visitante público.

Esta parte de conectar `app.js` con estos dos endpoints es la que falta
implementar en el frontend — este backend ya está listo para recibirla.

## 9. La base de conocimiento ya no se exporta a mano

Antes, cada cambio en el panel "Chat de voz" del Superadmin requería
exportar un `knowledge.json` y volver a desplegar. Ahora, si ese panel
escribe directamente en la tabla `chat_voz_conocimiento` de esta misma
base de datos MySQL, el chat lee los cambios en el siguiente mensaje —
sin exportar nada ni redesplegar.

## Nota sobre el plan gratis de Render

El plan free "duerme" el servicio después de ~15 minutos sin uso, y tarda
unos 30-50 segundos en "despertar" la primera vez que alguien vuelve a
escribir en el chat tras la inactividad (el widget ya avisa "no pudimos
conectar" si eso pasa mientras despierta — con reintentar una vez debería
funcionar). Si más adelante el uso crece y esto molesta, el siguiente paso
natural es pasar al plan pago más económico de Render (unos USD 7/mes),
que no duerme el servicio.