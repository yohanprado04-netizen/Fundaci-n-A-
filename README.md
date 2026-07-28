# Fundación A+ — Plataforma con base de datos MySQL (Hostinger)

Este paquete reemplaza el plan anterior basado en Supabase/Postgres por
una base de datos **MySQL propia** y una **API en PHP**, pensadas para
correr en un hosting **compartido o Cloud de Hostinger** (solo PHP +
MySQL, sin Node.js).

## Contenido

| Archivo/carpeta         | Qué es |
|--------------------------|--------|
| `index.html`, `style.css`, `app.js`, `qrcode.min.js`, `Logo.jpg` | Front-end del prototipo. Sin cambios de diseño; solo se actualizó el comentario sobre `db.js` en `index.html`. |
| `schema_mysql.sql`        | Esquema completo de la base de datos (MySQL/MariaDB), listo para importar por phpMyAdmin. Incluye la tabla `horarios` (panel "Horario") y `sesiones` (login propio). |
| `db.js`                   | Cliente de la API (fetch) que expone `Store`/`Auth` con la misma forma que usaba el prototipo — **aún no conectado a app.js**, ver "Pasos pendientes" abajo. |
| `api/config.php`          | Credenciales de la base de datos y ajustes (CORS, subida de archivos). **Edítalo con tus datos reales.** |
| `api/db.php`              | Conexión PDO + helpers (`uuidv4()`, respuestas JSON). |
| `api/auth.php`            | Login propio: valida `usuarios.password_hash` y emite tokens de sesión. |
| `api/entidades.php`       | Lista blanca de tablas expuestas por la API + permisos por rol (léela si vas a agregar una tabla nueva). |
| `api/index.php`           | Router único de la API: `?action=login/logout/me` y CRUD genérico `?entity=...`. |
| `api/upload.php`          | Sube el archivo adjunto de una PQR (PDF/imagen) y devuelve su URL pública. |
| `api/seed.php`            | Script de un solo uso para crear tu primer Superadmin. **Bórralo después de usarlo.** |
| `api/.htaccess`, `api/uploads/.htaccess` | Bloquean el acceso directo a los archivos internos y evitan que se ejecute código dentro de `uploads/`. |

Los archivos `schema.sql` y `supabase_schema.sql` de la versión anterior
**ya no se usan** (eran para Postgres/Supabase); puedes borrarlos.

## Puesta en marcha en Hostinger (hosting compartido/Cloud)

### 1. Crear la base de datos MySQL

En **hPanel → Bases de datos → Bases de datos MySQL**:
1. Crea una base de datos (anota el nombre, algo como `u123456789_fundacion`).
2. Crea un usuario y una contraseña, y asígnaselo con todos los privilegios.
3. Anota el **host** (casi siempre `localhost` en hosting compartido).

### 2. Importar el esquema

En **hPanel → Bases de datos → phpMyAdmin**, entra a tu base y usa la
pestaña **Importar** para subir `schema_mysql.sql` completo. Esto crea
todas las tablas, la vista de encuestas y el catálogo de insignias.

### 3. Subir los archivos

Vía **Administrador de archivos** de hPanel o por FTP, sube TODO el
contenido de este paquete a `public_html` (o a la subcarpeta de tu
dominio/subdominio):

```
public_html/
├── index.html
├── style.css
├── app.js
├── db.js
├── qrcode.min.js
├── Logo.jpg
└── api/
    ├── config.php
    ├── db.php
    ├── auth.php
    ├── entidades.php
    ├── index.php
    ├── upload.php
    ├── seed.php
    ├── .htaccess
    └── uploads/
        └── .htaccess
```

### 4. Configurar credenciales

Abre `api/config.php` y reemplaza `DB_HOST`, `DB_NAME`, `DB_USER` y
`DB_PASS` con los datos del paso 1.

En hPanel, revisa en **Sitios web → PHP Configuration** que la versión
de PHP sea **8.0 o superior** (necesaria para `password_hash` moderno
y tipos de datos usados aquí).

### 5. Crear tu primer Superadmin

Abre en el navegador (una sola vez):

```
https://tudominio.com/api/seed.php?clave_maestra=TU-CLAVE&nombre=Tu%20Nombre&email=admin@tudominio.com&password=UnaClaveFuerte123
```

Antes de esto, edita `CLAVE_MAESTRA` dentro de `api/seed.php` para que
no sea la de ejemplo. **Después de crear el Superadmin, borra
`api/seed.php` del servidor** (cualquiera con la URL podría crear
cuentas mientras exista).

### 6. Probar la API

```
GET  https://tudominio.com/api/index.php?action=me   → 401 si no hay sesión (correcto)
POST https://tudominio.com/api/index.php?action=login  { "email": "...", "password": "..." }
```

Si todo responde en JSON (no un error 500 de PHP), la base de datos y
la API están listas.

## Pasos pendientes en `app.js` (importante)

`db.js` ya expone `Store`/`Auth` async y compatibles, **pero `app.js`
(≈4900 líneas) todavía usa su `Store` original de `localStorage` y el
login con contraseñas hardcodeadas** — por eso en `index.html` la
carga de `db.js` sigue comentada: cargar los dos a la vez rompe la app
(dos `const Store` chocan en el mismo scope).

Para dejar la app 100% conectada a MySQL falta, en `app.js`:

1. Quitar el `const Store = {...}` de localStorage y descomentar
   `<script src="db.js">` en `index.html`.
2. Agregar `await` a cada `Store.list/save/get/set(...)` y marcar
   `async` las funciones que las contienen (son muchas: todos los
   `render...()` del panel admin, docente y estudiante).
3. Reemplazar `submitLogin`, `logout`, `logoutDocente`,
   `logoutEstudiante` por `Auth.login(...)`/`Auth.logout()` (código de
   ejemplo completo dentro de `db.js`, al final del archivo).
4. Quitar `seedIfEmpty()` / `resetDemoData()` (ya no aplican).
5. Donde el código compara por nombre de texto libre (ej.
   `c.estudiante === nombre`), cambiar a comparar por id
   (`c.estudiante_id === currentEstudiante.id`), porque el esquema
   normalizado usa llaves foráneas.
6. En el flujo de PQR, subir el archivo con `Store.subirArchivo(file)`
   antes de crear el registro (ejemplo en `db.js`).
7. La tabla `horarios` identifica la cohorte por `cohorte_id` (llave
   foránea), mientras que hoy `app.js` arma cada horario buscando la
   cohorte por su **nombre** de texto (`cohorte === mod.nombre`). Al
   migrar ese bloque, resuelve primero el `id` de la cohorte y guárdalo
   en `cohorte_id` en vez del nombre.

Es un trabajo mecánico pero grande por el tamaño actual de `app.js`;
dado que cada punto tiene ejemplo de código en `db.js`, puedo hacerlo
contigo por partes (por ejemplo: primero el panel Superadmin, luego
Docente, luego Estudiante) si quieres que lo hagamos ahora.

## Modelo de seguridad de la API (resumen)

- **Autenticación**: `usuarios.password_hash` (bcrypt) + tokens de
  sesión en la tabla `sesiones`, con expiración (`SESION_HORAS` en
  `config.php`). Se envían como `Authorization: Bearer <token>`.
- **Autorización por rol**: `api/entidades.php` define, por cada
  tabla, quién puede leer y quién puede escribir (Superadmin,
  Administrador, Coordinador, Docente, Estudiante).
- **Aislamiento de datos personales**: en tablas como `calificaciones`,
  `asistencia`, `pqr`, `agenda_estudiante` o `correos_estudiante`, un
  Estudiante (o Docente, en PQR) **solo puede ver/crear/editar sus
  propios registros**, sin importar qué id le pida al servidor — el
  filtro lo fuerza la API, no el front-end.
- **Contraseñas**: nunca se guardan ni se transmiten en texto plano;
  se hashean con `password_hash()` (bcrypt) en el servidor.
- **Subida de archivos**: `api/upload.php` valida tamaño y extensión, y
  la carpeta `uploads/` tiene un `.htaccess` que impide ejecutar código
  aunque alguien lograra subir un archivo malicioso.

### Limitaciones conocidas (para seguir endureciendo si el proyecto crece)

- Revisando el `app.js` actual (localStorage), además de las entidades
  de `schema_mysql.sql` usa algunas llaves internas que **todavía no
  tienen tabla equivalente**: `administradores`, `alumnos_cohorte`,
  `agenda_docente`, `informes_docente`, `memorandos_leidos`,
  `notas_modulos`, `qr_tokens`, `sesiones_asistencia`,
  `superadmin_credentials`. Al hacer la migración de `app.js` (sección
  anterior) hay que revisar una por una: algunas son datos reales que
  necesitan su propia tabla, y otras probablemente se puedan reemplazar
  por las tablas que ya existen (por ejemplo `notas_modulos` parece
  duplicar `calificaciones`). Puedo ayudarte a mapear cada una cuando
  lleguemos a esa parte.
- El diseño original de `pqr` preveía que el estado pasara solo de
  "Pendiente" a "Activo" cuando el administrador abre el PDF por
  primera vez. La API genérica no implementa ese efecto automático al
  leer: hoy el administrador debe hacer un `PUT` explícito para
  cambiar el estado (sencillo de agregar como caso especial si lo
  necesitas).
- El aislamiento de un Docente a **solo su propia cohorte** (por
  ejemplo, en `calificaciones`/`asistencia`) no está forzado a nivel de
  fila todavía — hoy un Docente autenticado puede escribir notas/
  asistencia de cualquier cohorte, no solo la suya. Si esto importa,
  se agrega fácilmente en `api/index.php` cruzando `cohortes.docente_id`.
- No hay límite de intentos de login (rate limiting) ni bloqueo tras
  varios intentos fallidos; para producción con muchos usuarios
  conviene agregarlo.
- No hay renovación automática de token (el usuario debe volver a
  iniciar sesión cuando expira, cada `SESION_HORAS`).
- `api/config.php` guarda la contraseña de la base de datos en texto
  plano en el servidor (es lo normal en hosting compartido sin
  variables de entorno); asegúrate de que `.htaccess` bloquee su
  acceso directo (ya incluido) y no subas ese archivo a un repositorio
  público con las credenciales reales.