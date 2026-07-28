<?php
/**
 * entidades.php — Lista blanca de entidades expuestas por la API y sus
 * permisos por rol. Esto es lo único que hay que tocar si agregas una
 * tabla nueva: NO se puede llamar a index.php con una tabla que no esté
 * aquí (evita inyección de nombres de tabla).
 *
 * table        -> tabla real en MySQL
 * read         -> 'all' (cualquier usuario autenticado) o arreglo de roles
 * write        -> arreglo de roles que pueden crear/editar/borrar
 * scope_role   -> si un usuario con este rol pide datos, se filtran
 *                 SIEMPRE por su propio id en scope_field (no puede ver
 *                 ni modificar registros de otra persona, aunque lo pida)
 * scope_field  -> columna usada para el filtro anterior
 * singleton    -> true = la tabla tiene una sola fila (id = 1)
 */

const ROLES_STAFF = ['Superadmin', 'Administrador', 'Coordinador'];

const ENTIDADES = [
    'usuarios' => [
        'table' => 'usuarios',
        'read'  => array_merge(ROLES_STAFF, ['Docente']),
        'write' => ROLES_STAFF,
    ],
    'programas' => [
        'table' => 'programas',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'modulos' => [ // "modulos" en el front-end = tabla "cohortes"
        'table' => 'cohortes',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'horarios' => [
        'table' => 'horarios',
        'read'  => 'all',
        'write' => ROLES_STAFF, // solo el admin escribe el horario (regla de negocio)
    ],
    'pensum' => [
        'table' => 'pensum',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'materiales' => [
        'table' => 'materiales',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'calificaciones' => [ // ⚠️ OBSOLETA — el front-end actual ya no usa esta entidad, usa "notas_modulos" (ver abajo). Se deja por compatibilidad hacia atrás.
        'table' => 'calificaciones',
        'read'  => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Docente']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'notas_modulos' => [
        'table' => 'notas_modulos',
        // No se puede escopar por estudiante: cada fila es una hoja de
        // calificación de TODA una cohorte (el JSON "valores" trae la
        // nota de cada estudiante). Un Estudiante que lea esta entidad
        // puede ver, dentro del JSON, las notas de sus compañeros de
        // cohorte — es el mismo alcance que ya tiene hoy en localStorage.
        'read'  => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Docente']),
    ],
    'informes_docente' => [
        'table' => 'informes_docente',
        'read'  => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Docente']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'asistencia' => [
        'table' => 'asistencia',
        'read'  => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Docente']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'memorandos' => [
        'table' => 'memorandos',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'pqr' => [
        'table' => 'pqr',
        'read'  => 'all',
        'write' => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'scope_role'  => null, // Docente y Estudiante solo ven/crean lo suyo; ver nota abajo
        'scope_field' => 'solicitante_id',
        'scope_roles' => ['Docente', 'Estudiante'],
    ],
    'reuniones' => [
        'table' => 'reuniones',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'reunion_asistencia' => [
        'table' => 'reunion_asistencia',
        'read'  => array_merge(ROLES_STAFF, ['Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Estudiante']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'encuestas' => [
        'table' => 'encuestas',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'encuestas_respuestas' => [
        'table' => 'encuesta_respuestas',
        'read'  => array_merge(ROLES_STAFF, ['Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Estudiante']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'insignias' => [
        'table' => 'insignias',
        'read'  => 'all',
        'write' => ROLES_STAFF,
    ],
    'insignias_estudiantes' => [
        'table' => 'insignias_estudiantes',
        'read'  => array_merge(ROLES_STAFF, ['Docente', 'Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Docente']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'agenda_estudiante' => [
        'table' => 'agenda_estudiante',
        'read'  => array_merge(ROLES_STAFF, ['Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Estudiante']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'correos_estudiante' => [
        'table' => 'correos_estudiante',
        'read'  => array_merge(ROLES_STAFF, ['Estudiante']),
        'write' => array_merge(ROLES_STAFF, ['Estudiante']),
        'scope_role'  => 'Estudiante',
        'scope_field' => 'estudiante_id',
    ],
    'semaforo_overrides' => [
        'table' => 'semaforo_overrides',
        'read'  => array_merge(ROLES_STAFF, ['Docente']),
        'write' => ROLES_STAFF,
    ],
    'configuracion' => [
        'table'     => 'configuracion',
        'read'      => 'all',
        'write'     => ROLES_STAFF,
        'singleton' => true,
    ],
    // Solo lectura a propósito (write => [] nunca permite POST/PUT/DELETE
    // por esta vía genérica): deben llenarse desde el propio backend
    // (auth.php en cada login; el handler de "horarios" en cada cambio de
    // celda), no aceptar un POST libre del cliente como una entidad más.
    'auditoria_login' => [
        'table' => 'auditoria_login',
        'read'  => ['Superadmin'],
        'write' => [],
    ],
    'auditoria_horario' => [
        'table' => 'auditoria_horario',
        'read'  => ['Superadmin'],
        'write' => [],
    ],
];