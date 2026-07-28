/* =====================================================================
   db.js — Cliente de la API propia (PHP + MySQL en Hostinger).
   Reemplaza la capa localStorage (Store) del prototipo por MySQL real,
   manteniendo la MISMA interfaz (Store.list/save/get/set/insert/update/
   remove) para que app.js necesite el mínimo de cambios posible.

   Ya NO se usa Supabase: este archivo habla directo con api/index.php
   (mismo dominio o el que definas en API_BASE_URL) usando fetch().
   ===================================================================== */

// ---------------------------------------------------------------------
// 1. CONFIGURACIÓN — normalmente no hay que tocar nada si subes /api a
//    la MISMA carpeta que index.html (ej: public_html/api/index.php).
//    Si tu API vive en otro dominio/subdominio, cambia esta URL.
// ---------------------------------------------------------------------
const API_BASE_URL = '/api/index.php';
const UPLOAD_URL = '/api/upload.php';
const TOKEN_STORAGE_KEY = 'aplus_token';

// ---------------------------------------------------------------------
// 2. Helpers de bajo nivel (fetch + token guardado en localStorage,
//    igual que hace cualquier app web para no pedir login en cada
//    recarga de página).
// ---------------------------------------------------------------------
function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE_URL + path, Object.assign({}, options, { headers }));
  let data = null;
  try { data = await res.json(); } catch (e) { /* respuesta vacía */ }

  if (!res.ok) {
    const mensaje = (data && data.error) || ('Error HTTP ' + res.status);
    throw { message: mensaje, status: res.status };
  }
  return data;
}

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? '?' + entries.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&') : '';
}

// ---------------------------------------------------------------------
// 3. CAPA DE COMPATIBILIDAD: misma forma que el Store original del
//    prototipo (list, save, get, set) pero hablando con MySQL vía API.
//
//    OJO — igual que con Supabase: estas funciones son ASÍNCRONAS
//    (devuelven Promesas). Hay que agregar "await" donde antes se
//    llamaba a Store.list(...) de forma síncrona. Ver notas al final.
// ---------------------------------------------------------------------
const Store = {
  /** Lee todos los registros de una entidad. Uso: const modulos = await Store.list('modulos'); */
  async list(entity) {
    try {
      return await apiFetch('?entity=' + encodeURIComponent(entity));
    } catch (e) {
      console.error(`Store.list(${entity}):`, e.message);
      return entity === 'configuracion' ? null : [];
    }
  },

  /** Alias de list(), por compatibilidad con el prototipo. */
  async get(entity) {
    return this.list(entity);
  },

  /**
   * Reemplaza el arreglo COMPLETO de una entidad (comportamiento del
   * localStorage original: "modifico el arreglo en memoria y llamo a
   * Store.save"). Aquí se traduce a una serie de upserts (insert si no
   * existe / update si ya existe) contra la API. Funciona, pero para
   * entidades grandes es más eficiente usar insert/update/remove.
   */
  async save(entity, records) {
    try {
      if (!Array.isArray(records)) {
        // caso configuracion: objeto único
        await apiFetch('?entity=' + encodeURIComponent(entity), { method: 'PUT', body: JSON.stringify(records) });
        return true;
      }
      for (const record of records) {
        if (record && record.id) {
          await apiFetch('?entity=' + encodeURIComponent(entity) + '&id=' + encodeURIComponent(record.id), {
            method: 'PUT', body: JSON.stringify(record),
          }).catch(async () => {
            // si no existía todavía, créalo
            await apiFetch('?entity=' + encodeURIComponent(entity), { method: 'POST', body: JSON.stringify(record) });
          });
        } else {
          await apiFetch('?entity=' + encodeURIComponent(entity), { method: 'POST', body: JSON.stringify(record) });
        }
      }
      return true;
    } catch (e) {
      console.error(`Store.save(${entity}):`, e.message);
      return false;
    }
  },

  /** Alias de save(), por compatibilidad con el prototipo. */
  async set(entity, data) {
    return this.save(entity, data);
  },

  // -------------------------------------------------------------------
  // Funciones granulares — RECOMENDADAS para reemplazar los puntos donde
  // app.js hace push/splice sobre el arreglo en memoria y luego guarda
  // todo de nuevo. Son más rápidas y evitan condiciones de carrera.
  // -------------------------------------------------------------------

  /** Inserta un registro nuevo. Devuelve el registro insertado (con id generado por la API) o null. */
  async insert(entity, record) {
    try {
      return await apiFetch('?entity=' + encodeURIComponent(entity), { method: 'POST', body: JSON.stringify(record) });
    } catch (e) {
      console.error(`Store.insert(${entity}):`, e.message);
      return null;
    }
  },

  /** Actualiza un registro por id. Devuelve el registro actualizado o null. */
  async update(entity, id, changes) {
    try {
      return await apiFetch('?entity=' + encodeURIComponent(entity) + '&id=' + encodeURIComponent(id), {
        method: 'PUT', body: JSON.stringify(changes),
      });
    } catch (e) {
      console.error(`Store.update(${entity}):`, e.message);
      return null;
    }
  },

  /** Elimina un registro por id. Devuelve true/false. */
  async remove(entity, id) {
    try {
      await apiFetch('?entity=' + encodeURIComponent(entity) + '&id=' + encodeURIComponent(id), { method: 'DELETE' });
      return true;
    } catch (e) {
      console.error(`Store.remove(${entity}):`, e.message);
      return false;
    }
  },

  /**
   * Sube un archivo (usado por PQR) y devuelve { archivo_nombre,
   * archivo_tipo, archivo_url } para guardar junto al registro de pqr.
   */
  async subirArchivo(file) {
    const form = new FormData();
    form.append('archivo', file);
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: form, headers });
    const data = await res.json();
    if (!res.ok) throw { message: data.error || 'No se pudo subir el archivo.' };
    return data;
  },
};

// ---------------------------------------------------------------------
// 4. AUTENTICACIÓN REAL contra nuestra propia API (usuarios.password_hash)
//    Reemplaza las comparaciones hardcodeadas (SUPERADMIN_CREDENTIALS,
//    ADMIN_DEMO_PASSWORD, etc.) del prototipo original.
// ---------------------------------------------------------------------
const Auth = {
  /**
   * Inicia sesión y devuelve el perfil (fila de usuarios) ya autenticado.
   * Lanza un objeto { message } legible si las credenciales fallan.
   */
  async login(email, password) {
    const data = await apiFetch('?action=login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.token);
    return data.usuario;
  },

  async logout() {
    try { await apiFetch('?action=logout', { method: 'POST' }); } catch (e) { /* token ya inválido, no pasa nada */ }
    setToken(null);
  },

  /** Devuelve el usuario de la sesión activa (o null) — útil para mantener el login al recargar la página. */
  async sesionActual() {
    if (!getToken()) return null;
    try {
      return await apiFetch('?action=me');
    } catch (e) {
      setToken(null);
      return null;
    }
  },
};

/* =====================================================================
   NOTAS DE MIGRACIÓN en app.js
   =====================================================================

   1) TODO lo que antes era síncrono ahora es async. Ejemplo:

      ANTES:
        const modulos = Store.list('modulos');
      AHORA:
        const modulos = await Store.list('modulos');
      (y la función que lo contiene debe declararse "async function ...")

   2) Login (reemplaza submitLogin en app.js):

      async function submitLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorEl = document.getElementById('loginError');
        if (!email || !password) {
          errorEl.textContent = 'Completa tu correo y contraseña para continuar.';
          errorEl.classList.remove('hidden');
          return;
        }
        try {
          const perfil = await Auth.login(email, password);
          errorEl.classList.add('hidden');

          if (perfil.rol === 'Superadmin' || perfil.rol === 'Coordinador' || perfil.rol === 'Administrador') {
            currentAdminRole = perfil.rol === 'Superadmin' ? 'superadmin' : 'administracion';
            document.getElementById('siteView').classList.add('hidden');
            document.getElementById('dashboardView').classList.remove('hidden');
            applyAdminRoleUI(perfil);
            await initAdmin();
            showPanel('resumen');
          } else if (perfil.rol === 'Docente') {
            currentDocente = perfil;
            document.getElementById('siteView').classList.add('hidden');
            document.getElementById('teacherView').classList.remove('hidden');
            showPanelDocente('resumen');
          } else if (perfil.rol === 'Estudiante') {
            currentEstudiante = perfil;
            document.getElementById('siteView').classList.add('hidden');
            document.getElementById('studentView').classList.remove('hidden');
            await initEstudiante();
            showPanelEstudiante('resumen');
          }
          window.scrollTo(0, 0);
        } catch (err) {
          errorEl.textContent = err.message || 'No se pudo iniciar sesión.';
          errorEl.classList.remove('hidden');
        }
      }

   3) Logout (reemplaza logout/logoutDocente/logoutEstudiante):
        async function logout() {
          await Auth.logout();
          ...resto igual (ocultar dashboard, mostrar siteView)...
        }

   4) Mantener sesión al recargar la página: al cargar el sitio, llama a
      "const perfil = await Auth.sesionActual();" y si no es null, salta
      directo al panel correspondiente en vez de mostrar el login.

   5) seedIfEmpty() / resetDemoData() ya NO aplican: los datos ahora viven
      en MySQL, no en localStorage. Elimina esas llamadas de app.js — el
      primer usuario (Superadmin) se crea una sola vez con api/seed.php.

   6) Los formularios que hacían:
        const lista = Store.list('pqr');
        lista.push(nuevoRegistro);
        Store.save('pqr', lista);
      se simplifican a:
        await Store.insert('pqr', nuevoRegistro);

      y los que editaban un registro:
        const lista = Store.list('pqr').map(p => p.id === id ? {...p, estado:'Activo'} : p);
        Store.save('pqr', lista);
      se simplifican a:
        await Store.update('pqr', id, { estado: 'Activo', fecha_activacion: hoy });

   6b) PQR — el prototipo guardaba el PDF como data URL en localStorage.
       Con la API real, primero sube el archivo y luego crea el registro:
         const subido = await Store.subirArchivo(inputFile.files[0]);
         await Store.insert('pqr', {
           tipo, solicitante_id: currentEstudiante.id, remitente_rol: 'Estudiante',
           asunto, archivo_nombre: subido.archivo_nombre,
           archivo_tipo: subido.archivo_tipo, archivo_url: subido.archivo_url,
         });

   7) Los campos de texto libre del prototipo ("estudiante": "Loren...",
      "modulo": "Base de Datos") ya NO existen en el esquema normalizado:
      ahora son estudiante_id / programa_id (UUID). Los renderers de
      app.js que comparan por nombre (ej. c.estudiante === nombre) deben
      cambiar a comparar por id: c.estudiante_id === currentEstudiante.id

   8) "modulos" sigue llamándose así del lado de app.js (Store.list
      ('modulos')): la API lo traduce internamente a la tabla `cohortes`
      (ver api/entidades.php), así que NO hace falta cambiar ese nombre
      en app.js.
   ===================================================================== */