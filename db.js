/* =====================================================================
   db.js — Conexión Supabase para Fundación A+
   Reemplaza la capa localStorage (Store) del prototipo por Postgres real,
   manteniendo la MISMA interfaz (Store.list/save/get/set) para que el
   resto de app.js necesite el mínimo de cambios.

   Requiere en el HTML, ANTES de este archivo:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   ===================================================================== */

// ---------------------------------------------------------------------
// 1. CONFIGURACIÓN — reemplaza con los datos de TU proyecto Supabase
//    (Project Settings > API). La anon key es pública y segura de
//    exponer en el front-end: la seguridad real la da RLS en Postgres.
// ---------------------------------------------------------------------
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-PUBLICA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------
// 2. MAPA entidad (nombre usado en el prototipo) -> tabla real en Postgres
//    Algunas entidades del prototipo no son tablas 1:1 (p.ej. "modulos"
//    en el prototipo = "cohortes" en el schema normalizado). Se resuelven
//    aquí para que el resto del código no tenga que cambiar de nombre.
// ---------------------------------------------------------------------
const TABLE_MAP = {
  usuarios: 'usuarios',
  administradores: 'administradores',
  alumnos_cohorte: 'alumnos_cohorte',
  modulos: 'cohortes',              // "modulos" del prototipo = cohortes
  pensum: 'pensum',
  memorandos: 'memorandos',
  pqr: 'pqr',
  reuniones: 'reuniones',
  calificaciones: 'calificaciones',
  encuestas: 'encuestas',
  encuestas_respuestas: 'encuesta_respuestas',
  materiales: 'materiales',
  asistencia: 'asistencia',
  insignias_estudiantes: 'insignias_estudiantes',
  agenda_estudiante: 'agenda_estudiante',
  correos_estudiante: 'correos_estudiante',
  semaforo_overrides: 'semaforo_overrides',
  configuracion: 'configuracion',
};

// ---------------------------------------------------------------------
// 3. CAPA DE COMPATIBILIDAD: mismo nombre/forma que el Store original
//    (list, save, get, set) pero leyendo/escribiendo en Supabase.
//
//    OJO — diferencia clave con localStorage: estas funciones ahora son
//    ASÍNCRONAS (devuelven Promesas). Los "await" hay que agregarlos en
//    los puntos de app.js donde antes se llamaba a Store.list(...) de
//    forma síncrona. Ver notas de migración al final del archivo.
// ---------------------------------------------------------------------
const Store = {
  /**
   * Lee todos los registros de una entidad.
   * Uso: const usuarios = await Store.list('usuarios');
   */
  async list(entity) {
    const table = TABLE_MAP[entity] || entity;

    // configuracion y semaforo_overrides tienen forma especial (objeto único / diccionario)
    if (table === 'configuracion') {
      const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single();
      if (error) { console.error('Store.list(configuracion):', error.message); return null; }
      return data;
    }

    const { data, error } = await supabase.from(table).select('*').order('creado_en', { ascending: true });
    if (error) {
      // algunas tablas no tienen creado_en; reintenta sin orden
      const retry = await supabase.from(table).select('*');
      if (retry.error) { console.error(`Store.list(${entity}):`, retry.error.message); return []; }
      return retry.data || [];
    }
    return data || [];
  },

  /**
   * Alias de list(), por compatibilidad con el prototipo.
   */
  async get(entity) {
    return this.list(entity);
  },

  /**
   * Reemplaza el arreglo COMPLETO de una entidad (comportamiento del
   * localStorage original). Se usa poco: donde el código antiguo hace
   * "modificar el arreglo en memoria y luego Store.save(...)", conviene
   * migrar a las funciones granulares insert/update/remove de abajo.
   */
  async save(entity, records) {
    const table = TABLE_MAP[entity] || entity;
    if (!Array.isArray(records)) {
      // caso configuracion: objeto único
      const { error } = await supabase.from(table).update(records).eq('id', 1);
      if (error) { console.error(`Store.save(${entity}):`, error.message); return false; }
      return true;
    }
    // upsert de todos los registros (requiere que cada uno tenga "id")
    const { error } = await supabase.from(table).upsert(records);
    if (error) { console.error(`Store.save(${entity}):`, error.message); return false; }
    return true;
  },

  /**
   * Alias de save(), por compatibilidad con el prototipo.
   */
  async set(entity, data) {
    return this.save(entity, data);
  },

  // -------------------------------------------------------------------
  // Funciones granulares — RECOMENDADAS para reemplazar los puntos donde
  // app.js hace push/splice sobre el arreglo en memoria y luego guarda
  // todo de nuevo. Son más rápidas y evitan condiciones de carrera.
  // -------------------------------------------------------------------

  /** Inserta un registro nuevo. Devuelve el registro insertado (con id generado por Postgres) o null. */
  async insert(entity, record) {
    const table = TABLE_MAP[entity] || entity;
    const { data, error } = await supabase.from(table).insert(record).select().single();
    if (error) { console.error(`Store.insert(${entity}):`, error.message); return null; }
    return data;
  },

  /** Actualiza un registro por id. Devuelve el registro actualizado o null. */
  async update(entity, id, changes) {
    const table = TABLE_MAP[entity] || entity;
    const { data, error } = await supabase.from(table).update(changes).eq('id', id).select().single();
    if (error) { console.error(`Store.update(${entity}):`, error.message); return null; }
    return data;
  },

  /** Elimina un registro por id. Devuelve true/false. */
  async remove(entity, id) {
    const table = TABLE_MAP[entity] || entity;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { console.error(`Store.remove(${entity}):`, error.message); return false; }
    return true;
  },
};

// ---------------------------------------------------------------------
// 4. AUTENTICACIÓN REAL con Supabase Auth
//    Reemplaza las comparaciones hardcodeadas (SUPERADMIN_CREDENTIALS,
//    ADMIN_DEMO_PASSWORD, etc.) del prototipo original.
// ---------------------------------------------------------------------
const Auth = {
  /**
   * Inicia sesión y devuelve el perfil (fila de usuarios o administradores)
   * ya vinculado, junto con su rol efectivo.
   * Lanza un objeto { message } legible si las credenciales fallan.
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { message: 'Credenciales incorrectas. Verifica el correo y la contraseña.' };

    const authId = data.user.id;

    // 1) ¿es un administrador del panel Superadmin (multi-tenant)?
    const { data: admin } = await supabase.from('administradores').select('*').eq('auth_id', authId).maybeSingle();
    if (admin) return { tipo: 'administrador', perfil: admin };

    // 2) si no, es un usuario normal (Estudiante/Docente/Coordinador/Superadmin)
    const { data: usuario, error: uErr } = await supabase.from('usuarios').select('*').eq('auth_id', authId).maybeSingle();
    if (uErr || !usuario) {
      await supabase.auth.signOut();
      throw { message: 'Tu cuenta no tiene un perfil asociado. Contacta al administrador.' };
    }
    return { tipo: 'usuario', perfil: usuario };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  /** Devuelve la sesión activa (o null) — útil para mantener el login al recargar la página. */
  async sesionActual() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};

/* =====================================================================
   NOTAS DE MIGRACIÓN en app.js
   =====================================================================

   1) TODO lo que antes era síncrono ahora es async. Ejemplos de cambios
      necesarios en app.js:

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
          const { tipo, perfil } = await Auth.login(email, password);
          errorEl.classList.add('hidden');

          if (tipo === 'administrador' || perfil.rol === 'Superadmin' || perfil.rol === 'Coordinador') {
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

   4) seedIfEmpty() / resetDemoData() ya NO aplican: los datos ahora viven
      en Postgres, no en localStorage. Elimina esas llamadas de app.js
      (o déjalas vacías) — el schema.sql / supabase_schema.sql es el que
      siembra datos iniciales vía INSERT si lo necesitas.

   5) Los formularios que hacían:
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

   5b) PQR en Supabase real: hoy el prototipo guarda el PDF como data URL en
       localStorage (archivoDatos, campo de texto). En Postgres, pqr.archivo_url
       espera una URL de Supabase Storage, no el archivo en base64. Al migrar,
       sube el PDF con supabase.storage.from('pqr').upload(...) y guarda la
       URL pública/firmada resultante en archivo_url.


   6) Los campos de texto libre del prototipo ("estudiante": "Loren...",
      "modulo": "Base de Datos") ya NO existen en el schema normalizado:
      ahora son estudiante_id / programa_id (UUID). Los renderers de
      app.js que hacían comparaciones por nombre (ej. en la línea 1652:
      c.estudiante === nombre) deben cambiar a comparar por id:
      c.estudiante_id === currentEstudiante.id
   ===================================================================== */