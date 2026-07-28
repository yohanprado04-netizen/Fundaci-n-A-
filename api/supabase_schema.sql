-- =====================================================================
--  FUNDACIÓN A+ — Esquema adaptado a Supabase (Postgres + Auth + RLS)
--  Basado en schema.sql original. Ejecutar en tu servidor Postgres
--  (SQL editor de Supabase o psql) EN ESTE ORDEN.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASO 0: pegar aquí el contenido completo de tu schema.sql original
-- (tipos ENUM + todas las tablas: usuarios, cohortes, programas, etc.)
-- Este archivo solo agrega lo necesario para conectar con Supabase Auth
-- y activar seguridad a nivel de fila (RLS). No lo ejecutes solo:
-- primero corre schema.sql, luego este archivo.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. VINCULAR usuarios CON supabase auth.users
--    Cada persona que inicia sesión (estudiante, docente, coordinador,
--    superadmin) tiene una fila en auth.users (maneja el password_hash
--    real) y una fila en public.usuarios (perfil + rol + cohorte).
-- ---------------------------------------------------------------------
ALTER TABLE usuarios
    ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- lo mismo para administradores (multi-tenant por cohorte)
ALTER TABLE administradores
    ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- password_hash ya no se usa: Supabase Auth gestiona las contraseñas.
-- Se deja la columna por compatibilidad pero no se debe escribir en ella.

-- ---------------------------------------------------------------------
-- 2. TRIGGER: cuando alguien se registra en auth.users, si ya existe
--    una fila en usuarios/administradores con ese email (creada por un
--    admin), la enlaza automáticamente por auth_id.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.usuarios
        SET auth_id = NEW.id
        WHERE email = NEW.email AND auth_id IS NULL;

    UPDATE public.administradores
        SET auth_id = NEW.id
        WHERE email = NEW.email AND auth_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- 3. FUNCIONES DE APOYO para las políticas RLS
--    (evitan repetir subconsultas en cada política)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mi_usuario_id()
RETURNS UUID AS $$
    SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS rol_usuario AS $$
    SELECT rol FROM public.usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mi_cohorte_id()
RETURNS UUID AS $$
    SELECT cohorte_id FROM public.usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- para el panel de administradores (multi-tenant por cohorte)
CREATE OR REPLACE FUNCTION public.mi_admin_cohorte_id()
RETURNS UUID AS $$
    SELECT cohorte_id FROM public.administradores WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN AS $$
    SELECT public.mi_rol() IN ('Docente', 'Coordinador', 'Administrador', 'Superadmin')
        OR EXISTS (SELECT 1 FROM public.administradores WHERE auth_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 4. ACTIVAR RLS EN TODAS LAS TABLAS
-- ---------------------------------------------------------------------
ALTER TABLE configuracion            ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohortes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos_cohorte          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pensum                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia               ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorandos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqr                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_asistencia       ENABLE ROW LEVEL SECURITY;
-- (calendario: tabla eliminada, ya no existe en el sitio)
ALTER TABLE encuestas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_respuestas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insignias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE insignias_estudiantes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_estudiante        ENABLE ROW LEVEL SECURITY;
ALTER TABLE correos_estudiante       ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaforo_overrides       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. POLÍTICAS — patrón general:
--    Superadmin/Coordinador/Docente (staff) -> acceso amplio de lectura
--    Estudiante -> solo sus propios datos
--    Escritura -> solo staff (excepto lo que el estudiante gestiona:
--    su propia agenda, marcar correos leídos, responder encuestas)
-- ---------------------------------------------------------------------

-- usuarios: cualquier autenticado puede leer el directorio (nombres/roles
-- se usan mucho en la UI); solo staff puede escribir.
CREATE POLICY usuarios_select ON usuarios FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY usuarios_propio_update ON usuarios FOR UPDATE
    USING (auth_id = auth.uid());
CREATE POLICY usuarios_staff_write ON usuarios FOR ALL
    USING (public.es_staff()) WITH CHECK (public.es_staff());

-- catálogos institucionales: lectura abierta a autenticados, escritura staff
CREATE POLICY programas_select ON programas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY programas_staff_write ON programas FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY cohortes_select ON cohortes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY cohortes_staff_write ON cohortes FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY pensum_select ON pensum FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY pensum_staff_write ON pensum FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY materiales_select ON materiales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY materiales_staff_write ON materiales FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

-- (calendario: políticas eliminadas junto con la tabla)

CREATE POLICY insignias_select ON insignias FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY configuracion_select ON configuracion FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY configuracion_staff_write ON configuracion FOR UPDATE USING (public.es_staff());

-- administradores (panel Superadmin, multi-tenant por cohorte)
CREATE POLICY administradores_select_propio ON administradores FOR SELECT
    USING (auth_id = auth.uid() OR public.mi_rol() = 'Superadmin');
CREATE POLICY administradores_superadmin_write ON administradores FOR ALL
    USING (public.mi_rol() = 'Superadmin') WITH CHECK (public.mi_rol() = 'Superadmin');

-- alumnos_cohorte: aislado por cohorte del administrador logueado
CREATE POLICY alumnos_cohorte_select ON alumnos_cohorte FOR SELECT
    USING (public.mi_rol() = 'Superadmin' OR cohorte_id = public.mi_admin_cohorte_id());
CREATE POLICY alumnos_cohorte_write ON alumnos_cohorte FOR ALL
    USING (public.mi_rol() = 'Superadmin' OR cohorte_id = public.mi_admin_cohorte_id());

-- calificaciones: estudiante ve las suyas; staff ve todas
-- NOTA: en la app, dentro del staff, solo el rol "Superadmin" puede editar/
-- crear calificaciones ("Administración" tiene solo lectura). Esa distinción
-- hoy vive en el frontend (currentAdminRole); replicarla aquí requiere que
-- el login de administradores esté migrado a Supabase Auth con un claim de
-- rol confiable (p.ej. administradores.rol) antes de restringir este UPDATE
-- a Superadmin en la base de datos.
CREATE POLICY calificaciones_select ON calificaciones FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY calificaciones_staff_write ON calificaciones FOR ALL
    USING (public.es_staff()) WITH CHECK (public.es_staff());

-- asistencia: igual patrón
CREATE POLICY asistencia_select ON asistencia FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY asistencia_staff_write ON asistencia FOR ALL
    USING (public.es_staff()) WITH CHECK (public.es_staff());

-- memorandos: lectura abierta a autenticados (son comunicados), escritura staff
CREATE POLICY memorandos_select ON memorandos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY memorandos_staff_write ON memorandos FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

-- pqr: el solicitante (Docente o Estudiante) ve y crea las suyas; el staff
-- (Superadmin o Administración) ve todas. La UI del panel admin NO ofrece
-- edición de contenido (tipo/asunto/archivo) para ningún rol: el único
-- UPDATE que hace la app es el cambio automático de estado a 'Activo' con
-- fecha_activacion cuando cualquier miembro del staff abre/descarga el PDF
-- por primera vez, por lo que el UPDATE se deja habilitado para todo staff.
CREATE POLICY pqr_select ON pqr FOR SELECT
    USING (public.es_staff() OR solicitante_id = public.mi_usuario_id());
CREATE POLICY pqr_insert_propio ON pqr FOR INSERT
    WITH CHECK (solicitante_id = public.mi_usuario_id());
CREATE POLICY pqr_staff_activar ON pqr FOR UPDATE
    USING (public.es_staff());

-- reuniones: lectura abierta a autenticados, escritura staff
CREATE POLICY reuniones_select ON reuniones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY reuniones_staff_write ON reuniones FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY reunion_asistencia_select ON reunion_asistencia FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY reunion_asistencia_insert_propio ON reunion_asistencia FOR INSERT
    WITH CHECK (estudiante_id = public.mi_usuario_id());

-- encuestas: lectura abierta; respuestas -> el estudiante solo inserta las suyas
-- encuestas: igual que calificaciones (ver nota arriba sobre Superadmin vs
-- Administración: hoy solo se aplica en el frontend).
CREATE POLICY encuestas_select ON encuestas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY encuestas_staff_write ON encuestas FOR ALL USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY encuesta_respuestas_select ON encuesta_respuestas FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY encuesta_respuestas_insert_propio ON encuesta_respuestas FOR INSERT
    WITH CHECK (estudiante_id = public.mi_usuario_id());

-- insignias_estudiantes: cada quien ve las suyas; staff ve todas; solo staff otorga
CREATE POLICY insignias_estudiantes_select ON insignias_estudiantes FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY insignias_estudiantes_staff_write ON insignias_estudiantes FOR INSERT
    WITH CHECK (public.es_staff());

-- agenda_estudiante: 100% privada y editable por el propio estudiante
CREATE POLICY agenda_estudiante_propio ON agenda_estudiante FOR ALL
    USING (estudiante_id = public.mi_usuario_id() OR public.es_staff())
    WITH CHECK (estudiante_id = public.mi_usuario_id() OR public.es_staff());

-- correos_estudiante: el estudiante ve/actualiza (marcar leído) los suyos; staff envía
CREATE POLICY correos_estudiante_select ON correos_estudiante FOR SELECT
    USING (public.es_staff() OR estudiante_id = public.mi_usuario_id());
CREATE POLICY correos_estudiante_propio_update ON correos_estudiante FOR UPDATE
    USING (estudiante_id = public.mi_usuario_id() OR public.es_staff());
CREATE POLICY correos_estudiante_staff_insert ON correos_estudiante FOR INSERT
    WITH CHECK (public.es_staff());

-- semaforo_overrides: solo staff lee/edita; el estudiante no ve el override manual
CREATE POLICY semaforo_overrides_staff ON semaforo_overrides FOR ALL
    USING (public.es_staff()) WITH CHECK (public.es_staff());

-- =====================================================================
--  NOTAS
-- =====================================================================
-- 1) El Superadmin fijo (superadmin@aplus.org / Super2026#) del prototipo
--    debe crearse como un usuario real: en Supabase Auth (Authentication
--    > Users > Add user) y luego una fila en public.usuarios con
--    rol = 'Superadmin' y el mismo email, para que el trigger los enlace.
-- 2) Las demás cuentas demo (coordinador, docente, estudiantes) siguen el
--    mismo patrón: crear en Auth con el email real, dejar que el trigger
--    las vincule a la fila ya existente en usuarios/administradores.
-- 3) Nunca actives "password_hash" manual: Supabase Auth guarda el hash
--    en auth.users, fuera del esquema public. No dupliques contraseñas.
-- 4) Si usas la Service Role Key en un backend propio (no en el navegador),
--    esa key ignora RLS por diseño — solo úsala en servidor, nunca en el
--    front-end.
-- =====================================================================