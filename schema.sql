-- =====================================================================
--  FUNDACIÓN A+ — Esquema de base de datos PostgreSQL
--  Generado a partir del prototipo front-end (localStorage/Store)
--  Motor objetivo: PostgreSQL 14+
-- =====================================================================
--  Cómo se derivó este modelo:
--  El prototipo guarda "tablas" en localStorage bajo las llaves:
--  usuarios, administradores, alumnos_cohorte, modulos (= cohortes),
--  pensum, memorandos, pqr, reuniones, calificaciones,
--  encuestas, encuestas_respuestas, materiales, asistencia,
--  insignias_estudiantes, agenda_estudiante, correos_estudiante,
--  semaforo_overrides y configuracion.
--  Aquí se normalizan esas mismas entidades: se reemplazan los campos
--  de texto libre que en el prototipo repiten nombres (p.ej. "estudiante"
--  o "modulo" como string) por llaves foráneas reales.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario        AS ENUM ('Estudiante', 'Docente', 'Coordinador', 'Administrador', 'Superadmin');
CREATE TYPE estado_usuario     AS ENUM ('Activo', 'Inactivo');
CREATE TYPE estado_cohorte     AS ENUM ('Planeada', 'En curso', 'Finalizada', 'Cancelada');
CREATE TYPE estado_memorando   AS ENUM ('Borrador', 'Enviado');
CREATE TYPE tipo_pqr           AS ENUM ('Petición', 'Queja', 'Reclamo', 'Sugerencia');
CREATE TYPE remitente_pqr      AS ENUM ('Docente', 'Estudiante');
-- 'Pendiente': recién enviada, el administrador aún no ha abierto el PDF.
-- 'Activo': el administrador ya descargó/abrió el PDF (cambia solo, no se edita).
CREATE TYPE estado_pqr         AS ENUM ('Pendiente', 'Activo');
CREATE TYPE estado_reunion     AS ENUM ('Programada', 'Realizada', 'Cancelada');
CREATE TYPE estado_encuesta    AS ENUM ('Abierta', 'Cerrada');
CREATE TYPE tipo_material      AS ENUM ('PDF', 'Video', 'Taller', 'Ejercicio', 'Enlace', 'Otro');
CREATE TYPE estado_asistencia  AS ENUM ('Presente', 'Tarde', 'Falla', 'Justificada');
CREATE TYPE tipo_evento_agenda AS ENUM ('Taller', 'Quiz', 'Entrega', 'Evento', 'Recordatorio');
CREATE TYPE nivel_riesgo       AS ENUM ('Verde', 'Amarillo', 'Rojo');

-- ---------------------------------------------------------------------
-- 2. CONFIGURACIÓN INSTITUCIONAL (fila única / singleton)
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
    id                      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- fuerza una sola fila
    nombre                  VARCHAR(150)  NOT NULL DEFAULT 'Fundación A+',
    correo                  VARCHAR(150)  NOT NULL DEFAULT 'contacto@fundacionaplus.org',
    telefono                VARCHAR(30)   NOT NULL DEFAULT '+57 300 000 0000',
    cupo_maximo             INTEGER       NOT NULL DEFAULT 30,
    notas_minima_aprobacion NUMERIC(3,1)  NOT NULL DEFAULT 3.0,
    asistencia_minima       NUMERIC(5,2)  NOT NULL DEFAULT 80,
    notificaciones_email    BOOLEAN       NOT NULL DEFAULT TRUE,
    notificaciones_ia       BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
INSERT INTO configuracion (id) VALUES (1);

-- ---------------------------------------------------------------------
-- 3. PROGRAMAS (los "módulos formativos": Fundamentos de Programación,
--    Base de Datos, Desarrollo Web...). En el prototipo aparecían como
--    texto libre repetido en pensum/materiales/calificaciones/asistencia.
-- ---------------------------------------------------------------------
CREATE TABLE programas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. USUARIOS (directorio general: estudiantes, docentes, coordinadores,
--    administradores y superadmin). Es la tabla central de personas.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT,                       -- NUNCA texto plano; usar bcrypt/argon2 en el backend
    rol             rol_usuario  NOT NULL,
    estado          estado_usuario NOT NULL DEFAULT 'Activo',
    cohorte_id      UUID, -- FK real se agrega más abajo (dependencia circular usuarios <-> cohortes)
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. COHORTES (en el prototipo vivían dentro del store "modulos").
--    Cada cohorte pertenece a un programa y tiene un docente responsable.
-- ---------------------------------------------------------------------
CREATE TABLE cohortes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(150) NOT NULL,          -- ej: "Cohorte Agosto 2026"
    programa_id     UUID REFERENCES programas(id) ON DELETE SET NULL,
    docente_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_inicio    DATE,
    fecha_fin       DATE,
    cupos           INTEGER NOT NULL DEFAULT 25 CHECK (cupos >= 0),
    inscritos       INTEGER NOT NULL DEFAULT 0 CHECK (inscritos >= 0),
    estado          estado_cohorte NOT NULL DEFAULT 'Planeada',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

-- La FK usuarios.cohorte_id se creó antes que la tabla cohortes existiera
-- (dependencia circular usuarios <-> cohortes). Se agrega ahora:
ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_cohorte
    FOREIGN KEY (cohorte_id) REFERENCES cohortes(id) ON DELETE SET NULL;

CREATE INDEX idx_usuarios_rol      ON usuarios(rol);
CREATE INDEX idx_usuarios_cohorte  ON usuarios(cohorte_id);
CREATE INDEX idx_cohortes_programa ON cohortes(programa_id);
CREATE INDEX idx_cohortes_docente  ON cohortes(docente_id);

-- ---------------------------------------------------------------------
-- 6. MULTI-TENANCY / SIMULADOR DE ROLES
--    administradores: un admin exclusivo por cohorte (aislamiento de datos).
--    alumnos_cohorte: alumnos demo usados solo para ilustrar el aislamiento.
-- ---------------------------------------------------------------------
CREATE TABLE administradores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohorte_id      UUID NOT NULL REFERENCES cohortes(id) ON DELETE CASCADE,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,   -- hashear con bcrypt/argon2 en el backend, nunca texto plano
    rol             VARCHAR(50) NOT NULL DEFAULT 'Administrador',
    estado          estado_usuario NOT NULL DEFAULT 'Activo',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_administradores_cohorte ON administradores(cohorte_id);

CREATE TABLE alumnos_cohorte (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohorte_id  UUID NOT NULL REFERENCES cohortes(id) ON DELETE CASCADE,
    nombre      VARCHAR(150) NOT NULL,
    promedio    NUMERIC(3,1),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alumnos_cohorte_cohorte ON alumnos_cohorte(cohorte_id);

-- ---------------------------------------------------------------------
-- 7. PENSUM (temas de cada programa)
-- ---------------------------------------------------------------------
CREATE TABLE pensum (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programa_id UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    tema        VARCHAR(200) NOT NULL,
    horas       INTEGER NOT NULL CHECK (horas > 0),
    docente_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    orden       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_pensum_programa ON pensum(programa_id);

-- ---------------------------------------------------------------------
-- 8. MATERIALES (recursos por programa)
-- ---------------------------------------------------------------------
CREATE TABLE materiales (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programa_id UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    tipo        tipo_material NOT NULL,
    titulo      VARCHAR(200) NOT NULL,
    url         TEXT,              -- enlace/adjunto del material (no existía en el prototipo, útil en real)
    mes         VARCHAR(30),       -- se mantiene como en el prototipo ("Agosto 2026"); podría derivarse de fecha
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX idx_materiales_programa ON materiales(programa_id);

-- ---------------------------------------------------------------------
-- 9. CALIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE calificaciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    programa_id   UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    nota          NUMERIC(3,1) NOT NULL CHECK (nota >= 0 AND nota <= 5),
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX idx_calificaciones_estudiante ON calificaciones(estudiante_id);
CREATE INDEX idx_calificaciones_programa   ON calificaciones(programa_id);

-- ---------------------------------------------------------------------
-- 10. ASISTENCIA
-- ---------------------------------------------------------------------
CREATE TABLE asistencia (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    programa_id   UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
    estado        estado_asistencia NOT NULL,
    UNIQUE (estudiante_id, programa_id, fecha) -- un registro por estudiante/programa/día
);
CREATE INDEX idx_asistencia_estudiante ON asistencia(estudiante_id);
CREATE INDEX idx_asistencia_programa   ON asistencia(programa_id);
CREATE INDEX idx_asistencia_fecha      ON asistencia(fecha);

-- ---------------------------------------------------------------------
-- 11. MEMORANDOS
-- ---------------------------------------------------------------------
CREATE TABLE memorandos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo        VARCHAR(200) NOT NULL,
    destinatario  VARCHAR(200) NOT NULL, -- texto libre: "Cohorte X", "Todos los docentes", etc.
    contenido     TEXT NOT NULL,
    estado        estado_memorando NOT NULL DEFAULT 'Borrador',
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------------------------------------------------------------------
-- 12. PQR (Peticiones, Quejas, Reclamos)
-- ---------------------------------------------------------------------
-- El administrador NO edita ni crea registros de pqr: cada solicitud la
-- sube el Docente o el Estudiante como archivo PDF (Supabase Storage).
-- "estado" pasa de 'Pendiente' a 'Activo' automáticamente cuando el
-- administrador abre/descarga el PDF por primera vez (no se edita a mano).
CREATE TABLE pqr (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo             tipo_pqr NOT NULL,
    solicitante_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    remitente_rol    remitente_pqr NOT NULL,
    asunto           VARCHAR(200) NOT NULL,
    archivo_nombre   VARCHAR(255) NOT NULL,
    archivo_tipo     VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    archivo_url      TEXT NOT NULL,
    estado           estado_pqr NOT NULL DEFAULT 'Pendiente',
    fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_activacion DATE
);
CREATE INDEX idx_pqr_solicitante ON pqr(solicitante_id);

-- ---------------------------------------------------------------------
-- 13. REUNIONES VIRTUALES + ASISTENCIA A REUNIONES
--     (reemplaza la llave localStorage "reuniones_asistencia_<nombre>")
-- ---------------------------------------------------------------------
CREATE TABLE reuniones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo         VARCHAR(200) NOT NULL,
    fecha          DATE NOT NULL,
    hora           TIME NOT NULL,
    enlace         TEXT,
    participantes  VARCHAR(200), -- descripción libre ("Coordinación, Docentes")
    estado         estado_reunion NOT NULL DEFAULT 'Programada'
);

CREATE TABLE reunion_asistencia (
    reunion_id    UUID NOT NULL REFERENCES reuniones(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    asistio_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (reunion_id, estudiante_id)
);

-- ---------------------------------------------------------------------
-- 14. (Calendario institucional eliminado — ya no existe en el sitio)
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 15. ENCUESTAS DE SATISFACCIÓN + RESPUESTAS
-- ---------------------------------------------------------------------
CREATE TABLE encuestas (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo     VARCHAR(200) NOT NULL,
    fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
    estado     estado_encuesta NOT NULL DEFAULT 'Abierta'
    -- "respuestas" (conteo) y "promedio" del prototipo se calculan con una vista (ver abajo)
);

CREATE TABLE encuesta_respuestas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuesta_id   UUID NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    calificacion  SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (encuesta_id, estudiante_id) -- un estudiante responde una vez por encuesta
);
CREATE INDEX idx_encuesta_respuestas_encuesta ON encuesta_respuestas(encuesta_id);

-- Vista de apoyo para reproducir "respuestas" y "promedio" del prototipo
CREATE VIEW v_encuestas_resumen AS
SELECT
    e.id, e.titulo, e.fecha, e.estado,
    COUNT(r.id)::INTEGER               AS respuestas,
    ROUND(AVG(r.calificacion)::NUMERIC, 1) AS promedio
FROM encuestas e
LEFT JOIN encuesta_respuestas r ON r.encuesta_id = e.id
GROUP BY e.id;

-- ---------------------------------------------------------------------
-- 16. INSIGNIAS / LOGROS (catálogo fijo + otorgadas por estudiante)
-- ---------------------------------------------------------------------
CREATE TABLE insignias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    color       VARCHAR(10) NOT NULL -- código hex, ej: '#1FC8C0'
);

INSERT INTO insignias (nombre, descripcion, color) VALUES
    ('Primeros pasos',       'Completaste tu primera semana en la plataforma.', '#1FC8C0'),
    ('Asistencia perfecta',  'Sin fallas durante un módulo completo.',          '#F5A623'),
    ('Mente analítica',      'Obtuviste una nota sobresaliente en una evaluación.', '#8B5CF6'),
    ('Participación activa', 'Respondiste todas las encuestas de satisfacción disponibles.', '#EC4899'),
    ('Ruta cumplida',        'Completaste una ruta de aprendizaje sugerida por la IA.', '#F0455C'),
    ('Colaborador A+',       'Participaste en una reunión virtual institucional.', '#9A5B3F');

CREATE TABLE insignias_estudiantes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    insignia_id   UUID NOT NULL REFERENCES insignias(id) ON DELETE CASCADE,
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (estudiante_id, insignia_id) -- una insignia solo se obtiene una vez
);

-- ---------------------------------------------------------------------
-- 17. AGENDA PERSONAL DEL ESTUDIANTE
-- ---------------------------------------------------------------------
CREATE TABLE agenda_estudiante (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo        VARCHAR(200) NOT NULL,
    tipo          tipo_evento_agenda NOT NULL DEFAULT 'Recordatorio',
    fecha         DATE NOT NULL,
    hora          TIME,
    notas         TEXT
);
CREATE INDEX idx_agenda_estudiante ON agenda_estudiante(estudiante_id);

-- ---------------------------------------------------------------------
-- 18. CORREO INTERNO DEL ESTUDIANTE
-- ---------------------------------------------------------------------
CREATE TABLE correos_estudiante (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    remitente_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- nulo si el remitente es "Coordinación Académica" institucional
    remitente_nombre VARCHAR(150), -- respaldo de texto cuando no hay remitente_id (ej. cuentas institucionales)
    asunto        VARCHAR(200) NOT NULL,
    contenido     TEXT NOT NULL,
    leido         BOOLEAN NOT NULL DEFAULT FALSE,
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX idx_correos_estudiante ON correos_estudiante(estudiante_id);

-- ---------------------------------------------------------------------
-- 19. SEMÁFORO DE RIESGO — overrides manuales por estudiante
--     (el nivel automático se calcula en la app a partir de
--     calificaciones + asistencia; esto solo guarda el ajuste manual)
-- ---------------------------------------------------------------------
CREATE TABLE semaforo_overrides (
    estudiante_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    asistencia    NUMERIC(5,2),   -- % de asistencia forzado manualmente
    riesgo        nivel_riesgo,   -- color forzado manualmente
    motivo        TEXT,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
--  NOTAS DE DISEÑO
-- =====================================================================
-- 1) Contraseñas: la tabla "administradores" y el password del prototipo
--    NUNCA deben guardarse en texto plano; usar bcrypt/argon2 en el backend
--    antes de insertar en password_hash.
-- 2) Multi-tenancy: el aislamiento por cohorte del panel Superadmin se
--    modela con administradores.cohorte_id. En el backend, cada consulta
--    de un "Administrador" debe filtrar siempre por su cohorte_id
--    (idealmente reforzado con Row Level Security de PostgreSQL).
-- 3) Los campos de texto libre "modulo"/"estudiante" del prototipo se
--    normalizaron a llaves foráneas (programa_id, estudiante_id) para
--    evitar inconsistencias de nombres duplicados.
-- 4) trigger opcional sugerido: actualizar cohortes.inscritos con un
--    trigger AFTER INSERT/DELETE si se agrega una tabla de inscripciones
--    estudiante-cohorte explícita (no existía en el prototipo, que solo
--    usa usuarios.cohorte_id).
-- =====================================================================