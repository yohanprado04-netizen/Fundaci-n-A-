-- Tablas del constructor de formularios (también se crean solas al primer request a /api/formularios).
-- Charset: utf8mb4

CREATE TABLE IF NOT EXISTS formularios (
  id VARCHAR(40) PRIMARY KEY,
  titulo MEDIUMTEXT NOT NULL,
  slug VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  abre_en DATETIME NULL,
  cierra_en DATETIME NULL,
  limite_por_usuario TINYINT(1) NOT NULL DEFAULT 1,
  limite_por_ip TINYINT(1) NOT NULL DEFAULT 0,
  creado_por VARCHAR(160) NULL,
  creado_en DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL,
  archivado_en DATETIME NULL,
  UNIQUE KEY uq_formularios_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formulario_preguntas (
  id VARCHAR(40) PRIMARY KEY,
  formulario_id VARCHAR(40) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  tipo VARCHAR(20) NOT NULL,
  titulo MEDIUMTEXT NOT NULL,
  ayuda TEXT NULL,
  obligatoria TINYINT(1) NOT NULL DEFAULT 0,
  opciones MEDIUMTEXT NULL,
  KEY idx_fp_formulario (formulario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formulario_respuestas (
  id VARCHAR(40) PRIMARY KEY,
  formulario_id VARCHAR(40) NOT NULL,
  usuario_id VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  enviado_en DATETIME NOT NULL,
  KEY idx_fr_formulario (formulario_id),
  KEY idx_fr_email (email),
  KEY idx_fr_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formulario_respuesta_valores (
  id VARCHAR(40) PRIMARY KEY,
  respuesta_id VARCHAR(40) NOT NULL,
  pregunta_id VARCHAR(40) NOT NULL,
  valor_texto MEDIUMTEXT NULL,
  valor_json MEDIUMTEXT NULL,
  archivo_nombre VARCHAR(255) NULL,
  archivo_mime VARCHAR(120) NULL,
  archivo_datos LONGTEXT NULL,
  KEY idx_frv_respuesta (respuesta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
