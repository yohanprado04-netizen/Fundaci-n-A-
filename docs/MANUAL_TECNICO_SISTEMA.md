# MANUAL TÉCNICO Y OPERATIVO DE MÓDULOS Y BOTONES — FUNDACIÓN A+

## Plataforma Integral de Gestión Académica, Control Operativo y Asistencia Inteligente

---

### Resumen Ejecutivo y Alcance del Documento

El presente manual técnico detalla la arquitectura funcional, el comportamiento interactivo y el flujo de datos de cada uno de los módulos, submódulos, botones, controles y modales que componen la plataforma de la **Fundación A+**.

La plataforma opera bajo una arquitectura basada en roles con control de acceso estricto (RBAC) y abarca los siguientes perfiles de usuario:
1. **Portal Público y Autenticación**
2. **Superadministrador (Superadmin)**
3. **Administrador de Sede / Coordinador**
4. **Cuerpo Docente (Docentes)**
5. **Comunidad Estudiantil (Estudiantes)**
6. **Aliados Estratégicos**
7. **Donantes e Inversionistas Sociales**

---

## 1. Portal Público y Módulo de Autenticación

El portal público (`#siteView`) provee acceso institucional informativo, canal de autorregistro y control centralizado de inicio de sesión.

### 1.1. Barra de Navegación Superior (Navbar)
| Elemento / Botón | Identificador / Selector | Función Técnica | Evento / Controlador |
|---|---|---|---|
| **Logo Institucional** | `a[href="#inicio"]` | Redirige suavemente al inicio de la página de aterrizaje (`#hero`). | `scrollIntoView({ behavior: 'smooth' })` |
| **Enlace "Inicio"** | `a[href="#inicio"]` | Navegación interna a la sección introductoria. | Desplazamiento por ancla. |
| **Enlace "Conócenos"** | `a[href="#conocenos"]` | Desplaza la vista a la misión, visión e historia en Quibdó, Chocó. | Desplazamiento por ancla. |
| **Enlace "TrAIning"** | `a[href="#training"]` | Navega al bloque informativo del programa formativo exponencial de 100 a 1000+. | Desplazamiento por ancla. |
| **Enlace "Formación"** | `a[href="#formacion"]` | Muestra la malla curricular, fases de fundamentación y profundización técnica. | Desplazamiento por ancla. |
| **Enlace "Contacto"** | `a[href="#contacto"]` | Conduce al formulario de contacto y canales de atención ciudadana. | Desplazamiento por ancla. |
| **Botón "Iniciar Sesión"** | `.header-btn-join` | Abre la ventana modal global de autenticación (`#loginModal`). Inicializa el foco en el campo de correo electrónico. | `onclick="abrirModalLogin()"` |
| **Menú Hamburguesa (Móvil)** | `#btnMenuMovilPublico` | Alterna la visualización del menú de navegación lateral en dispositivos móviles. | `onclick="toggleMenuMovilPublico()"` |

---

### 1.2. Ventana Modal de Inicio de Sesión (`#loginModal`)
| Botón / Control | Identificador / Selector | Comportamiento Técnico y Lógica de Negocio |
|---|---|---|
| **Selector de Rol (Pestañas)** | `.login-role-tab` | Permite alternar la visualización del formulario entre `Superadmin / Admin`, `Docente`, `Estudiante`, `Aliado` y `Donante`. Modifica el atributo `data-role-target` y precarga sugerencias de contexto. |
| **Campo de Entrada Correo** | `#loginEmailInput` | Captura y valida la sintaxis de correo RFC 5322. Elimina espacios en blanco en tiempo real. |
| **Campo de Entrada Contraseña** | `#loginPasswordInput` | Captura la credencial con enmascaramiento seguro. |
| **Botón "Ver / Ocultar Clave"** | `#btnTogglePasswordVisibility` | Alterna el atributo `type` del campo entre `password` y `text`. Actualiza el icono de ojo visible/tachado. |
| **Botón "Acceder al Sistema"** | `#btnLoginSubmit` | 1. Valida campos obligatorios.<br>2. Ejecuta `POST /api/auth.php` con credenciales en JSON.<br>3. Valida respuesta JWT y almacena token en `localStorage`.<br>4. Llama a `cargarSesion()` y conmuta la interfaz hacia el panel correspondiente (`#dashboardView`, `#docenteView` o `#estudianteView`).<br>5. Aplica Rate Limiting en caso de intentos fallidos consecutivos. |
| **Botón Cerrar Modal** | `#btnCloseLoginModal` | Cierra el diálogo modal y restablece los valores del formulario a su estado inicial. |

---

### 1.3. Escáner QR Público y Autorregistro
| Botón / Control | Identificador / Selector | Comportamiento Técnico |
|---|---|---|
| **Botón "Abrir Cámara Escáner"** | `#btnAbrirEscanerPublico` | Solicita permisos de hardware vía `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`. Decodifica códigos de asistencia o verificación. |
| **Botón "Cerrar Escáner"** | `#btnCerrarEscanerPublico` | Detiene todas las pistas de video activas (`stream.getTracks().forEach(t => t.stop())`) y oculta la capa. |
| **Botón "Registrarme como Estudiante"** | `#btnSubmitAutorregistro` | Envía `POST /api/controllers/usuarios.php` con rol forzado `Estudiante`, cohorte seleccionada y credenciales para aprobación administrativa. |

---

## 2. Portal del Superadministrador (Superadmin)

El perfil Superadmin cuenta con privilegios totales sobre la plataforma, visualizado en el contenedor principal `#dashboardView`.

### 2.1. Barra Superior del Panel Superadmin (Top Header)
| Botón / Icono | Identificador | Función y Flujo de Datos |
|---|---|---|
| **Botón Menú Lateral (Móvil)** | `#btnToggleSidebarAdmin` | Alterna la clase `.active` del sidebar para pantallas táctiles. |
| **Campana de Notificaciones** | `#headerNotifBell-admin` | Despliega el menú rápido con el conteo de alertas no atendidas. Al hacer clic sobre una notificación abre el modal de detalle (`#modalDetalleComunicado`). |
| **Botón "Personalizar Módulos"** | `#btnAbrirGestionModulos` | Abre `#modalGestionModulos`, permitiendo activar u ocultar temporalmente módulos del panel para optimizar la interfaz. |
| **Avatar / Perfil Dropdown** | `#headerAvatarImg-admin` | Despliega el menú contextual de usuario (`#headerProfileMenu-admin`). |
| **Opción "Mi Perfil"** | `#btnMenuMiPerfilAdmin` | Redirige de forma reactiva al módulo de edición de perfil institucional del Superadmin. |
| **Opción "Cerrar Sesión"** | `#btnLogoutAdmin` | Ejecuta `Store.clearSession()`, revoca localmente el token JWT y restablece la vista al portal público `#siteView`. |

---

### 2.2. Módulo 1: Resumen y Dashboard General (`panel-resumen`)
| Botón / Control | Función y Acción Técnica |
|---|---|
| **Tarjetas KPI Consolidadas** | Métricas en tiempo real de Total Estudiantes, Docentes Activos, Cohortes en Curso y Tasa de Retención. |
| **Botón "Actualizar Indicadores"** | Re-ejecuta `Promise.all()` en `db.js` trayendo los conteos frescos desde la base de datos sin recargar la página completa. |
| **Selector de Rango Temporal** | Filtra los gráficos de rendimiento y asistencia por mes, trimestre o año lectivo. |

---

### 2.3. Módulo 2: Centro de Notificaciones y Comunicaciones (`panel-notificaciones`)
Gestionado a través del controlador [`api/controllers/notificaciones.php`](file:///c:/xampp/htdocs/fundacion-api/api/controllers/notificaciones.php) y el módulo frontend [`comunicados.js`](file:///c:/xampp/htdocs/fundacion-api/comunicados.js).

| Botón / Control | Identificador / Función | Detalle Técnico |
|---|---|---|
| **Pestaña "Pública / Privada"** | `window.setComunicadoTipoEnvio(tipo)` | Si es `Pública`, asigna destinatarios automáticos a `['Todos']`. Si es `Privada`, activa el menú multiselección de destinatarios por cohorte o perfil. |
| **Menú Desplegable Destinatarios** | `#dropdownDestinatariosPanel` | Permite marcar o desmarcar de manera múltiple las cohortes o docentes que recibirán el comunicado. |
| **Selector de Prioridad** | `setComunicadoPrioridad('Baja'|'Media'|'Alta')` | Establece el nivel de criticidad visual con badges diferenciados por color (Verde, Amarillo, Púrpura). |
| **Selector de Categoría** | `#comunicadoCategoriaSelect` | Clasifica entre `Institucional`, `Académico`, `Eventos` o `Administrativo`. |
| **Botón "ENVIAR NOTIFICACIÓN"** | `onclick="enviarComunicadoSuperadmin()"` | Valida campos, genera UUID único, estampa fecha del servidor y despacha `POST /api/notificaciones`. Envía notificación instantánea a los destinatarios. |
| **Filtros del Historial (Todas / Públicas / Privadas)** | `filtrarHistorialComunicados(tipo)` | Filtra reactivamente el listado del historial sin consultar de nuevo el servidor. |
| **Selector Cohortes (Historial)** | `#selectFiltroHistorialCohorte` | Aísla los comunicados dirigidos a una cohorte específica en el historial. |
| **Buscador en Tiempo Real** | `#buscadorHistorialAdmin` | Entrada con evento `oninput="filtrarHistorialTexto(this.value)"` que compara instantáneamente el texto contra título, mensaje y autor. |
| **Botón "Eliminar Comunicado"** | `onclick="eliminarComunicadoSuperadmin(id)"` | Solicita confirmación y ejecuta `DELETE /api/notificaciones?id=...`. |
| **Botón "Marcar Todas Atendidas"** | `marcarTodasNotificacionesAtendidas()` | Actualiza el estado local y ejecuta `PATCH /api/notificaciones` marcando `atendida: true`. |

---

### 2.4. Módulo 3: Semáforo en Riesgo Académico y Alertas (`panel-semaforo`)
Implementado en [`semaforo.js`](file:///c:/xampp/htdocs/fundacion-api/semaforo.js) mediante un motor determinista.

| Botón / Control | Identificador / Función | Comportamiento Detallado |
|---|---|---|
| **Pestaña Filtro "Todos"** | `cambiarFiltroSemaforoRiesgo('todos')` | Muestra la totalidad de la población evaluada. |
| **Pestaña Filtro "Crítico" (Rojo)** | `cambiarFiltroSemaforoRiesgo('Rojo')` | Aísla estudiantes con promedio < 6.0 o asistencia < 80%. |
| **Pestaña Filtro "Alerta" (Amarillo)** | `cambiarFiltroSemaforoRiesgo('Amarillo')` | Filtra estudiantes con notas entre 6.0 y 7.4 o llamados de atención. |
| **Pestaña Filtro "Óptimo" (Verde)** | `cambiarFiltroSemaforoRiesgo('Verde')` | Filtra estudiantes con rendimiento sobresaliente (>= 7.5 y asistencia >= 90%). |
| **Selector de Cohorte** | `#filtroSemaforoCohorte` | Permite inspeccionar una cohorte puntual o ver el consolidado institucional. |
| **Buscador Dinámico** | `#buscadorSemaforoLive` | Filtra en tiempo real por nombre del estudiante, cédula o cohorte. |
| **Botón "Exportar Reporte CSV"** | `exportarSemaforoCSV()` | Genera y descarga un archivo `.csv` estructurado con UTF-8 BOM, evitando caracteres corruptos en Microsoft Excel. |
| **Botón "Atender / Acción" (Por fila)** | `abrirModalAccionSeguimiento(estudiante, cohorte)` | Abre `#modalAccionSeguimiento`. Permite seleccionar tipo de intervención (`Tutoría Académica`, `Llamado de Atención`, `Compromiso`), redactar observaciones, fijar fecha límite y despachar correo electrónico al estudiante. |
| **Botón "Ver Historial" / Clic en Fila** | `verDetalleEstudianteSemaforo(estudiante, cohorte)` | Abre el drawer lateral derecho (`#drawerDetalleSemaforo`) con la trayectoria completa de notas módulo por módulo, bitácora de asistencias y memorandos. |
| **Botón "Cerrar Drawer"** | `cerrarDrawerSemaforo()` | Aplica transición de desvanecimiento `opacity-0` y restablece el bloqueo del scroll. |

---

### 2.5. Módulo 4: Gestión de Usuarios y Perfiles (`panel-usuarios`)
| Botón / Control | Identificador / Función | Acción Técnica |
|---|---|---|
| **Botón "+ Nuevo Usuario"** | `onclick="abrirModalUsuario()"` | Abre el modal de creación de usuario con selector de rol (`Docente`, `Estudiante`, `Administrador`, `Aliado`, `Donante`). |
| **Botón "Guardar Usuario"** | `#btnGuardarUsuarioSubmit` | Valida hash de contraseña con bcrypt, valida unicidad de correo y registra el usuario en MySQL vía `POST /api/controllers/usuarios.php`. |
| **Botón "Editar" (Fila)** | `editarUsuario(id)` | Precarga la información de la fila en el formulario modal para su actualización. |
| **Botón "Revocar Sesión"** | `revocarSesionUsuario(id)` | Incrementa el campo `token_version` en base de datos, invalidando de inmediato cualquier token JWT activo de ese usuario en cualquier dispositivo. |
| **Botón "Asignar Cohortes (Scoping)"** | `abrirModalScopingCohortes(id)` | Configura el campo `cohortes_permitidas` (IDOR scoping) para usuarios con rol de Aliado o Coordinador de sede. |
| **Botón "Eliminar Usuario"** | `eliminarUsuario(id)` | Elimina el registro tras doble confirmación, manteniendo la integridad referencial en tablas dependientes. |

---

### 2.6. Módulo 5: Recursos e Inventario de Equipos (`panel-recursos`)
Implementado en [`recursos.js`](file:///c:/xampp/htdocs/fundacion-api/recursos.js) y [`api/controllers/recursos.php`](file:///c:/xampp/htdocs/fundacion-api/api/controllers/recursos.php).

| Botón / Control | Identificador / Función | Detalle Funcional |
|---|---|---|
| **Pestaña "Catálogo de Recursos"** | `recursosTab = 'catalogo'` | Muestra la cuadrícula de computadores portátiles y periféricos con estado (`Disponible`, `En Préstamo`, `Mantenimiento`). |
| **Pestaña "Bandeja de Solicitudes"** | `recursosTab = 'solicitudes'` | Lista las solicitudes radicadas por estudiantes y docentes pendientes de aprobación. |
| **Pestaña "Préstamos Activos"** | `recursosTab = 'asignaciones'` | Muestra qué persona física tiene en custodia cada equipo y la fecha estipulada de retorno. |
| **Pestaña "Historial y Trazabilidad"** | `recursosTab = 'historial'` | Auditoría histórica de todas las entregas y recepciones realizadas en la institución. |
| **Botón "+ Registrar Equipo"** | `abrirModalCrearRecurso()` | Permite registrar un nuevo equipo ingresando Serial, Marca, Modelo, Tipo (Portátil, Cargador, Periférico) y Condiciones Físicas. |
| **Botón "Aprobar Solicitud"** | `aprobarSolicitudRecurso(id)` | Cambia el estado a `Aprobada`, asigna el equipo disponible y notifica al solicitante. |
| **Botón "Rechazar Solicitud"** | `rechazarSolicitudRecurso(id)` | Cambia el estado a `Rechazada` solicitando un motivo explícito. |
| **Botón "Registrar Devolución"** | `abrirModalDevolucionRecurso(id)` | Registra la entrega física del equipo, evalúa el estado del hardware y libera el recurso dejándolo nuevamente en estado `Disponible`. |

---

### 2.7. Módulo 6: Módulos y Cohortes Académicas (`panel-modulos`)
| Botón / Control | Acción Técnica |
|---|---|
| **Botón "+ Crear Cohorte"** | Despliega modal para ingresar Nombre de la Cohorte, Fecha de Inicio, Fecha de Cierre, Cupo Máximo y Docente Líder. |
| **Botón "Editar Cohorte"** | Actualiza los parámetros cronológicos y la sede operativa. |
| **Botón "Ver Estudiantes Matriculados"** | Filtra y despliega la lista nominal de los alumnos pertenecientes a dicha cohorte. |

---

### 2.8. Módulo 7: Gestión Financiera y Pagos (`panel-pagos`)
Implementado en [`pagos.js`](file:///c:/xampp/htdocs/fundacion-api/pagos.js).

| Botón / Control | Función y Flujo de Operación |
|---|---|
| **Botón "+ Registrar Pago Estudiante"** | Abre modal `#modalRegistrarPagoEstudiante` para asentar pagos individuales con soporte digital bancario. |
| **Botón "Generar Cobros por Cohorte"** | Abre modal `#modalGenerarPagosCohorte` permitiendo facturar a todos los alumnos de una cohorte en un solo paso. |
| **Botón "Liquidar Honorarios Docente"** | Abre `#modalGestionHonorariosDocentes` donde se calculan horas dictadas según asistencia y se procesa el desembolso. |
| **Botón "Ver Comprobante"** | Abre lightbox `#modalLightboxComprobante` para visualizar imágenes o documentos PDF de recibos bancarios. |
| **Botón "Exportar Conciliación Excel"** | Descarga archivo delimitado por comas con el estado de recaudo y cartera pendiente. |

---

### 2.9. Módulo 8: Directorio de Proyectos (`panel-proyectosFundacion` y `panel-proyectosEstudiantes`)
Implementado en [`proyectos.js`](file:///c:/xampp/htdocs/fundacion-api/proyectos.js).

| Botón / Control | Función Técnica |
|---|---|
| **Botón "+ Crear Proyecto Institucional"** | Abre modal `#modalFormularioProyectoFundacion` capturando Nombre, Descripción, Stack Tecnológico, Demo URL, Repositorio GitHub e Imagen. |
| **Botón "Ver Ficha Técnica"** | Despliega el lightbox de detalle con enlaces interactivos a demos en vivo y código fuente. |
| **Botón "Revisar / Publicar Proyecto Alumno"** | Aprueba los proyectos cargados por los estudiantes para su visibilidad en el observatorio público de talento. |

---

## 3. Portal del Cuerpo Docente (Docente)

El portal docente (`#docenteView`) está optimizado para la gestión de aula presencial y virtual.

### 3.1. Barra Superior del Docente
| Botón / Selector | Comportamiento Técnico |
|---|---|
| **Selector de Cohorte Activa** | Si el docente tiene 2 o más cohortes asignadas, este selector conmuta la vista entre ellas. Si tiene solo una cohorte, se fija automáticamente. |
| **Campana de Alertas Docente** | Indicador con insignia reactiva que resume justificaciones médicas pendientes de validación y estudiantes en riesgo crítico de sus cursos. |
| **Botón "Cerrar Sesión"** | Invoca `ejecutarLogoutRol('docente')`, borra credenciales locales y retorna al inicio. |

---

### 3.2. Módulo de Asistencia y Sesiones QR Docente (`#mount-t-asistencia`)
Implementado en [`asistencia.js`](file:///c:/xampp/htdocs/fundacion-api/asistencia.js).

| Botón / Control | Lógica de Negocio y Reglas Reglamentarias |
|---|---|
| **Botón "INICIAR CLASE HOY (GENERAR QR)"** | 1. Valida si ya existía una sesión iniciada hoy en la base de datos.<br>2. Si no existía, registra la sesión con `hora_inicio` inmutable en MySQL.<br>3. Genera el código QR dinámico proyectable.<br>4. Inicia el cronómetro de tolerancia reglamentaria de 50 minutos.<br>5. Si ya estaba iniciada, reabre la sesión sin alterar la hora original (`yaEstabaActivada: true`), evitando fraude por reinicio de temporizador. |
| **Botón "Proyectar en Pantalla Completa"** | Despliega el código QR en un modal maximizado con alto contraste para ser escaneado por los estudiantes desde cualquier punto del aula. |
| **Botón "Copiar Enlace de Asistencia"** | Copia al portapapeles el enlace directo de check-in para compartirlo por el grupo de mensajería del curso. |
| **Botón "Renovar Código QR"** | Genera un nuevo token de sesión invalidando códigos fotografiados previamente. |
| **Interruptores Manuales de Asistencia (Por Estudiante)** | Selector tri-estado para cada alumno: `Presente`, `Tardanza` o `Falla`. Permite ajustar manualmente casos fortuitos. |
| **Botón "GUARDAR ASISTENCIA FINAL"** | Consolida la planilla en base de datos y calcula la asistencia porcentual acumulada de la cohorte. |

---

### 3.3. Centro de Notificaciones y Publicaciones Docente (`#mount-t-notificaciones`)
Implementado en [`comunicados.js`](file:///c:/xampp/htdocs/fundacion-api/comunicados.js).

| Botón / Control | Acción Técnica |
|---|---|
| **Pestañas de Filtrado (Todas / Críticas / Por mis Cortes / Excusas)** | Alterna entre notificaciones institucionales generales, alertas de riesgo académico y solicitudes de justificación médica de inasistencias. |
| **Selector "Destinatarios" (Cohorte Docente)** | Permite seleccionar a cuál de sus grupos asignados va dirigido un nuevo aviso. |
| **Campo Título y Mensaje** | Entradas de texto sanitizadas para el contenido de la publicación. |
| **Botón "Publicar en mis Cortes"** | Crea un comunicado privado (`tipo: 'Privada'`) restringido a los estudiantes de dicha cohorte y despacha la alerta en tiempo real. |

---

### 3.4. Calificaciones y Módulo Académico Docente
| Botón / Control | Lógica de Operación |
|---|---|
| **Selector de Periodo / Mes** | **Regla estricta:** Solo permite registrar y editar calificaciones del mes calendario en curso o periodos habilitados expresamente por el Superadmin. |
| **Campos de Notas Ponderadas** | Entradas numéricas con validación de rango (0.0 a 10.0 con decimales). Cálculo dinámico del promedio ponderado. |
| **Botón "Guardar Planilla de Calificaciones"** | Valida que ninguna nota exceda los límites permitidos y sincroniza los cambios en la tabla `notas_modulos`. |

---

### 3.5. Justificaciones de Inasistencia y Horarios
| Botón / Control | Función |
|---|---|
| **Botón "Revisar Justificación"** | Abre modal con el motivo expuesto por el estudiante y el documento anexo (incapacidad médica o laboral). |
| **Botón "Aprobar Excusa"** | Modifica la inasistencia previa de `Falla` a `Justificada`, recalculando favorablemente el porcentaje del semáforo del alumno. |
| **Botón "Rechazar Excusa"** | Mantiene la falla y notifica el motivo del rechazo al estudiante. |
| **Botón "Solicitar Ajuste de Horas"** | Abre modal para notificar a la administración horas dictadas en reposición o actividades extracurriculares. |

---

## 4. Portal del Estudiante (Estudiante)

El portal del estudiante (`#estudianteView`) está orientado al autoservicio académico, registro de asistencia y seguimiento de compromisos.

### 4.1. Barra de Control del Centro de Notificaciones (`#mount-s-notificaciones`)
Incorporada en [`comunicados.js`](file:///c:/xampp/htdocs/fundacion-api/comunicados.js).

| Botón / Control | Comportamiento Técnico y Lógica de Filtrado |
|---|---|
| **Botón "Todas"** | Restablece los filtros y muestra todos los avisos de su cohorte y comunicados públicos de la fundación. |
| **Botón "Tutorías y Compromisos"** | Aísla exclusivamente las notificaciones generadas por intervenciones del semáforo de riesgo, citaciones y compromisos tutoriales. |
| **Botón "Institucional"** | Filtra avisos emitidos por la dirección (festivos, directrices administrativas, circulares). |
| **Botón "Académico"** | Filtra avisos emitidos por sus docentes respecto a entregas de proyectos, horarios y exámenes. |
| **Botón "Eventos"** | Filtra convocatorias, talleres extracurriculares y conferencias. |
| **Casilla de Verificación "Solo no leídas"** | Oculta automáticamente cualquier notificación que ya haya sido leída o atendida por el estudiante. |
| **Botón "Marcar todas como leídas"** | 1. Recorre todas las notificaciones activas.<br>2. Almacena sus identificadores en el registro de leídas del estudiante.<br>3. Ejecuta `PATCH /api/notificaciones` de sincronización.<br>4. Actualiza y apaga el badge numérico de alertas en el header.<br>5. Muestra confirmación tipo toast. |
| **Buscador Global en Tiempo Real** | Entrada con búsqueda interactiva que oculta las tarjetas que no contengan las palabras clave ingresadas. |
| **Botón "Marcar leída / No leída" (En cada tarjeta)** | Permite cambiar el estado individual de una tarjeta particular alternando su diseño visual. |
| **Botón "Ver detalles"** | Abre `#modalDetalleComunicado` con el contenido completo, fecha formal y remitente; marca automáticamente la notificación como leída. |

---

### 4.2. Registro de Asistencia Estudiantil (`#mount-s-asistencia`)
| Botón / Control | Flujo de Operación |
|---|---|
| **Botón "Escanear Código QR"** | Activa la cámara del dispositivo móvil. Al encuadrar el código QR proyectado por el docente, procesa el check-in de forma instantánea (0 clics adicionales). |
| **Regla de Marcación por Minuto:** | - De 0 a 15 min: Recibe confirmación en verde: *"Asistencia Registrada: Presente"*. <br>- De 16 a 50 min: Recibe confirmación en amarillo: *"Asistencia Registrada: Tardanza"*. <br>- Superados los 50 min: El sistema rechaza la marcación e informa: *"Sesión de asistencia cerrada por tiempo reglamentario"*. |
| **Regla de Nuevo Ingreso:** | Si el estudiante fue matriculado con posterioridad al inicio del curso, sus asistencias se computan únicamente desde su fecha de registro en el aula, impidiendo que el sistema le impute fallas retroactivas por clases previas a su llegada. |
| **Botón "Justificar Inasistencia"** | Abre modal `#modalJustificarAsistenciaEstudiante` para seleccionar la fecha de la inasistencia, redactar el motivo y adjuntar archivo en formato PDF o imagen de soporte. |

---

### 4.3. Módulo de Calificaciones y Progreso
| Botón / Control | Función |
|---|---|
| **Selector de Mes / Módulo** | Permite alternar entre los diferentes módulos cursados para verificar notas parciales. |
| **Visualizador de Notas** | Muestra el desglose de evaluaciones, notas aprobatorias (>= 6.0) y comentarios de retroalimentación docente. |

---

### 4.4. Solicitud de Equipos y Recursos
| Botón / Control | Función Técnica |
|---|---|
| **Formulario de Solicitud de Equipo** | Permite al estudiante solicitar en préstamo un computador portátil de la fundación indicando justificación académica y fecha estimada de entrega. |
| **Botón "Radicar Solicitud"** | Envía la petición a la bandeja del Superadmin (`POST /api/controllers/recursos.php`). |
| **Bandeja de Estado** | Informa si la solicitud se encuentra `En Revisión`, `Aprobada` (con fecha para retirar en sede) o `Rechazada`. |

---

### 4.5. Portafolio de Proyectos del Estudiante (`#mount-s-misProyectos`)
| Botón / Control | Función Técnica |
|---|---|
| **Botón "+ Subir Mi Proyecto"** | Abre modal `#modalFormularioSubirProyectoEstudiante` para registrar aplicaciones desarrolladas por el alumno (Título, Integrantes, Descripción, Tecnologías, Enlace a Demo y GitHub). |
| **Botón "Guardar Proyecto"** | Registra el proyecto para revisión y posterior inclusión en la vitrina de talentos de la fundación. |

---

### 4.6. Módulo PQR (Peticiones, Quejas y Reclamos)
| Botón / Control | Función |
|---|---|
| **Botón "Nueva PQR"** | Abre formulario para radicar solicitudes administrativas formales. Asigna un número de radicado único. |
| **Botón "Consultar Estado"** | Permite revisar las respuestas emitidas por la administración junto con documentos PDF descargables de resolución. |

---

## 5. Portales de Aliados Estratégicos y Donantes

Los perfiles de **Aliado Estratégico** y **Donante** cuentan con interfaces de observatorio diseñadas para veeduría y seguimiento del impacto social sin capacidades de alteración de registros académicos.

| Perfil | Módulos Visibles | Botones y Acciones Habilitadas |
|---|---|---|
| **Aliado Estratégico** | - Observatorio de Cohortes (`modulos`)<br>- Calificaciones Consolidadas (`calificaciones`)<br>- Semáforo de Retención (`semaforo`) | - Selector de cohorte asignada.<br>- Botón "Exportar Resumen Académico".<br>- Botón "Inspeccionar Desempeño General".<br>*(Restricción: No puede editar notas ni emitir memorandos)*. |
| **Donante / Inversionista Social** | - Tablero de Impacto Social (`resumen`)<br>- Proyectos de la Fundación (`proyectosFundacion`)<br>- Vitrina de Proyectos de Estudiantes (`proyectosEstudiantes`)<br>- Semáforo de Permanencia (`semaforo`) | - Botones para explorar demos en vivo de aplicaciones creadas por becarios.<br>- Botón "Descargar Informe de Impacto".<br>- Filtro por cohortes beneficiadas.<br>*(Restricción: Sin acceso a datos sensibles o edición de registros)*. |

---

## 6. Asistente Conversacional Inteligente con Streaming IA (`chat.js`)

Accesible a través del botón flotante ubicado en la esquina inferior derecha de la plataforma.

| Botón / Control | Selector | Comportamiento Técnico |
|---|---|---|
| **Botón Flotante del Asistente** | `#btnOpenChatIA` | Despliega u oculta la ventana flotante del chat (`#chatBoxContainer`). Actualiza el icono entre bocadillo de diálogo y cruz de cierre. |
| **Campo de Entrada de Mensaje** | `#chatInputText` | Captura la consulta del usuario. Soporta salto de línea con `Shift+Enter` y envío directo con `Enter`. |
| **Botón "Enviar Consulta"** | `#btnSendChatMsg` | Despacha la petición mediante Server-Sent Events (SSE) hacia `http://localhost:8001/chat/stream`, renderizando la respuesta del modelo en tiempo real carácter por carácter con renderizado de Markdown y bloques de código. |
| **Botón "Limpiar Conversación"** | `#btnClearChatHistory` | Restablece el historial de memoria conversacional en pantalla y reinicia el contexto del asistente. |

---

## 7. Resumen de Buenas Prácticas Técnicas y Soporte

1. **Persistencia y Caché:** Todos los botones de acción que modifican datos ejecutan invalidación selectiva de la memoria caché de `db.js` para asegurar que el siguiente renderizado lea directamente el estado actualizado de MySQL.
2. **Protección Anti-Doble Clic:** Los botones de envío (`Submit`) se deshabilitan automáticamente durante la ejecución de la promesa (`btn.disabled = true`) para prevenir duplicación de registros por pulsaciones accidentales.
3. **Manejo de Errores Silenciosos:** Las peticiones asíncronas están encapsuladas en bloques `try / catch` con notificaciones visuales contextuales (`toast('Mensaje', 'ok'|'err'|'info')`), garantizando que la interfaz nunca se congele ante una caída de red o error de servidor.
