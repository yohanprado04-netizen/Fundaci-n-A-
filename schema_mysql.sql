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
  `ip` varchar(45) DEFAULT NULL,
  `severidad` varchar(20) NOT NULL DEFAULT 'INFO',
  `detalle` text DEFAULT NULL,
  `hash_integridad` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_acciones_fecha` (`fecha`),
  KEY `idx_audit_acc_actor_fecha` (`actor`,`fecha`),
  KEY `idx_audit_acc_severidad` (`severidad`),
  KEY `idx_audit_acc_ip` (`ip`)
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
  `ip` varchar(45) DEFAULT NULL,
  `hash_integridad` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_login_fecha` (`fecha`),
  KEY `idx_audit_login_email_fecha` (`email`,`fecha`),
  KEY `idx_audit_login_ip` (`ip`)
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
  `emailjs_public_key` varchar(100) DEFAULT 'eIyshGVkR2fYZQJfO',
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
-- Configuración Institucional Inicial
-- -----------------------------------------------------------------------------
INSERT INTO `configuracion` (`id`, `nombre`, `ciudad`, `direccion`, `correo`, `telefono`, `cupo_maximo`, `notas_minima_aprobacion`, `asistencia_minima`, `notificaciones_email`, `notificaciones_ia`, `postulacion_habilitada`, `postulacion_url`, `postulacion_slug`, `actualizado_en`, `email_metodo`, `emailjs_public_key`, `emailjs_service_id`, `emailjs_template_id`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`, `smtp_secure`) VALUES ('1', 'Fundación A+', 'Quibdó', '', 'info@fundacionamas.org.co', '3214974708', '30', '6.0', '80.00', '1', '1', '0', '', '', NOW(), 'smtp', '', '', '', 'smtp.gmail.com', '465', '', '', 'info@fundacionamas.org.co', 'ssl') ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Credenciales Maestras del Superadmin (Única cuenta predeterminada)
-- -----------------------------------------------------------------------------
INSERT INTO `superadmin_credentials` (`id`, `email`, `password`, `token_version`, `actualizado_en`) VALUES ('1', 'superadmin@aplus.org', '$2y$10$qaM8bwUOoVwwoTBprZ/eke/fsq0P0FtlH.378qLcFD9zcWgVkM8NK', '1', NOW()) ON DUPLICATE KEY UPDATE `id`=`id`;

-- -----------------------------------------------------------------------------
-- Perfiles Base del Sistema (RBAC esencial para el funcionamiento de roles)
-- -----------------------------------------------------------------------------
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_mu1mgus9gpvpr', 'Docente Estándar', 'Docente', 'Acceso completo — perfil del sistema, no se puede eliminar.', '1', '{\"docente.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.perfil\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.asistencia\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.riesgo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.informes\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.modulos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.agenda\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"docente.solicitar_equipo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', NOW()) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_mu1mgus9hom6u', 'Estudiante Estándar', 'Estudiante', 'Acceso completo — perfil de sistema, no se puede eliminar.', '1', '{\"estudiante.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.perfil\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.asistencia\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.academico\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.agenda\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.misProyectos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"estudiante.solicitar_equipo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', NOW()) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `perfiles` (`id`, `nombre`, `categoria`, `descripcion`, `es_sistema`, `permisos`, `creado_en`) VALUES ('perf_muhhe7hh1rju5', 'Administración Estándar', 'Administrativo', 'Acceso completo — perfil de sistema, no se puede eliminar.', '1', '{\"admin.resumen\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.usuarios\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.perfiles\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.modulos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.cursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.horario\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.codigosqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pensum\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.semaforo\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.memorandos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pqr\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.calificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.informesAdmin\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.trainee\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.auditoria\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.chatvoz\":{\"ver\":false,\"crear\":false,\"editar\":false,\"eliminar\":false},\"admin.configuracion\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.notificaciones\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.forms\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.pagos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.solicitudes_recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.asignaciones_recursos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.talentos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true},\"admin.historial_prestamos\":{\"ver\":true,\"crear\":true,\"editar\":true,\"eliminar\":true}}', NOW()) ON DUPLICATE KEY UPDATE `id`=`id`;

SET FOREIGN_KEY_CHECKS = 1;
-- =============================================================================
-- FIN DE SCRIPT DDL Y SEED DATA LIMPIO
-- =============================================================================
