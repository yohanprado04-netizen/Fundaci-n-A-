/**
 * db.js — Capa cliente hacia el backend PHP (api/).
 *
 * Estado real (no confiar en el número de "fase" salvo aquí, en
 * ENTIDADES_MYSQL, que es la única fuente de verdad): todas las entidades
 * listadas en ENTIDADES_MYSQL hablan de verdad con MySQL a través de este
 * archivo. Cualquier entidad que NO esté en esa lista sigue usando
 * localStorage — Store.list/get/set/save cae al mismo código de siempre
 * para ella, sin ningún cambio de comportamiento.
 *
 * IMPORTANTE: para cualquier entidad en ENTIDADES_MYSQL, Store es
 * asíncrono de verdad (devuelve una Promise) — TODA función de app.js que
 * llame a Store.list/get/set/save con una de esas entidades debe ser
 * `async` y usar `await` en esa llamada.
 */

// ── Configuración de la URL del backend PHP ─────────────────────────────
// En local (probando con Live Server, XAMPP, Laragon...), el backend PHP
// normalmente corre en un puerto/host distinto al del frontend.
//
// Si despliegas SOLO el frontend (por ejemplo en GitHub Pages desde
// https://github.com/yohanprado04-netizen/fundacionamas.git o en Vercel),
// debes colocar en BACKEND_PRODUCCION_URL la URL pública donde tengas
// alojada la carpeta /api/ (por ejemplo tu hosting Hostinger, Render, etc.).
//
// Si el frontend y la carpeta /api/ viven en el MISMO servidor/dominio,
// déjalo vacío ('') para que use rutas relativas directas.
const BACKEND_PRODUCCION_URL = ''; // <-- Si subes solo el frontend a GitHub Pages, pon aquí la URL de tu API (ej. 'https://tudominio.com/fundacion-api')

const API_BASE_URL = (function() {
  if (typeof window !== 'undefined' && window.FUNDACION_API_BASE_URL) {
    return window.FUNDACION_API_BASE_URL.replace(/\/+$/, '');
  }
  if (BACKEND_PRODUCCION_URL) {
    return BACKEND_PRODUCCION_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/([^/]+)/);
    // Si la app se ejecuta dentro del subdirectorio /fundacion-api (ej. Apache en XAMPP)
    if (match && match[1].toLowerCase() === 'fundacion-api') {
      return window.location.origin + '/' + match[1];
    }
    // Si se ejecuta en la raíz del servidor (ej. http://localhost:8000, http://192.168.X.X:8000 o dominio web)
    return window.location.origin;
  }
  return '';
})();

// DB_PREFIX_TOKEN: nombre distinto al DB_PREFIX que ya declara app.js (const
// DB_PREFIX = 'aplus_admin_v1_'; dentro de su IIFE) — este archivo se carga
// en un <script> normal, en el MISMO scope global que app.js, así que dos
// "const DB_PREFIX" chocan con un SyntaxError que rompe TODO app.js (por
// eso el login fallaba con "submitLogin is not defined": el script nunca
// terminaba de cargar). El valor es el mismo string, solo cambia el
// nombre de la variable en este archivo.
const DB_PREFIX_TOKEN = 'aplus_admin_v1_';

/**
 * Token de sesión emitido por /api/auth/login (ver auth.php). Se guarda
 * en memoria y en localStorage (para sobrevivir a un refresh de página)
 * — nunca en una cookie, porque este backend no la necesita y así se
 * evita cualquier problema de CORS con cookies entre orígenes distintos.
 */
let authToken = localStorage.getItem(DB_PREFIX_TOKEN + 'authToken') || null;

function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem(DB_PREFIX_TOKEN + 'authToken', token);
  else localStorage.removeItem(DB_PREFIX_TOKEN + 'authToken');
}

function getAuthToken() {
  return authToken;
}

/**
 * POST /api/auth/login — reemplaza la comparación en memoria que hacía
 * antes submitLogin() en app.js. Devuelve { token, usuario } si las
 * credenciales son válidas, o lanza un Error con el mensaje del backend
 * si no (credenciales incorrectas, cuenta pendiente, cuenta inactiva,
 * etc.) — quien llame decide cómo mostrar ese mensaje en el formulario.
 */
async function apiLogin(email, password) {
  try {
    const resp = await fetch(API_BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const datos = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(datos.error || 'No se pudo iniciar sesión. Intenta de nuevo.');
    }
    setAuthToken(datos.token);
    return datos;
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('comunicarse con el servidor')) {
      throw err;
    }
    throw new Error('No se pudo conectar con el servidor local (' + API_BASE_URL + '). Verifica que Apache y MySQL estén iniciados en el Panel de Control de XAMPP.');
  }
}

/**
 * Petición autenticada genérica hacia /api/<entidad> — agrega el header
 * Authorization con el token guardado. Si el backend responde 401
 * (sesión inválida/expirada), limpia el token local.
 */
async function apiFetch(entidad, opciones = {}) {
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
    opciones.headers || {},
    authToken ? { Authorization: 'Bearer ' + authToken } : {}
  );
  let url = API_BASE_URL + '/api/' + entidad;
  const metodo = (opciones.method || 'GET').toUpperCase();
  if (metodo === 'GET') {
    url += (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }
  const resp = await fetch(url, Object.assign({ cache: 'no-store' }, opciones, { headers }));
  if (resp.status === 401) setAuthToken(null);
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(datos.error || ('Error al comunicarse con el servidor (' + resp.status + ').'));
  }
  return datos;
}

// ── Entidades migradas a MySQL ────────────────────────────────────────
const ENTIDADES_MYSQL = new Set([
  'usuarios',
  'modulos', 'horarios', 'notas_modulos', 'asistencia', 'sesiones_asistencia', 'qr_tokens',
  'semaforo',
  'pqr', 'encuestas', 'cursos',
  'auditoria_login', 'auditoria_acciones', 'auditoria_horario',
  'informes_docente', 'agenda_docente', 'agenda_estudiante',
  'configuracion',           // objeto único
  'superadmin_credentials',  // objeto único
  'perfiles',                // array
  'memorandos',              // array
  'pensum',                  // array
  'memorandos_leidos',       // objeto anidado { memorandoId: { email: true } }
  'chat_voz_conocimiento',   // base de conocimiento en MySQL
  'trainee_archivos',        // historial de archivos del estudiante en MySQL
]);

// Entidades que son objetos únicos (no arrays).
const ENTIDADES_OBJETO_UNICO = new Set([
  'configuracion',
  'superadmin_credentials',
]);

const ENTIDADES_OBJETO_ANIDADO = new Set([
  'memorandos_leidos',
]);

// ── Capa de Caché en Memoria y Deduplicación de Peticiones ─────────────
// Evita consultas redundantes al backend y agrupa llamadas concurrentes
// a la misma entidad en una sola petición de red en curso (in-flight).
const _storeCache = new Map();     // key -> { data, ts }
const _storeInFlight = new Map();  // key -> Promise
const CACHE_TTL_MS = 25000;        // 25 segundos de vigencia para lecturas

function _getCached(key) {
  const item = _storeCache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > CACHE_TTL_MS) {
    _storeCache.delete(key);
    return null;
  }
  return typeof structuredClone === 'function' ? structuredClone(item.data) : JSON.parse(JSON.stringify(item.data));
}

function _setCached(key, data) {
  try {
    const copia = typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));
    _storeCache.set(key, { data: copia, ts: Date.now() });
  } catch (e) {
    _storeCache.set(key, { data, ts: Date.now() });
  }
}

function _invalidateCache(entity) {
  if (!entity) {
    _storeCache.clear();
    return;
  }
  for (const key of _storeCache.keys()) {
    if (key === entity || key.startsWith(entity + '?') || key.startsWith(entity + ':')) {
      _storeCache.delete(key);
    }
  }
}

/**
 * Store — Capa de persistencia local resiliente con caché y deduplicación.
 * Se comunica con la base de datos MySQL local (XAMPP). Si el servidor local
 * está apagado o en mantenimiento, cuenta con respaldo automático a localStorage
 * para que la interfaz nunca se rompa.
 */
const Store = {
  get(entity, opciones = {}) {
    const forceRefresh = opciones.forceRefresh === true;
    if (ENTIDADES_MYSQL.has(entity)) {
      const cacheKey = entity;
      if (!forceRefresh) {
        const cached = _getCached(cacheKey);
        if (cached !== null) return Promise.resolve(cached);
        if (_storeInFlight.has(cacheKey)) return _storeInFlight.get(cacheKey);
      }

      const p = apiFetch(entity, { method: 'GET' }).then(data => {
        let res;
        if (ENTIDADES_OBJETO_UNICO.has(entity)) res = data.data ?? data ?? null;
        else if (ENTIDADES_OBJETO_ANIDADO.has(entity)) res = data ?? {};
        else res = data;
        _setCached(cacheKey, res);
        return res;
      }).catch(err => {
        console.warn(`[Store.get] Modo local offline para "${entity}":`, err.message);
        try {
          const raw = localStorage.getItem(DB_PREFIX_TOKEN + entity);
          if (raw) return JSON.parse(raw);
          return ENTIDADES_OBJETO_ANIDADO.has(entity) ? {} : (ENTIDADES_OBJETO_UNICO.has(entity) ? null : []);
        } catch (e) { return null; }
      }).finally(() => {
        _storeInFlight.delete(cacheKey);
      });

      _storeInFlight.set(cacheKey, p);
      return p;
    }
    try {
      const raw = localStorage.getItem(DB_PREFIX_TOKEN + entity);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  // Devuelve un objeto { ok, remoto } — no solo `true` a secas — para que
  // quien llame pueda distinguir "se guardó de verdad en el servidor"
  // (remoto: true) de "solo quedó en este navegador porque el servidor no
  // respondió o respondió con error" (remoto: false).
  set(entity, data) {
    _invalidateCache(entity);
    try {
      localStorage.setItem(DB_PREFIX_TOKEN + entity, JSON.stringify(data));
    } catch (e) {}

    if (ENTIDADES_MYSQL.has(entity)) {
      const body = ENTIDADES_OBJETO_UNICO.has(entity)
        ? JSON.stringify({ data })
        : JSON.stringify(data);
      return apiFetch(entity, { method: 'POST', body }).then(() => ({ ok: true, remoto: true })).catch(err => {
        console.warn(`[Store.set] No se pudo guardar "${entity}" en el servidor, quedó solo en este navegador:`, err.message);
        return { ok: true, remoto: false, error: err.message };
      });
    }
    return { ok: true, remoto: false };
  },

  list(entity, opciones = {}) {
    const forceRefresh = opciones.forceRefresh === true;
    const baseEntity = entity.includes('?') ? entity.split('?')[0] : entity;
    if (ENTIDADES_MYSQL.has(baseEntity)) {
      if (ENTIDADES_OBJETO_UNICO.has(baseEntity) || ENTIDADES_OBJETO_ANIDADO.has(baseEntity)) {
        return this.get(baseEntity, opciones);
      }

      let queryString = '';
      if (entity.includes('?')) {
        queryString = entity.slice(entity.indexOf('?'));
      } else if (opciones.query) {
        queryString = '?' + (opciones.query.startsWith('?') ? opciones.query.slice(1) : opciones.query);
      } else if (opciones.params && typeof opciones.params === 'object') {
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(opciones.params)) {
          if (v !== undefined && v !== null && v !== '') p.set(k, v);
        }
        const qs = p.toString();
        if (qs) queryString = '?' + qs;
      }

      const endpoint = baseEntity + queryString;
      const cacheKey = endpoint;

      if (!forceRefresh) {
        const cached = _getCached(cacheKey);
        if (cached !== null) return Promise.resolve(cached);
        if (_storeInFlight.has(cacheKey)) return _storeInFlight.get(cacheKey);
      }

      const p = apiFetch(endpoint, { method: 'GET' }).then(datos => {
        let resultado = [];
        if (Array.isArray(datos)) {
          resultado = datos;
        } else if (datos && Array.isArray(datos.data)) {
          resultado = datos.data;
        }
        _setCached(cacheKey, resultado);
        return resultado;
      }).catch(err => {
        console.warn(`[Store.list] Modo local offline para "${entity}":`, err.message);
        const raw = localStorage.getItem(DB_PREFIX_TOKEN + baseEntity);
        return raw ? JSON.parse(raw) : [];
      }).finally(() => {
        _storeInFlight.delete(cacheKey);
      });

      _storeInFlight.set(cacheKey, p);
      return p;
    }
    return this.get(entity) || [];
  },

  save(entity, records) {
    _invalidateCache(entity);
    return this.set(entity, records);
  },

  /**
   * Obtiene un archivo/documento puntual bajo demanda por su ID.
   * Evita transferir archivos pesados en listados.
   */
  getArchivo(entidad, id) {
    return apiFetch(`${entidad}?id=${encodeURIComponent(id)}`, { method: 'GET' });
  },

  /**
   * Invalida la caché de una entidad o de todo el Store.
   */
  invalidate(entity) {
    _invalidateCache(entity);
  },

  /**
   * Limpia toda la caché en memoria para forzar recargas frescas.
   */
  clearCache() {
    _invalidateCache();
  },

  /**
   * Actualiza SOLO fotoUrl y/o descripcion del usuario actualmente logueado.
   */
  actualizarPerfilPropio(cambios) {
    _invalidateCache('usuarios');
    return apiFetch('perfil_propio', { method: 'PUT', body: JSON.stringify(cambios) })
      .then(() => ({ ok: true, remoto: true }))
      .catch(err => {
        console.warn('[Store.actualizarPerfilPropio] No se pudo guardar en el servidor:', err.message);
        return { ok: true, remoto: false, error: err.message };
      });
  },

  /**
   * Sube un archivo puntual del estudiante a MySQL (tabla trainee_archivos).
   * Devuelve { ok, remoto, id }.
   */
  agregarArchivo(archivo) {
    _invalidateCache('trainee_archivos');
    if (!archivo.id) archivo.id = 'ta_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    return apiFetch('trainee_archivos', {
      method: 'POST',
      body: JSON.stringify(archivo),
    }).then(res => {
      try {
        localStorage.removeItem(DB_PREFIX_TOKEN + 'trainee_archivos');
      } catch (e) {}
      return { ok: true, remoto: true, id: (res && res.id) || archivo.id };
    }).catch(err => {
      console.warn('[Store.agregarArchivo] No se pudo guardar en el servidor:', err.message);
      return { ok: false, remoto: false, error: err.message };
    });
  },

  /**
   * Elimina un archivo puntual de la base de datos MySQL (tabla trainee_archivos).
   * Devuelve { ok, remoto }.
   */
  eliminarArchivo(archivoId) {
    _invalidateCache('trainee_archivos');
    return apiFetch('trainee_archivos?id=' + encodeURIComponent(archivoId), {
      method: 'DELETE',
      body: JSON.stringify({ id: archivoId }),
    }).then(() => {
      try {
        localStorage.removeItem(DB_PREFIX_TOKEN + 'trainee_archivos');
      } catch (e) {}
      return { ok: true, remoto: true };
    }).catch(err => {
      console.warn('[Store.eliminarArchivo] No se pudo eliminar en el servidor:', err.message);
      return { ok: false, remoto: false, error: err.message };
    });
  },
};

// Migración transparente: si hay archivos guardados en localStorage,
// se envían a MySQL SOLO si el usuario ya tiene sesión iniciada.
(function migrarTraineeArchivosDeLocalStorage() {
  try {
    if (!authToken) return; // No generar peticiones no autorizadas en visitantes públicos
    const raw = localStorage.getItem(DB_PREFIX_TOKEN + 'trainee_archivos');
    if (!raw) return;
    const locales = JSON.parse(raw);
    if (Array.isArray(locales) && locales.length > 0) {
      apiFetch('trainee_archivos', {
        method: 'POST',
        body: JSON.stringify(locales),
      }).then(() => {
        localStorage.removeItem(DB_PREFIX_TOKEN + 'trainee_archivos');
      }).catch(() => {});
    } else {
      localStorage.removeItem(DB_PREFIX_TOKEN + 'trainee_archivos');
    }
  } catch (e) {}
})();