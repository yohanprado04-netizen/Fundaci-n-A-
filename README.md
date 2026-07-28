# Fundación A+ — Plataforma con Supabase

Este paquete contiene el front-end del prototipo **ya preparado** para
conectarse a una base de datos PostgreSQL real vía **Supabase**
(Postgres + API instantánea + Auth), usando el servidor Postgres que
ya tienes.

## Contenido

| Archivo                | Qué es |
|-------------------------|--------|
| `index.html`             | Página principal (sitio + los 3 paneles: Superadmin, Docente, Estudiante). Ya incluye las etiquetas `<script>` para cargar Supabase y `db.js`. |
| `style.css`              | Estilos del sitio (constelación, panel superadmin, etc.). Sin cambios. |
| `app.js`                 | Toda la lógica de la app (renderers, formularios, navegación). **Aún usa la capa `Store` original (localStorage)** — ver sección "Pasos pendientes en app.js" abajo. |
| `db.js`                  | Cliente Supabase + capa `Store`/`Auth` que reemplaza localStorage por Postgres. Incluye notas de migración al final del archivo. |
| `schema.sql`             | Esquema de base de datos original (tablas, tipos, índices). |
| `supabase_schema.sql`    | Extensión del esquema: vincula `usuarios`/`administradores` con `auth.users` de Supabase y activa Row Level Security (RLS) por rol y por cohorte. |

## Puesta en marcha

### 1. Base de datos (tu servidor Postgres / proyecto Supabase)

Ejecuta en este orden, en el SQL editor de Supabase (o con `psql`):

```sql
-- 1º
\i schema.sql

-- 2º
\i supabase_schema.sql
```

### 2. Credenciales del proyecto

Abre `db.js` y reemplaza:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-PUBLICA';
```

con los valores de **Project Settings → API** en tu panel de Supabase.
La `anon key` es pública y segura de exponer en el navegador: la
seguridad real la da RLS en la base de datos.

### 3. Crear usuarios de acceso

Los logins hardcodeados del prototipo (`superadmin@aplus.org` /
`Super2026#`, etc.) ya no existen en el código. Debes crear cada
cuenta en **Authentication → Users** dentro de Supabase, usando el
mismo correo que ya tiene esa persona en la tabla `usuarios` o
`administradores`. Un trigger (incluido en `supabase_schema.sql`) las
enlaza automáticamente por email la primera vez que inician sesión.

### 4. Pasos pendientes en `app.js`

`db.js` ya expone `Store` y `Auth` con la misma forma que el
prototipo, pero **ahora son asíncronos** (devuelven promesas, porque
consultan Postgres en vez de leer localStorage). Para dejar `app.js`
100% funcional con datos reales hace falta:

1. Agregar `await` a cada llamada `Store.list(...)`, `Store.save(...)`,
   etc., y marcar como `async` las funciones que las contienen.
2. Reemplazar `submitLogin`, `logout`, `logoutDocente` y
   `logoutEstudiante` para usar `Auth.login(...)` / `Auth.logout()` en
   vez de las comparaciones de contraseñas hardcodeadas.
3. Quitar las llamadas a `seedIfEmpty()` / `resetDemoData()` (ya no
   aplican: los datos viven en Postgres, no en localStorage).
4. Donde el código compara por nombre de texto libre (ej.
   `c.estudiante === nombre`), cambiar a comparar por id (ej.
   `c.estudiante_id === currentEstudiante.id`), porque el esquema
   normalizado usa llaves foráneas en vez de strings repetidos.

Cada uno de estos puntos está explicado con ejemplos de código
**dentro del propio `db.js`**, al final del archivo, en el bloque de
comentarios "NOTAS DE MIGRACIÓN en app.js".

## Seguridad

- Nunca pongas la **Service Role Key** de Supabase en este front-end;
  esa key ignora RLS y solo debe usarse en un backend propio.
- Las contraseñas ya no se guardan en `usuarios.password_hash` ni en
  el código: las gestiona Supabase Auth.
