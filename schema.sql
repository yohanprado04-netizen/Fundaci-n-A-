-- =============================================================================
-- FUNDACIÓN A+ — ESQUEMA COMPLETO Y DEFINITIVO DE BASE DE DATOS (MYSQL / MARIADB)
-- Generado automáticamente para inicialización y despliegue del sistema
-- Fecha de generación: 2026-10-05 15:01:25
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '-05:00';

CREATE DATABASE IF NOT EXISTS `fundacionamas_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fundacionamas_db`;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `agenda_docente`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `agenda_docente`;
CREATE TABLE `agenda_docente` (
  `id` char(36) NOT NULL,
  `docente` varchar(150) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `tipo` varchar(40) NOT NULL,
  `fecha` date NOT NULL,
  `hora` varchar(10) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agenda_docente_nombre` (`docente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `agenda_estudiante`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `agenda_estudiante`;
CREATE TABLE `agenda_estudiante` (
  `id` char(36) NOT NULL,
  `estudiante` varchar(150) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `tipo` varchar(40) NOT NULL,
  `fecha` date NOT NULL,
  `hora` varchar(10) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agenda_estudiante_nombre` (`estudiante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `asistencia`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `asistencia`;
CREATE TABLE `asistencia` (
  `id` char(36) NOT NULL,
  `estudiante` varchar(150) NOT NULL,
  `docente` varchar(150) DEFAULT NULL,
  `modulo` varchar(150) DEFAULT NULL,
  `materia` varchar(150) DEFAULT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `estado` enum('Presente','Tarde','Falla','Justificada') NOT NULL,
  `sesion_id` char(36) DEFAULT NULL,
  `automatico` tinyint(1) NOT NULL DEFAULT 0,
  `ip_origen` varchar(45) DEFAULT NULL,
  `dispositivo_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asist_sesion_est` (`sesion_id`,`estudiante`),
  KEY `idx_asistencia_estudiante` (`estudiante`),
  KEY `idx_asistencia_fecha` (`fecha`),
  KEY `idx_asistencia_sesion` (`sesion_id`),
  KEY `idx_asist_sesion_ip` (`sesion_id`,`ip_origen`),
  KEY `idx_asist_sesion_est` (`sesion_id`,`estudiante`),
  KEY `idx_asist_est_estado` (`estudiante`,`estado`),
  KEY `idx_asist_modulo_fecha` (`modulo`,`fecha`),
  KEY `idx_asist_doc_fecha` (`docente`,`fecha`),
  CONSTRAINT `fk_asistencia_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesiones_asistencia` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `auditoria_acciones`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `auditoria_acciones`;
CREATE TABLE `auditoria_acciones` (
  `id` char(36) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `hora` varchar(20) NOT NULL,
  `tipo` varchar(60) NOT NULL,
  `actor` varchar(150) NOT NULL DEFAULT '—',
  `rol` varchar(30) NOT NULL DEFAULT '—',
  `detalle` text DEFAULT NULL,
  `hash_integridad` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_acciones_fecha` (`fecha`),
  KEY `idx_audit_acc_actor_fecha` (`actor`,`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `auditoria_horario`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `auditoria_horario`;
CREATE TABLE `auditoria_horario` (
  `id` char(36) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `hora` varchar(20) NOT NULL,
  `autor` varchar(150) NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `mes` varchar(30) NOT NULL,
  `franja` varchar(60) NOT NULL,
  `campo` varchar(30) NOT NULL,
  `valor_anterior` varchar(150) NOT NULL DEFAULT '(vacío)',
  `valor_nuevo` varchar(150) NOT NULL DEFAULT '(vacío)',
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_horario_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `auditoria_login`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `auditoria_login`;
CREATE TABLE `auditoria_login` (
  `id` char(36) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `hora` varchar(20) NOT NULL,
  `resultado` varchar(30) NOT NULL,
  `email` varchar(150) NOT NULL,
  `rol` varchar(30) NOT NULL DEFAULT 'Superadmin',
  `hash_integridad` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_login_fecha` (`fecha`),
  KEY `idx_audit_login_email_fecha` (`email`,`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `chat_voz_conocimiento`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `chat_voz_conocimiento`;
CREATE TABLE `chat_voz_conocimiento` (
  `id` char(36) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `contenido` text NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `visibilidad` enum('Pública','Solo usuarios con sesión') NOT NULL DEFAULT 'Pública',
  `estado` enum('Activa','Inactiva') NOT NULL DEFAULT 'Activa',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_chat_conocimiento_estado` (`estado`),
  KEY `idx_chat_conocimiento_visibilidad` (`visibilidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `comunicados`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `comunicados`;
CREATE TABLE `comunicados` (
  `id` varchar(64) NOT NULL,
  `tipo` varchar(32) NOT NULL DEFAULT 'Publica',
  `destinatarios` text DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `categoria` varchar(64) NOT NULL DEFAULT 'Institucional',
  `prioridad` varchar(32) NOT NULL DEFAULT 'Media',
  `autor` varchar(128) NOT NULL DEFAULT 'Superadmin',
  `autor_rol` varchar(64) NOT NULL DEFAULT 'Superadmin',
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `atendida` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `configuracion`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `configuracion`;
CREATE TABLE `configuracion` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `nombre` varchar(150) NOT NULL DEFAULT 'Fundación A+',
  `ciudad` varchar(100) NOT NULL DEFAULT 'Quibdó',
  `direccion` varchar(200) NOT NULL DEFAULT '',
  `correo` varchar(150) NOT NULL DEFAULT 'info@fundacionamas.org.co',
  `telefono` varchar(30) NOT NULL DEFAULT '3214974708',
  `cupo_maximo` int(11) NOT NULL DEFAULT 30,
  `notas_minima_aprobacion` decimal(3,1) NOT NULL DEFAULT 6.0,
  `asistencia_minima` decimal(5,2) NOT NULL DEFAULT 80.00,
  `notificaciones_email` tinyint(1) NOT NULL DEFAULT 1,
  `notificaciones_ia` tinyint(1) NOT NULL DEFAULT 1,
  `postulacion_habilitada` tinyint(1) NOT NULL DEFAULT 0,
  `postulacion_url` text DEFAULT NULL,
  `postulacion_slug` varchar(120) DEFAULT 'postulaciones',
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `email_metodo` varchar(20) DEFAULT 'emailjs',
  `emailjs_public_key` varchar(100) DEFAULT 'elyshGVkR2fYZQJfO',
  `emailjs_service_id` varchar(100) DEFAULT 'service_20mxfgu',
  `emailjs_template_id` varchar(100) DEFAULT 'template_qvmzl1l',
  `smtp_host` varchar(150) DEFAULT 'smtp.gmail.com',
  `smtp_port` int(11) DEFAULT 465,
  `smtp_user` varchar(150) DEFAULT '',
  `smtp_pass` varchar(150) DEFAULT '',
  `smtp_from` varchar(150) DEFAULT 'info@fundacionamas.org.co',
  `smtp_secure` varchar(10) DEFAULT 'ssl',
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_configuracion_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `cursos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cursos`;
CREATE TABLE `cursos` (
  `id` char(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `encuestas`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `encuestas`;
CREATE TABLE `encuestas` (
  `id` char(36) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `url` text NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `estado` enum('Abierta','Cerrada') NOT NULL DEFAULT 'Abierta',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `formulario_preguntas`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `formulario_preguntas`;
CREATE TABLE `formulario_preguntas` (
  `id` varchar(40) NOT NULL,
  `formulario_id` varchar(40) NOT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  `tipo` varchar(20) NOT NULL,
  `titulo` mediumtext NOT NULL,
  `ayuda` text DEFAULT NULL,
  `obligatoria` tinyint(1) NOT NULL DEFAULT 0,
  `opciones` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fp_formulario` (`formulario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `formulario_respuesta_valores`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `formulario_respuesta_valores`;
CREATE TABLE `formulario_respuesta_valores` (
  `id` varchar(40) NOT NULL,
  `respuesta_id` varchar(40) NOT NULL,
  `pregunta_id` varchar(40) NOT NULL,
  `valor_texto` mediumtext DEFAULT NULL,
  `valor_json` mediumtext DEFAULT NULL,
  `archivo_nombre` varchar(255) DEFAULT NULL,
  `archivo_mime` varchar(120) DEFAULT NULL,
  `archivo_datos` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_frv_respuesta` (`respuesta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `formulario_respuestas`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `formulario_respuestas`;
CREATE TABLE `formulario_respuestas` (
  `id` varchar(40) NOT NULL,
  `formulario_id` varchar(40) NOT NULL,
  `usuario_id` varchar(40) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `enviado_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fr_formulario` (`formulario_id`),
  KEY `idx_fr_email` (`email`),
  KEY `idx_fr_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `formularios`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `formularios`;
CREATE TABLE `formularios` (
  `id` varchar(40) NOT NULL,
  `titulo` mediumtext NOT NULL,
  `slug` varchar(120) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'borrador',
  `abre_en` datetime DEFAULT NULL,
  `cierra_en` datetime DEFAULT NULL,
  `limite_por_usuario` tinyint(1) NOT NULL DEFAULT 1,
  `limite_por_ip` tinyint(1) NOT NULL DEFAULT 0,
  `roles_permitidos` text DEFAULT NULL,
  `cohortes_permitidas` text DEFAULT NULL,
  `creado_por` varchar(160) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `actualizado_en` datetime NOT NULL,
  `archivado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_formularios_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `historial_prestamos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `historial_prestamos`;
CREATE TABLE `historial_prestamos` (
  `id` varchar(64) NOT NULL,
  `recurso_id` varchar(64) NOT NULL,
  `recurso_codigo` varchar(50) DEFAULT NULL,
  `recurso_nombre` varchar(150) DEFAULT NULL,
  `recurso_categoria` varchar(50) DEFAULT NULL,
  `recurso_serial` varchar(100) DEFAULT NULL,
  `usuario_id` varchar(64) DEFAULT NULL,
  `usuario_nombre` varchar(150) NOT NULL,
  `usuario_email` varchar(150) DEFAULT NULL,
  `usuario_rol` varchar(50) DEFAULT 'Estudiante',
  `cohorte` varchar(100) DEFAULT NULL,
  `tipo_asignacion` varchar(50) DEFAULT 'Temporal',
  `fecha_prestamo` datetime NOT NULL,
  `fecha_limite` datetime DEFAULT NULL,
  `fecha_devolucion` datetime DEFAULT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'Activo',
  `motivo` text DEFAULT NULL,
  `observaciones_entrega` text DEFAULT NULL,
  `observaciones_devolucion` text DEFAULT NULL,
  `entregado_por` varchar(150) DEFAULT NULL,
  `recibido_por` varchar(150) DEFAULT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_prest_usr` (`usuario_nombre`),
  KEY `idx_prest_email` (`usuario_email`),
  KEY `idx_prest_rec` (`recurso_id`),
  KEY `idx_prest_est` (`estado`),
  KEY `idx_prest_fec` (`fecha_prestamo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `horarios`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `horarios`;
CREATE TABLE `horarios` (
  `id` char(36) NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `mes` varchar(20) NOT NULL,
  `incluye_sabado` tinyint(1) NOT NULL DEFAULT 0,
  `franjas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`franjas`)),
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_horario_cohorte_mes` (`cohorte`,`mes`),
  KEY `idx_horarios_cohorte` (`cohorte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `informes_docente`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `informes_docente`;
CREATE TABLE `informes_docente` (
  `id` char(36) NOT NULL,
  `docente` varchar(150) NOT NULL,
  `estudiante` varchar(150) NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `mes` varchar(7) NOT NULL DEFAULT '',
  `materia` varchar(150) DEFAULT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `asistencia_pct` decimal(5,2) DEFAULT NULL,
  `promedio` decimal(4,2) DEFAULT NULL,
  `cualitativa` varchar(40) DEFAULT NULL,
  `conclusion` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('Borrador','Enviado') NOT NULL DEFAULT 'Borrador',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_informe_doc_est_coh_mes` (`docente`,`estudiante`,`cohorte`,`mes`),
  KEY `idx_informes_estudiante` (`estudiante`),
  KEY `idx_inf_coh_mes` (`cohorte`,`mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `justificaciones_asistencia`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `justificaciones_asistencia`;
CREATE TABLE `justificaciones_asistencia` (
  `id` varchar(64) NOT NULL,
  `asistencia_id` varchar(64) DEFAULT NULL,
  `estudiante` varchar(150) NOT NULL,
  `fecha` date NOT NULL,
  `materia` varchar(150) NOT NULL,
  `docente` varchar(150) NOT NULL DEFAULT '',
  `motivo` varchar(100) NOT NULL,
  `detalle` text DEFAULT NULL,
  `archivo_nombre` varchar(255) DEFAULT NULL,
  `archivo_tipo` varchar(100) DEFAULT NULL,
  `archivo_base64` longtext DEFAULT NULL,
  `estado` varchar(32) NOT NULL DEFAULT 'Pendiente',
  `resuelto_por` varchar(150) DEFAULT NULL,
  `resuelto_en` datetime DEFAULT NULL,
  `comentario_resolucion` text DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_estudiante` (`estudiante`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_estado` (`estado`),
  KEY `idx_asistencia_id` (`asistencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `memorandos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `memorandos`;
CREATE TABLE `memorandos` (
  `id` char(36) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `destinatario` varchar(200) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `estado` enum('Borrador','Enviado') NOT NULL DEFAULT 'Borrador',
  `archivo_nombre` varchar(255) NOT NULL,
  `archivo_tipo` varchar(100) NOT NULL,
  `archivo_datos` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_memo_destinatario_fecha` (`destinatario`,`fecha`),
  KEY `idx_memo_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `memorandos_leidos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `memorandos_leidos`;
CREATE TABLE `memorandos_leidos` (
  `memorando_id` char(36) NOT NULL,
  `email` varchar(150) NOT NULL,
  `leido_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`memorando_id`,`email`),
  CONSTRAINT `fk_memorandos_leidos_memo` FOREIGN KEY (`memorando_id`) REFERENCES `memorandos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `modulos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `modulos`;
CREATE TABLE `modulos` (
  `id` char(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `modulo` varchar(150) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `cupos` int(11) NOT NULL DEFAULT 25,
  `estado` enum('Planeada','En curso','Finalizada') NOT NULL DEFAULT 'Planeada',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_modulos_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `notas_modulos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notas_modulos`;
CREATE TABLE `notas_modulos` (
  `id` char(36) NOT NULL,
  `docente` varchar(150) NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `mes` varchar(20) NOT NULL,
  `criterios` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`criterios`)),
  `valores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`valores`)),
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notas_docente_cohorte_mes` (`docente`,`cohorte`,`mes`),
  KEY `idx_notas_cohorte` (`cohorte`),
  KEY `idx_notas_mes` (`mes`),
  KEY `idx_notas_doc_coh_mes` (`docente`,`cohorte`,`mes`),
  KEY `idx_notas_cohorte_mes` (`cohorte`,`mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `pagos_docentes`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `pagos_docentes`;
CREATE TABLE `pagos_docentes` (
  `id` varchar(64) NOT NULL,
  `docente_id` varchar(64) NOT NULL,
  `docente_nombre` varchar(150) NOT NULL,
  `periodo` varchar(100) NOT NULL,
  `mes` varchar(20) NOT NULL,
  `horas` decimal(8,2) NOT NULL DEFAULT 0.00,
  `tarifa_hora` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `fecha_pago` date NOT NULL,
  `entidad_bancaria` varchar(100) NOT NULL DEFAULT '',
  `numero_referencia` varchar(100) NOT NULL DEFAULT '',
  `comprobante_nombre` varchar(255) DEFAULT NULL,
  `comprobante_tipo` varchar(100) DEFAULT NULL,
  `comprobante_url` longtext DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` varchar(32) NOT NULL DEFAULT 'Pagado',
  `creado_por` varchar(128) NOT NULL DEFAULT 'Superadmin',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_docente_id` (`docente_id`),
  KEY `idx_mes` (`mes`),
  KEY `idx_fecha_pago` (`fecha_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `pagos_estudiantes`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `pagos_estudiantes`;
CREATE TABLE `pagos_estudiantes` (
  `id` varchar(64) NOT NULL,
  `estudiante_id` varchar(64) NOT NULL,
  `estudiante_nombre` varchar(150) NOT NULL,
  `cohorte` varchar(100) NOT NULL DEFAULT '',
  `concepto` varchar(150) NOT NULL,
  `mes` varchar(20) NOT NULL,
  `monto` decimal(14,2) NOT NULL DEFAULT 0.00,
  `fecha_pago` date NOT NULL,
  `medio_pago` varchar(100) NOT NULL DEFAULT '',
  `numero_referencia` varchar(100) NOT NULL DEFAULT '',
  `comprobante_nombre` varchar(255) DEFAULT NULL,
  `comprobante_tipo` varchar(100) DEFAULT NULL,
  `comprobante_url` longtext DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` varchar(32) NOT NULL DEFAULT 'Confirmado',
  `creado_por` varchar(128) NOT NULL DEFAULT 'Superadmin',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_estudiante_id` (`estudiante_id`),
  KEY `idx_cohorte` (`cohorte`),
  KEY `idx_mes` (`mes`),
  KEY `idx_fecha_pago` (`fecha_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `pensum`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `pensum`;
CREATE TABLE `pensum` (
  `id` char(36) NOT NULL,
  `modulo` varchar(150) NOT NULL,
  `tema` varchar(200) NOT NULL,
  `horas` int(11) NOT NULL DEFAULT 8,
  `docente` varchar(150) DEFAULT NULL,
  `orden` int(11) NOT NULL DEFAULT 1,
  `archivo_nombre` varchar(255) DEFAULT NULL,
  `archivo_tipo` varchar(100) DEFAULT NULL,
  `archivo_datos` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pensum_modulo` (`modulo`),
  KEY `idx_pensum_docente` (`docente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `perfiles`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `perfiles`;
CREATE TABLE `perfiles` (
  `id` char(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `categoria` enum('Administrativo','Docente','Estudiante') NOT NULL,
  `descripcion` text DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT 0,
  `permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permisos`)),
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `pqr`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `pqr`;
CREATE TABLE `pqr` (
  `id` char(36) NOT NULL,
  `tipo` enum('Petición','Queja','Reclamo','Sugerencia') NOT NULL,
  `solicitante` varchar(150) NOT NULL,
  `remitente_rol` enum('Docente','Estudiante') NOT NULL,
  `asunto` varchar(200) NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `estado` enum('Pendiente','Activo') NOT NULL DEFAULT 'Pendiente',
  `fecha_activacion` date DEFAULT NULL,
  `archivo_nombre` varchar(255) NOT NULL,
  `archivo_tipo` varchar(100) NOT NULL DEFAULT 'application/pdf',
  `archivo_datos` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pqr_solicitante` (`solicitante`),
  KEY `idx_pqr_solicitante_estado` (`solicitante`,`estado`),
  KEY `idx_pqr_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `proyectos_estudiantes`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proyectos_estudiantes`;
CREATE TABLE `proyectos_estudiantes` (
  `id` varchar(64) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `cohorte` varchar(100) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `descripcion` longtext NOT NULL,
  `tecnologias` varchar(255) DEFAULT NULL,
  `integrantes` text DEFAULT NULL,
  `url_demo` varchar(500) DEFAULT NULL,
  `url_repositorio` varchar(500) DEFAULT NULL,
  `imagen_url` longtext DEFAULT NULL,
  `estudiante_id` varchar(64) DEFAULT NULL,
  `estudiante_nombre` varchar(150) DEFAULT NULL,
  `estudiante_email` varchar(150) DEFAULT NULL,
  `estado` varchar(50) DEFAULT 'Publicado',
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pe_est` (`estudiante_id`),
  KEY `idx_pe_cohorte` (`cohorte`),
  KEY `idx_pe_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `proyectos_fundacion`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `proyectos_fundacion`;
CREATE TABLE `proyectos_fundacion` (
  `id` varchar(64) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `categoria` varchar(100) NOT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'En evaluación',
  `es_aplus` tinyint(1) NOT NULL DEFAULT 1,
  `visible_inversores` tinyint(1) NOT NULL DEFAULT 1,
  `resumen` text DEFAULT NULL,
  `descripcion` longtext DEFAULT NULL,
  `sroi` decimal(10,2) DEFAULT 0.00,
  `sroi_horizonte_meses` int(11) DEFAULT 12,
  `inversion` decimal(15,2) DEFAULT 0.00,
  `retorno_proyectado` decimal(15,2) DEFAULT 0.00,
  `payback_meses` int(11) DEFAULT 6,
  `indice_impacto` int(11) DEFAULT 80,
  `prioridad` varchar(30) DEFAULT 'Alta',
  `riesgo` varchar(30) DEFAULT 'Bajo',
  `fecha_inicio` date DEFAULT NULL,
  `fecha_objetivo` date DEFAULT NULL,
  `region` varchar(100) DEFAULT 'Quibdó, Chocó',
  `responsable_nombre` varchar(150) DEFAULT NULL,
  `responsable_cargo` varchar(150) DEFAULT NULL,
  `responsable_email` varchar(150) DEFAULT NULL,
  `hitos` longtext DEFAULT NULL,
  `ficha_tecnica` longtext DEFAULT NULL,
  `desglose_sroi` longtext DEFAULT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pf_cat` (`categoria`),
  KEY `idx_pf_estado` (`estado`),
  KEY `idx_pf_aplus` (`es_aplus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `qr_tokens`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `qr_tokens`;
CREATE TABLE `qr_tokens` (
  `id` char(36) NOT NULL,
  `tipo` enum('docente','estudiante') NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `docente` varchar(150) NOT NULL,
  `token` varchar(40) NOT NULL,
  `fecha` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `uq_qr_tipo_cohorte_docente` (`tipo`,`cohorte`,`docente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `rate_limits`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `rate_limits`;
CREATE TABLE `rate_limits` (
  `clave` varchar(128) NOT NULL,
  `intentos` int(11) NOT NULL DEFAULT 1,
  `bloqueado_hasta` int(11) NOT NULL DEFAULT 0,
  `ultimo_intento` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `seguimiento_alertas`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `seguimiento_alertas`;
CREATE TABLE `seguimiento_alertas` (
  `id` varchar(64) NOT NULL,
  `estudiante_id` varchar(64) NOT NULL,
  `estudiante_nombre` varchar(150) NOT NULL,
  `cohorte` varchar(100) DEFAULT NULL,
  `docente` varchar(150) DEFAULT NULL,
  `tipo_accion` varchar(80) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `compromiso` text DEFAULT NULL,
  `fecha_compromiso` date DEFAULT NULL,
  `estado` varchar(30) DEFAULT 'En seguimiento',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_seguimiento_estudiante` (`estudiante_id`),
  KEY `idx_seguimiento_cohorte` (`cohorte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `sesiones_asistencia`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sesiones_asistencia`;
CREATE TABLE `sesiones_asistencia` (
  `id` char(36) NOT NULL,
  `cohorte` varchar(150) NOT NULL,
  `modulo` varchar(150) DEFAULT NULL,
  `materia` varchar(150) DEFAULT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `hora_inicio` datetime NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `iniciada_por` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sesiones_asis_cohorte_fecha` (`cohorte`,`fecha`),
  KEY `idx_sesiones_iniciada_fecha` (`iniciada_por`,`fecha`),
  KEY `idx_sesiones_cohorte_fecha` (`cohorte`,`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `superadmin_credentials`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `superadmin_credentials`;
CREATE TABLE `superadmin_credentials` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `token_version` int(11) NOT NULL DEFAULT 1,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_superadmin_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `trainee_archivos`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `trainee_archivos`;
CREATE TABLE `trainee_archivos` (
  `id` char(36) NOT NULL,
  `estudiante_id` char(36) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `datos` longtext NOT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `origen` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trainee_archivos_estudiante` (`estudiante_id`),
  CONSTRAINT `fk_trainee_archivos_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `usuario_perfiles`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_perfiles`;
CREATE TABLE `usuario_perfiles` (
  `usuario_id` char(36) NOT NULL,
  `perfil_id` char(36) NOT NULL,
  PRIMARY KEY (`usuario_id`,`perfil_id`),
  KEY `fk_usuario_perfiles_perfil` (`perfil_id`),
  CONSTRAINT `fk_usuario_perfiles_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usuario_perfiles_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Estructura para la tabla `usuarios`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` char(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `password_plano` varchar(255) DEFAULT NULL,
  `rol` enum('Estudiante','Docente','Coordinador','Administrador','Superadmin','Aliado','Donante') NOT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `estado_registro` enum('Pendiente') DEFAULT NULL,
  `cohorte` varchar(150) DEFAULT NULL,
  `cohortes_permitidas` text DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `documento` varchar(50) DEFAULT NULL,
  `habilidades` longtext DEFAULT NULL,
  `fue_estudiante` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `foto_url` longtext DEFAULT NULL COMMENT 'Foto de perfil como data URL (base64), o NULL si no tiene',
  `descripcion` varchar(280) DEFAULT NULL COMMENT 'Descripción breve del perfil, opcional',
  `tarifa_hora` decimal(12,2) NOT NULL DEFAULT 0.00,
  `banco` varchar(100) NOT NULL DEFAULT '',
  `tipo_cuenta` varchar(50) NOT NULL DEFAULT '',
  `numero_cuenta` varchar(100) NOT NULL DEFAULT '',
  `titular_cuenta` varchar(150) NOT NULL DEFAULT '',
  `documento_cuenta` varchar(50) NOT NULL DEFAULT '',
  `token_version` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_usuarios_rol` (`rol`),
  KEY `idx_usuarios_cohorte` (`cohorte`),
  KEY `idx_usr_rol_cohorte` (`rol`,`cohorte`),
  KEY `idx_usr_estado_registro` (`estado_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================

-- =============================================================================

-- =============================================================================

-- =============================================================================
-- DATOS SEMILLA (SEED DATA) ESENCIALES PARA EL ARRANQUE DEL SISTEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Datos iniciales para `configuracion`
-- -----------------------------------------------------------------------------
INSERT INTO `configuracion` (`id`, `nombre`, `ciudad`, `direccion`, `correo`, `telefono`, `cupo_maximo`, `notas_minima_aprobacion`, `asistencia_minima`, `notificaciones_email`, `notificaciones_ia`, `postulacion_habilitada`, `postulacion_url`, `postulacion_slug`, `actualizado_en`, `email_metodo`, `emailjs_public_key`, `emailjs_service_id`, `emailjs_template_id`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`, `smtp_secure`) VALUES ('1', 'Fundación A+', 'Quibdó', '', 'info@fundacionamas.org.co', '3214974708', '30', '6.0', '80.00', '1', '1', '1', '#formulario/postulaciones-training-de-100-a-1000', 'postulaciones-training-de-100-a-1000', '2026-10-05 15:06:40', 'emailjs', 'eIyshGVkR2fYZQJfO', 'service_20mxfgu', 'template_qvmzl1l', 'smtp.gmail.com', '465', '', '', 'info@fundacionamas.org.co', 'ssl') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `superadmin_credentials`
-- -----------------------------------------------------------------------------
INSERT INTO `superadmin_credentials` (`id`, `email`, `password`, `token_version`, `actualizado_en`) VALUES ('1', 'superadmin@aplus.org', '$2y$10$qaM8bwUOoVwwoTBprZ/eke/fsq0P0FtlH.378qLcFD9zcWgVkM8NK', '1', '2026-09-13 21:54:52') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `perfiles`
-- -----------------------------------------------------------------------------
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_mu1mgus9gpvpr', 'Docente Estándar', 'Docente', 'Acceso completo — perfil del sistema, no se puede eliminar.', '1', '{\"docente.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.perfil\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.asistencia\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.riesgo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.informes\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.modulos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.agenda\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.solicitar_equipo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', '2026-09-17 21:14:46') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_mu1mgus9hom6u', 'Estudiante Estándar', 'Estudiante', 'Acceso completo — perfil de sistema, no se puede eliminar.', '1', '{\"estudiante.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.perfil\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.asistencia\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.academico\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.agenda\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.misProyectos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.solicitar_equipo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', '2026-09-17 21:14:46') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_mu36n5zcvf0lm', 'Camila', 'Administrativo', '', '0', '{\"admin.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.notificaciones\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.usuarios\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.perfiles\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.modulos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.cursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.horario\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.codigosqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.semaforo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.informesAdmin\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.forms\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.trainee\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.auditoria\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.chatvoz\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.configuracion\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', '2026-09-17 21:14:46') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_muhhe7hh1rju5', 'Administración Estándar', 'Administrativo', 'Acceso completo — perfil de sistema, no se puede eliminar.', '1', '{\"admin.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.usuarios\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.perfiles\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.modulos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.cursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.horario\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.codigosqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.semaforo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.informesAdmin\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.trainee\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.auditoria\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.chatvoz\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.configuracion\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.forms\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pagos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.solicitudes_recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.asignaciones_recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.talentos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.historial_prestamos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', '2026-09-25 16:37:01') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `modulos`
-- -----------------------------------------------------------------------------
INSERT INTO `modulos` (`id`, `nombre`, `modulo`, `fecha_inicio`, `fecha_fin`, `cupos`, `estado`, `creado_en`) VALUES ('mo_mu366c243yxmi', 'Primera corte', 'Formacion', '2026-02-01', '2026-12-01', '9', 'En curso', '2026-09-15 16:14:11') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `modulos` (`id`, `nombre`, `modulo`, `fecha_inicio`, `fecha_fin`, `cupos`, `estado`, `creado_en`) VALUES ('mo_mubrtb469jgc7', 'Segunda Cohorte', 'Programacion', '2026-01-01', '2026-12-31', '25', 'En curso', '2026-09-21 16:42:05') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `cursos`
-- -----------------------------------------------------------------------------
INSERT INTO `cursos` (`id`, `nombre`, `descripcion`, `estado`, `creado_en`) VALUES ('cu_mu36a1280w30c', 'Ingles', 'Ingles para la vida', 'Activo', '2026-09-17 15:33:31') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `cursos` (`id`, `nombre`, `descripcion`, `estado`, `creado_en`) VALUES ('cu_mu5zlqf3beyll', 'd', 'd', 'Activo', '2026-09-17 15:33:31') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `horarios`
-- -----------------------------------------------------------------------------
INSERT INTO `horarios` (`id`, `cohorte`, `mes`, `incluye_sabado`, `franjas`, `creado_en`, `actualizado_en`) VALUES ('ho_mu36ar1d9hd20', 'Primera corte', '2026-10', '0', '[{\"id\":\"fr_mu36ar1dj9mi1\",\"dia\":\"Lunes\",\"curso\":\"Ingles\",\"docente\":\"Freddy\",\"inicio\":\"08:00\",\"fin\":\"17:00\",\"estado\":\"Activo\"}]', '2026-09-15 16:17:38', '2026-09-15 16:17:38') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `horarios` (`id`, `cohorte`, `mes`, `incluye_sabado`, `franjas`, `creado_en`, `actualizado_en`) VALUES ('ho_mubdsedtlicv2', 'Primera corte', '2026-09', '0', '[{\"id\":\"fr_mubdsedtur3r0\",\"dia\":\"Lunes\",\"curso\":\"Ingles\",\"docente\":\"Freddy\",\"inicio\":\"08:00\",\"fin\":\"10:00\",\"estado\":\"Activo\"},{\"id\":\"fr_mubgigipk5ofp\",\"dia\":\"Martes\",\"curso\":\"d\",\"docente\":\"Jhonatan\",\"inicio\":\"08:00\",\"fin\":\"10:00\",\"estado\":\"Activo\"},{\"id\":\"fr_mubolxsdbmyw4\",\"dia\":\"Lunes\",\"curso\":\"d\",\"docente\":\"Jhonatan\",\"inicio\":\"10:00\",\"fin\":\"12:00\",\"estado\":\"Activo\"}]', '2026-09-21 10:09:28', '2026-09-21 15:12:22') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `formularios`
-- -----------------------------------------------------------------------------
INSERT INTO `formularios` (`id`, `titulo`, `slug`, `descripcion`, `estado`, `abre_en`, `cierra_en`, `limite_por_usuario`, `limite_por_ip`, `roles_permitidos`, `cohortes_permitidas`, `creado_por`, `creado_en`, `actualizado_en`, `archivado_en`) VALUES ('fm_876e74a53d42ea81', 'Postulaciones', 'postulaciones', '', 'publico', NULL, '2026-11-08 00:01:00', '0', '0', NULL, NULL, 'superadmin@aplus.org', '2026-10-02 11:11:53', '2026-10-02 11:20:59', NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formularios` (`id`, `titulo`, `slug`, `descripcion`, `estado`, `abre_en`, `cierra_en`, `limite_por_usuario`, `limite_por_ip`, `roles_permitidos`, `cohortes_permitidas`, `creado_por`, `creado_en`, `actualizado_en`, `archivado_en`) VALUES ('fm_660531aca41c6306', 'Postulaciones — TrAIning de 100 a 1000+', 'postulaciones-training-de-100-a-1000', 'Formulario oficial de postulación e inscripción a las cohortes del programa TrAIning de la Fundación A+.', 'publico', '2026-10-02 13:31:00', '2026-10-15 13:32:00', '0', '0', '[\"Docente\",\"Estudiante\"]', '[\"todas\"]', 'superadmin@aplus.org', '2026-10-02 13:32:12', '2026-10-03 21:45:16', NULL) ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `formulario_preguntas`
-- -----------------------------------------------------------------------------
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_mur5t2w0r90wq', 'fm_876e74a53d42ea81', '0', 'texto', 'Cuanto es 2+2', '', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgy4z8xf', 'fm_660531aca41c6306', '1', 'texto', 'Tipo y número de documento de identidad', 'Ejemplo: CC 1007123456 o TI', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyb6331', 'fm_660531aca41c6306', '0', 'texto', 'Nombre completo', 'Ingresa tus nombres y apellidos completos tal como figuran en tu documento', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgybz1j4', 'fm_660531aca41c6306', '4', 'texto', 'Dirección de residencia, barrio y municipio', 'Lugar donde resides actualmente', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyc5a2t', 'fm_660531aca41c6306', '2', 'correo', 'Correo electrónico personal', 'Correo donde recibirás notificaciones y el estado de tu proceso', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyczgia', 'fm_660531aca41c6306', '7', 'parrafo', '¿Por qué te gustaría postularte y formarte en el programa TrAIning de la Fundación A+?', 'Cuéntanos tu motivación, qué te apasiona de la tecnología y tu disponibilidad de tiempo', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyfbqi1', 'fm_660531aca41c6306', '3', 'numero', 'Número de WhatsApp / Teléfono de contacto', 'Ejemplo: 3001234567 (solo números)', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyor6mi', 'fm_660531aca41c6306', '5', 'numero', '¿Cuántos años tienes?', 'Edad actual en años cumplidos', '1', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `formulario_preguntas` (`id`, `formulario_id`, `orden`, `tipo`, `titulo`, `ayuda`, `obligatoria`, `opciones`) VALUES ('fp_muranvgyr7cnj', 'fm_660531aca41c6306', '6', 'desplegable', 'Nivel educativo actual alcanzado', 'Selecciona tu nivel de escolaridad más reciente', '1', '[\"Bachiller\",\"Técnico \\/ Tecnólogo en curso\",\"Técnico \\/ Tecnólogo graduado\",\"Universitario en curso\",\"Universitario graduado\",\"Otro\"]') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `usuarios`
-- -----------------------------------------------------------------------------
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('usr_aliado_test', 'Aliado Corporativo A+', 'aliado@fundacionamas.org.co', '$2y$10$y0ROJQDvGMn3B/zcKqCsHOlb9wWJ0Egc2O8tdzgqZowMTw2d5K56C', NULL, 'Aliado', 'Activo', NULL, 'Todas', NULL, NULL, NULL, NULL, '0', '2026-10-03 22:46:19', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('usr_donante_57dcf9', 'Inversionista Donante', 'donante@fundacion.org', '$2y$10$1cIEo3PpIAid2qFfOyDwKedLiHTnnf.Rt8gZRLSUVEf7I98VsWxfi', NULL, 'Donante', 'Activo', '', 'Todas', NULL, NULL, NULL, NULL, '0', '2026-10-04 15:23:01', '2026-10-04 22:24:09', NULL, NULL, '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_308ee57f8fe6', 'Davinson', 'elmellixitooo7@gmail.com', '$2y$10$vDHEhlkA/yYoPuaOX7ak/.6hjhi8CY3DhyF6CPc8cPRcTxd144qDq', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, '3135200122', '1004555666', '[\"Python\",\"React\",\"Figma\",\"PostgreSQL\"]', '0', '2026-09-25 13:33:59', '2026-10-04 22:24:09', NULL, 'Estudiante de la Fundación A+, comprometido con el desarrollo educativo y la tecnología en el Litoral Pacífico.🫣', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_3e0ecff0dfd6', 'Angie Paola valencia Hinestroza', 'avalenciahinestroza2@gmail.com', '$2y$10$1PBFzqfWgEf.JcKY..fSruRs4fVVTErsbFgyUjNg0xYV6sey3QlUi', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, '3145006062', NULL, '[\"Python\",\"Django\",\"PostgreSQL\",\"Git\"]', '0', '2026-09-25 14:24:26', '2026-10-04 22:45:15', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_589a16915897', 'Gabriel Antonio Cortes Estrella', 'gabrielcores05@gmail.com', '$2y$10$DbvTXSpQAQU4bMK9bqQScuVZP7E6P1CXSAyBxM/9jD121UpyEv/am', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, '3126030464', NULL, '[\"Excel Avanzado\",\"Analisis de Datos\",\"Power BI\",\"SQL\"]', '0', '2026-09-25 14:21:35', '2026-10-04 22:45:15', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_asp_carlos_cordoba', 'Carlos Mario Córdoba Mosquera', 'carlos.cordoba@aplus.org', '$2y$10$5a9rLCDahNE4fLyzB2rYguaxJfwf6D047CA.G52LzJsknP0HYTlpW', NULL, 'Estudiante', 'Inactivo', 'Pendiente', 'Segunda Cohorte', NULL, '3117894561', NULL, '[\"Node.js\",\"Express\",\"MongoDB\",\"REST APIs\"]', '0', '2026-10-02 11:49:40', '2026-10-04 22:45:15', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_asp_yurani_mosquera', 'Yurani Mosquera Rivas', 'yurani.mosquera@aplus.org', '$2y$10$lteAtr2XzO3v/BWvjJsuj.dySg5D0l0mse46ee1aqbd4Fk9GDDU3O', NULL, 'Estudiante', 'Inactivo', 'Pendiente', 'Segunda Cohorte', NULL, '3146529814', NULL, '[\"Diseno UX/UI\",\"Figma\",\"Prototipado\",\"Design Thinking\"]', '0', '2026-10-02 11:49:40', '2026-10-04 22:45:15', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_d0542e132003', 'Andres Rivas', 'andresrcuesta06@gmail.com', '$2y$10$A0zMCHbE8tsPO8aqXywCuuxiprPOP5qjaHLMC/awNjer2eWScjnm6', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, '3145643340', NULL, NULL, '0', '2026-09-25 14:56:55', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_031bd9a4d6', 'Marlon Bejarano Mena', 'marlon.bejarano@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Segunda Cohorte', NULL, '3194567829', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'Aquí aprendí que un buen desarrollador no es el que no tiene errores, sino el que sabe investigar y resolver con calma.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_1549ea3d9a', 'Leidy Hurtado Blandón', 'leidy.hurtado@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Segunda Cohorte', NULL, '3104567820', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'Aquí no hay excusas, mi vale: con disciplina, buenos mentores y el apoyo de la fundación, estamos construyendo nuestro propio destino.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_1b1bcc3343', 'Stiven Cuesta Palacios', 'stiven.cuesta@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Segunda Cohorte', NULL, '3174567827', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'Entender APIs y peticiones HTTP me voló la cabeza. Ahora entiendo cómo se comunican las aplicaciones que usamos todos los días.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_233b7e5c6a', 'Andres Valoyes Cuesta', 'andres.valoyes@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Segunda Cohorte', NULL, '3194567819', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'Aprender desarrollo web aquí me abrió los ojos. La tecnología es el camino pa transformar a Quibdó y a todo nuestro Pacífico.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_2604961226', 'Vanessa Moreno Rentería', 'vanessa.moreno@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Segunda Cohorte', NULL, '3124567822', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'Puro sabor y berraquera chocoana metida en cada línea de código. ¡Vamos con toda por ese futuro digital de nuestra tierra!', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_est_290f0a283b', 'Melany Lozano Córdoba', 'melany.lozano@aplus.org', '$2y$10$TaYxEu4s9bOkKBR.zIYTIe/brivfpk1KlyAesfWnPXvaO/J966hd6', NULL, 'Estudiante', 'Activo', '', 'Primera corte', NULL, '3164567826', NULL, NULL, '0', '2026-09-21 09:05:53', '2026-10-04 22:24:09', NULL, 'La Fundación A+ nos demostró que no hay que irse del Chocó para aprender habilidades digitales del más alto nivel.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_mu0nm69p0mtdc', 'Yohan Andres Prado Palacios', 'yohanprado04@gmail.com', '$2y$10$ww5ZoogYiXuxzXPZ2kqLYOUdiPzqXdAbwhe5qqIuA0jOXbD.SXcR2', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, NULL, NULL, '[\"Python\",\"HTML\\/CSS\",\"Inglés B1\\/B2\",\"Excel\"]', '0', '2026-09-19 16:54:19', '2026-10-04 22:47:34', NULL, 'Estudiante de la Fundación A+ con sede en Quibdó, Chocó. Apasionado por la educación tecnológica y el desarrollo comunitario en el Litoral Pacífico colombiano. Con asistencia perfecta (100 %) y motivado por la innovación y la inclusión.', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_mu365lo73iq0d', 'Freddy', 'profesor@gmail.com', '$2y$10$ZRGIt.9zffAOCOV0J1UZjOd6.RQbGB4xP7oOTHHo4WrACeEL/YlB2', NULL, 'Docente', 'Activo', NULL, 'Primera corte', NULL, NULL, NULL, NULL, '0', '2026-09-19 16:54:19', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_mu45998w4g5l0', 'PraderaOS', 'dd@jcjecj', '$2y$10$PQzukNNzDf70lNxCgYAXfu3BhMYLxGdWcwUCxHQJuKyKxV4IqJG/q', NULL, 'Coordinador', 'Activo', NULL, '', NULL, NULL, NULL, NULL, '0', '2026-09-19 16:54:19', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_mu8wx82zudhnn', 'Pradera', 'yohanpradotp@gmail.com', '$2y$10$DQjDql.TZynB2xkJRoqYUO2af/CyUdFahXCQLKJZRcg0mYHOavJP2', NULL, 'Estudiante', 'Activo', NULL, 'Primera corte', NULL, '3218830312', NULL, NULL, '0', '2026-09-19 16:54:19', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `password_plano`, `rol`, `estado`, `estado_registro`, `cohorte`, `cohortes_permitidas`, `telefono`, `documento`, `habilidades`, `fue_estudiante`, `creado_en`, `actualizado_en`, `foto_url`, `descripcion`, `tarifa_hora`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `documento_cuenta`, `token_version`) VALUES ('us_mubgfosptl04r', 'Jhonatan', 'jhonatanlaur@gmail.com', '$2y$10$utHYLuQeNSELDcTTP3BBWuEXe.gYKMTBjot1Y7ZQXvyenwTAHDYJa', NULL, 'Docente', 'Activo', NULL, 'Primera corte', NULL, NULL, NULL, NULL, '0', '2026-09-21 11:23:34', '2026-10-04 22:24:09', NULL, '', '0.00', '', '', '', '', '', '1') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `usuario_perfiles`
-- -----------------------------------------------------------------------------
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_308ee57f8fe6', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_3e0ecff0dfd6', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_589a16915897', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_asp_carlos_cordoba', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_asp_yurani_mosquera', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_d0542e132003', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_031bd9a4d6', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_1549ea3d9a', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_1b1bcc3343', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_233b7e5c6a', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_2604961226', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_est_290f0a283b', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_mu0nm69p0mtdc', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_mu365lo73iq0d', 'perf_mu1mgus9gpvpr') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_mu45998w4g5l0', 'perf_mu36n5zcvf0lm') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_mu8wx82zudhnn', 'perf_mu1mgus9hom6u') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;
INSERT INTO `usuario_perfiles` (`usuario_id`, `perfil_id`) VALUES ('us_mubgfosptl04r', 'perf_mu1mgus9gpvpr') ON DUPLICATE KEY UPDATE `usuario_id`=`usuario_id`;

-- -----------------------------------------------------------------------------
-- Datos iniciales para `comunicados`
-- -----------------------------------------------------------------------------
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_doc_1790974605516', 'Privada', '[\"Primera corte\"]', 'dd', 'ddd', 'Académico', 'Media', 'Freddy', 'Docente', '2026-10-02 20:56:45', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_01', 'Publica', '[\"Todos\"]', 'Nuevas inscripciones para el semestre 2027', 'Se encuentran abiertas oficialmente las convocatorias e inscripciones para los nuevos programas y cohortes de la Fundación A+ para el siguiente periodo formativo.', 'Institucional', 'Alta', 'Superadmin', 'Superadmin', '2026-10-01 09:00:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_02', 'Privada', '[\"Corte 1\",\"Corte 2\",\"Corte 8\"]', 'Cambio de aula para la clase de Matemáticas', 'Por motivos de mantenimiento en el salón audiovisual, la sesión presencial de lógica y matemáticas se desarrollará temporalmente en la Sala Digital 2.', 'Académico', 'Media', 'Superadmin', 'Superadmin', '2026-10-01 11:30:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_03', 'Publica', '[\"Todos\"]', 'Nueva Beca de Excelencia \'A+\': Abiertas inscripciones', 'Participa y obtén una beca de formación técnica intensiva con certificación internacional para el próximo ciclo formativo.', 'Institucional', 'Alta', 'Superadmin', 'Superadmin', '2026-10-01 14:00:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_04', 'Publica', '[\"Todos\"]', 'Día Festivo Institucional', 'Informamos a toda la comunidad académica que el próximo lunes no habrá actividades formativas presenciales con motivo del festivo institucional.', 'Institucional', 'Baja', 'Superadmin', 'Superadmin', '2026-10-01 16:00:00', '1') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_05', 'Publica', '[\"Todos\"]', 'Día de la Innovación: Conferencias y Workshops - 15 de Oct', 'Únete a nosotros para una jornada presencial y virtual con mentores internacionales en inteligencia artificial y desarrollo de software.', 'Eventos', 'Media', 'Superadmin', 'Superadmin', '2026-10-01 17:30:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_06', 'Privada', '[\"Cohorte 8\",\"Corte 8\"]', 'Cambio de horario: Taller de Programación - Nueva hora: Mañana 10:30 AM', 'Estudiantes del Corte 8, por favor tomen nota del cambio de horario para la sesión presencial del taller de desarrollo.', 'Académico', 'Media', 'Profesor Martínez', 'Docente', '2026-10-02 08:30:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_07', 'Privada', '[\"Cohorte 8\",\"Corte 8\"]', 'Calificaciones de la Tarea 3 disponibles', 'Las notas y retroalimentaciones para la Tarea 3 de Algoritmos han sido publicadas en el portal académico.', 'Académico', 'Media', 'Profesor Martínez', 'Docente', '2026-10-02 10:00:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('com_seed_08', 'Privada', '[\"Cohorte 8\",\"Corte 8\"]', 'Reunión de Coordinación de Corte 8 - Próximo lunes a las 2 PM', 'Sesión informativa presencial y virtual sobre el cronograma de entregas de proyectos finales de semestre.', 'Administrativo', 'Baja', 'Superadmin', 'Superadmin', '2026-10-02 11:15:00', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('notif_seg_14fe85b0b0514de6', 'Privada', '[\"Yohan Andres Prado Palacios\",\"Primera corte\"]', 'Acompañamiento Tutorial: Notificación formal de inasistencia', 'Hola Yohan Andres Prado Palacios,\n\nSe ha registrado una intervención de seguimiento académico en tu ficha:\n• Acción: Notificación formal de inasistencia\n• Observaciones / Diagnóstico: fklrlmfrknfrf\n• Compromiso acordado: jvnerjvnrejvnv\n• Fecha límite: 2026-10-07\n• Estado: En seguimiento\n• Tutor responsable: Docente/Tutor', 'Académico', 'Alta', 'Docente/Tutor', 'Superadmin', '2026-10-06 16:23:21', '0') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `comunicados` (`id`, `tipo`, `destinatarios`, `titulo`, `mensaje`, `categoria`, `prioridad`, `autor`, `autor_rol`, `fecha`, `atendida`) VALUES ('notif_seg_cf7e84cc3fc79788', 'Privada', '[\"Yohan Andres Prado Palacios\",\"Primera corte\"]', 'Acompañamiento Tutorial: Notificación formal de inasistencia', 'Hola Yohan Andres Prado Palacios,\n\nSe ha registrado una intervención de seguimiento académico en tu ficha:\n• Acción: Notificación formal de inasistencia\n• Observaciones / Diagnóstico: No estas asistiendo qué pasa?\n• Fecha límite: 2026-10-14\n• Estado: En seguimiento\n• Tutor responsable: Docente/Tutor', 'Académico', 'Alta', 'Docente/Tutor', 'Superadmin', '2026-10-06 16:09:50', '0') ON DUPLICATE KEY UPDATE `id`=`id`;

SET FOREIGN_KEY_CHECKS = 1;
-- =============================================================================
-- FIN DE SCRIPT DDL Y SEED DATA
-- =============================================================================
