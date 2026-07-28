-- =====================================================================
--  FUNDACIÓN A+ — Esquema de base de datos MySQL / MariaDB
--  Motor objetivo: MySQL 8+ o MariaDB 10.4+ (compatible con Hostinger
--  hosting compartido / Cloud). Reemplaza a schema.sql + supabase_schema.sql
--  (esos dos eran para Postgres/Supabase; ya no se usan).
--
--  Cómo importarlo en Hostinger:
--   1) hPanel → Bases de datos → Bases de datos MySQL → crea una base
--      y un usuario, y asígnaselo (anota host, nombre, usuario, clave).
--   2) hPanel → phpMyAdmin → entra a esa base → pestaña "Importar" →
--      sube este archivo completo → Continuar.
--   3) Copia host/nombre/usuario/clave dentro de api/config.php.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. CONFIGURACIÓN INSTITUCIONAL (fila única)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    id                      TINYINT PRIMARY KEY DEFAULT 1,
    nombre                  VARCHAR(150)  NOT NULL DEFAULT 'Fundación A+',
    correo                  VARCHAR(150)  NOT NULL DEFAULT 'contacto@fundacionaplus.org',
    telefono                VARCHAR(30)   NOT NULL DEFAULT '+57 300 000 0000',
    cupo_maximo             INT           NOT NULL DEFAULT 30,
    notas_minima_aprobacion DECIMAL(3,1)  NOT NULL DEFAULT 3.0,
    asistencia_minima       DECIMAL(5,2)  NOT NULL DEFAULT 80,
    notificaciones_email    TINYINT(1)    NOT NULL DEFAULT 1,
    notificaciones_ia       TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_configuracion_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO configuracion (id) VALUES (1);

-- ---------------------------------------------------------------------
-- 2. PROGRAMAS (módulos formativos: Fundamentos de Programación, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programas (
    id          CHAR(36) PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3. USUARIOS (directorio general: estudiantes, docentes, coordinadores,
--    administradores, superadmin). Tabla central de personas y de login.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              CHAR(36) PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- generado con password_hash() en PHP (bcrypt/argon2), NUNCA texto plano
    rol             ENUM('Estudiante','Docente','Coordinador','Administrador','Superadmin') NOT NULL,
    estado          ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
    cohorte_id      CHAR(36) NULL,
    creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_usuarios_rol (rol),
    KEY idx_usuarios_cohorte (cohorte_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4. COHORTES (= "modulos" en el prototipo). Pertenecen a un programa y
--    tienen un docente responsable.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cohortes (
    id              CHAR(36) PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    programa_id     CHAR(36) NULL,
    docente_id      CHAR(36) NULL,
    fecha_inicio    DATE,
    fecha_fin       DATE,
    cupos           INT NOT NULL DEFAULT 25,
    inscritos       INT NOT NULL DEFAULT 0,
    estado          ENUM('Planeada','En curso','Finalizada','Cancelada') NOT NULL DEFAULT 'Planeada',
    creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_cohortes_programa (programa_id),
    KEY idx_cohortes_docente (docente_id),
    CONSTRAINT fk_cohortes_programa FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL,
    CONSTRAINT fk_cohortes_docente  FOREIGN KEY (docente_id)  REFERENCES usuarios(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_cohorte FOREIGN KEY (cohorte_id) REFERENCES cohortes(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 5. SESIONES — tokens de acceso emitidos por api/auth.php (reemplaza
--    a Supabase Auth: aquí el login lo maneja nuestro propio PHP).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones (
    token       CHAR(64) PRIMARY KEY,      -- token aleatorio (bin2hex(random_bytes(32)))
    usuario_id  CHAR(36) NOT NULL,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en   DATETIME NOT NULL,
    KEY idx_sesiones_usuario (usuario_id),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. HORARIO (grilla semanal por Cohorte + Mes). Antes vivía dentro del
--    panel "Módulos y cohortes"; ahora es su propia entidad.
--    "celdas" guarda el mismo objeto JSON que usa el front-end:
--    { "Lunes|0": { "materia": "P.O.O.", "docente": "Nombre" }, ... }
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id              CHAR(36) PRIMARY KEY,
    cohorte_id      CHAR(36) NOT NULL,
    mes             CHAR(7) NOT NULL,        -- 'YYYY-MM'
    incluye_sabado  TINYINT(1) NOT NULL DEFAULT 0,
    celdas          JSON NOT NULL,
    creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_horario_cohorte_mes (cohorte_id, mes),
    CONSTRAINT fk_horarios_cohorte FOREIGN KEY (cohorte_id) REFERENCES cohortes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 7. PENSUM (temas de cada programa)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pensum (
    id          CHAR(36) PRIMARY KEY,
    programa_id CHAR(36) NOT NULL,
    tema        VARCHAR(200) NOT NULL,
    horas       INT NOT NULL,
    docente_id  CHAR(36) NULL,
    orden       INT NOT NULL DEFAULT 1,
    KEY idx_pensum_programa (programa_id),
    CONSTRAINT fk_pensum_programa FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE CASCADE,
    CONSTRAINT fk_pensum_docente  FOREIGN KEY (docente_id)  REFERENCES usuarios(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 8. MATERIALES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materiales (
    id          CHAR(36) PRIMARY KEY,
    programa_id CHAR(36) NOT NULL,
    tipo        ENUM('PDF','Video','Taller','Ejercicio','Enlace','Otro') NOT NULL,
    titulo      VARCHAR(200) NOT NULL,
    url         TEXT,
    mes         VARCHAR(30),
    fecha       DATE NOT NULL DEFAULT (CURRENT_DATE),
    KEY idx_materiales_programa (programa_id),
    CONSTRAINT fk_materiales_programa FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 9. CALIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calificaciones (
    id            CHAR(36) PRIMARY KEY,
    estudiante_id CHAR(36) NOT NULL,
    programa_id   CHAR(36) NOT NULL,
    nota          DECIMAL(3,1) NOT NULL,
    fecha         DATE NOT NULL DEFAULT (CURRENT_DATE),
    KEY idx_calificaciones_estudiante (estudiante_id),
    KEY idx_calificaciones_programa (programa_id),
    CONSTRAINT fk_calificaciones_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
    CONSTRAINT fk_calificaciones_programa   FOREIGN KEY (programa_id)   REFERENCES programas(id) ON DELETE CASCADE,
    CONSTRAINT chk_calificaciones_nota CHECK (nota >= 0 AND nota <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 10. ASISTENCIA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencia (
    id            CHAR(36) PRIMARY KEY,
    estudiante_id CHAR(36) NOT NULL,
    programa_id   CHAR(36) NOT NULL,
    fecha         DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado        ENUM('Presente','Tarde','Falla','Justificada') NOT NULL,
    KEY idx_asistencia_estudiante (estudiante_id),
    KEY idx_asistencia_programa (programa_id),
    KEY idx_asistencia_fecha (fecha),
    UNIQUE KEY uq_asistencia_dia (estudiante_id, programa_id, fecha),
    CONSTRAINT fk_asistencia_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
    CONSTRAINT fk_asistencia_programa   FOREIGN KEY (programa_id)   REFERENCES programas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 11. MEMORANDOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memorandos (
    id            CHAR(36) PRIMARY KEY,
    titulo        VARCHAR(200) NOT NULL,
    destinatario  VARCHAR(200) NOT NULL,
    contenido     TEXT NOT NULL,
    estado        ENUM('Borrador','Enviado') NOT NULL DEFAULT 'Borrador',
    fecha         DATE NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 12. PQR — el administrador NO crea registros; los sube Docente/Estudiante
--     como archivo (aquí como BLOB en base64 vía la API, o ruta en disco).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pqr (
    id               CHAR(36) PRIMARY KEY,
    tipo             ENUM('Petición','Queja','Reclamo','Sugerencia') NOT NULL,
    solicitante_id   CHAR(36) NOT NULL,
    remitente_rol    ENUM('Docente','Estudiante') NOT NULL,
    asunto           VARCHAR(200) NOT NULL,
    archivo_nombre   VARCHAR(255) NOT NULL,
    archivo_tipo     VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    archivo_url      TEXT NOT NULL,  -- ruta pública en /uploads/pqr/... (ver api/upload.php)
    estado           ENUM('Pendiente','Activo') NOT NULL DEFAULT 'Pendiente',
    fecha            DATE NOT NULL DEFAULT (CURRENT_DATE),
    fecha_activacion DATE NULL,
    KEY idx_pqr_solicitante (solicitante_id),
    CONSTRAINT fk_pqr_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 13. REUNIONES VIRTUALES + ASISTENCIA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reuniones (
    id             CHAR(36) PRIMARY KEY,
    titulo         VARCHAR(200) NOT NULL,
    fecha          DATE NOT NULL,
    hora           TIME NOT NULL,
    enlace         TEXT,
    participantes  VARCHAR(200),
    estado         ENUM('Programada','Realizada','Cancelada') NOT NULL DEFAULT 'Programada'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reunion_asistencia (
    id            CHAR(36) PRIMARY KEY,
    reunion_id    CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    asistio_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reunion_estudiante (reunion_id, estudiante_id),
    CONSTRAINT fk_reunion_asistencia_reunion    FOREIGN KEY (reunion_id)    REFERENCES reuniones(id) ON DELETE CASCADE,
    CONSTRAINT fk_reunion_asistencia_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 14. ENCUESTAS DE SATISFACCIÓN + RESPUESTAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encuestas (
    id         CHAR(36) PRIMARY KEY,
    titulo     VARCHAR(200) NOT NULL,
    fecha      DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado     ENUM('Abierta','Cerrada') NOT NULL DEFAULT 'Abierta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS encuesta_respuestas (
    id            CHAR(36) PRIMARY KEY,
    encuesta_id   CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    calificacion  TINYINT NOT NULL,
    fecha         DATE NOT NULL DEFAULT (CURRENT_DATE),
    UNIQUE KEY uq_encuesta_estudiante (encuesta_id, estudiante_id),
    KEY idx_encuesta_respuestas_encuesta (encuesta_id),
    CONSTRAINT fk_encuesta_respuestas_encuesta   FOREIGN KEY (encuesta_id)   REFERENCES encuestas(id) ON DELETE CASCADE,
    CONSTRAINT fk_encuesta_respuestas_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
    CONSTRAINT chk_encuesta_calificacion CHECK (calificacion BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vista de apoyo para reproducir "respuestas" y "promedio" del prototipo
CREATE OR REPLACE VIEW v_encuestas_resumen AS
SELECT
    e.id, e.titulo, e.fecha, e.estado,
    COUNT(r.id)                       AS respuestas,
    ROUND(AVG(r.calificacion), 1)     AS promedio
FROM encuestas e
LEFT JOIN encuesta_respuestas r ON r.encuesta_id = e.id
GROUP BY e.id, e.titulo, e.fecha, e.estado;

-- ---------------------------------------------------------------------
-- 15. INSIGNIAS / LOGROS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insignias (
    id          CHAR(36) PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    color       VARCHAR(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO insignias (id, nombre, descripcion, color) VALUES
    ('00000000-0000-4000-8000-000000000001', 'Primeros pasos',       'Completaste tu primera semana en la plataforma.', '#1FC8C0'),
    ('00000000-0000-4000-8000-000000000002', 'Asistencia perfecta',  'Sin fallas durante un módulo completo.',          '#F5A623'),
    ('00000000-0000-4000-8000-000000000003', 'Mente analítica',      'Obtuviste una nota sobresaliente en una evaluación.', '#8B5CF6'),
    ('00000000-0000-4000-8000-000000000004', 'Participación activa', 'Respondiste todas las encuestas de satisfacción disponibles.', '#EC4899'),
    ('00000000-0000-4000-8000-000000000005', 'Ruta cumplida',        'Completaste una ruta de aprendizaje sugerida por la IA.', '#F0455C'),
    ('00000000-0000-4000-8000-000000000006', 'Colaborador A+',       'Participaste en una reunión virtual institucional.', '#9A5B3F');

CREATE TABLE IF NOT EXISTS insignias_estudiantes (
    id            CHAR(36) PRIMARY KEY,
    estudiante_id CHAR(36) NOT NULL,
    insignia_id   CHAR(36) NOT NULL,
    fecha         DATE NOT NULL DEFAULT (CURRENT_DATE),
    UNIQUE KEY uq_insignia_estudiante (estudiante_id, insignia_id),
    CONSTRAINT fk_insignias_est_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)   ON DELETE CASCADE,
    CONSTRAINT fk_insignias_est_insignia   FOREIGN KEY (insignia_id)   REFERENCES insignias(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 16. AGENDA PERSONAL DEL ESTUDIANTE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agenda_estudiante (
    id            CHAR(36) PRIMARY KEY,
    estudiante_id CHAR(36) NOT NULL,
    titulo        VARCHAR(200) NOT NULL,
    tipo          ENUM('Taller','Quiz','Entrega','Evento','Recordatorio') NOT NULL DEFAULT 'Recordatorio',
    fecha         DATE NOT NULL,
    hora          TIME,
    notas         TEXT,
    KEY idx_agenda_estudiante (estudiante_id),
    CONSTRAINT fk_agenda_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 17. CORREO INTERNO DEL ESTUDIANTE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correos_estudiante (
    id               CHAR(36) PRIMARY KEY,
    estudiante_id    CHAR(36) NOT NULL,
    remitente_id     CHAR(36) NULL,
    remitente_nombre VARCHAR(150),
    asunto           VARCHAR(200) NOT NULL,
    contenido        TEXT NOT NULL,
    leido            TINYINT(1) NOT NULL DEFAULT 0,
    fecha            DATE NOT NULL DEFAULT (CURRENT_DATE),
    KEY idx_correos_estudiante (estudiante_id),
    CONSTRAINT fk_correos_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_correos_remitente  FOREIGN KEY (remitente_id)  REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 18. SEMÁFORO DE RIESGO — overrides manuales
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS semaforo_overrides (
    id             CHAR(36) PRIMARY KEY,
    estudiante_id  CHAR(36) NOT NULL UNIQUE,
    asistencia     DECIMAL(5,2),
    riesgo         ENUM('Verde','Amarillo','Rojo'),
    motivo         TEXT,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_semaforo_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
--  NOTAS
-- =====================================================================
-- 1) Todas las contraseñas se guardan con password_hash() de PHP
--    (bcrypt). Nunca insertes contraseñas en texto plano.
-- 2) Los "id" son CHAR(36) con formato UUID v4; la API (api/db.php,
--    función uuidv4()) los genera al crear cada registro.
-- 3) "horarios" identifica la cohorte por cohorte_id (no por nombre de
--    texto libre, a diferencia del prototipo original) para evitar
--    inconsistencias si una cohorte cambia de nombre.
-- 4) Después de importar este archivo, crea tu primer Superadmin
--    ejecutando una sola vez api/seed.php desde el navegador (ver
--    README.md) y BÓRRALO del servidor apenas termines.
-- =====================================================================