/**
 * mockProjects.js
 * -----------------------------------------------------------------------------
 * Dataset de proyectos e iniciativas para el módulo "Proyectos e Iniciativas A+"
 * de la Fundación A+ (Entidad sin ánimo de lucro · Quibdó, Chocó).
 *
 * Configuración de estados:
 *  - El programa insignia "TrAIning de 100 a 1000+" se encuentra "En ejecución".
 *  - Las demás iniciativas complementarias se encuentran "En evaluación".
 *  - Todos los importes y presupuestos se expresan en Pesos Colombianos (COP).
 *
 * Contrato de datos:
 *  - id               {string}   Código único de la iniciativa (APL-###)
 *  - name             {string}   Nombre de la iniciativa / proyecto
 *  - category         {string}   Sostenibilidad & Becas | Infraestructura & Conectividad |
 *                                Innovación Social | Impacto Comunitario |
 *                                Educación & IA | Empleabilidad Tech
 *  - status           {string}   En ejecución | En evaluación
 *  - isAPlus          {boolean}  true = alta prioridad estratégica y transformación comunitaria
 *  - summary          {string}   Resumen ejecutivo (se recorta en la tarjeta)
 *  - description      {string[]} Párrafos descriptivos completos (modal)
 *  - roi              {number}   SROI (Retorno Social de la Inversión en %)
 *  - roiHorizonMonths {number}   Horizonte de maduración del impacto en meses
 *  - investment       {number}   Presupuesto / Fondos requeridos en Pesos Colombianos (COP)
 *  - projectedReturn  {number}   Valor social estimado generado en COP
 *  - paybackMonths    {number}   Tiempo para alcanzar los primeros hitos de maduración
 *  - impactScore      {number}   Índice de impacto estratégico territorial 0-100
 *  - priority         {string}   Crítica | Alta | Media
 *  - risk             {string}   Bajo | Medio | Alto
 *  - startDate        {string}   ISO yyyy-mm-dd
 *  - targetDate       {string}   ISO yyyy-mm-dd
 *  - createdAt        {string}   ISO yyyy-mm-dd
 *  - region           {string}   Territorio o zona de intervención en el Pacífico
 *  - owner            {{ name, role, email }} Responsable o coordinación
 *  - highlights       {string[]} Hitos de impacto y puntos clave
 *  - specs            {{ label, value }[]} Ficha técnica de alcance y beneficiarios
 *  - roiBreakdown     {{ label, value }[]} Métricas cuantitativas del retorno social (SROI)
 */

export const MOCK_PROJECTS = [
  {
    id: 'APL-001',
    name: 'TrAIning de 100 a 1000+ (Programa Insignia)',
    category: 'Educación & IA',
    status: 'En ejecución',
    isAPlus: true,
    summary:
      'Programa insignia de formación intensiva en programación con Inteligencia Artificial para jóvenes del Chocó, con modelo multiplicador exponencial 10:1 y becas 100 % gratuitas.',
    description: [
      'El TrAIning de 100 a 1000+ es el corazón de la Fundación A+. Se estructura en dos etapas consecutivas: la Fase 1 (10 meses de Fundamentación en lógica computacional, Python, Inteligencia Artificial y liderazgo multiplicador) y la Fase 2 (Profundización junto a empresas tecnológicas internacionales).',
      'Actualmente en ejecución plena en Quibdó, cada estudiante formado asume el compromiso ético de replicar sus conocimientos con al menos 10 jóvenes más de su comunidad, tejiendo una red descentralizada de aprendizaje tecnológico sin desarraigo territorial.',
    ],
    roi: 450,
    roiHorizonMonths: 36,
    investment: 780000000,
    projectedReturn: 3510000000,
    paybackMonths: 10,
    impactScore: 99,
    priority: 'Crítica',
    risk: 'Bajo',
    startDate: '2026-01-15',
    targetDate: '2026-12-15',
    createdAt: '2026-01-10',
    region: 'Quibdó, Chocó',
    owner: { name: 'Dra. Sandra Mena', role: 'Directora Académica del TrAIning', email: 'academica@fundacionamas.org.co' },
    highlights: [
      '100 líderes formados en la primera cohorte replicando a 1.000+ personas en territorio.',
      'Plan de estudios alineado con estándares de la industria tecnológica internacional.',
      'Becas 100 % gratuitas con acompañamiento psicopedagógico permanente.',
      'Semáforo de riesgo académico y tutoría IA integrados en tiempo real.',
    ],
    specs: [
      { label: 'Beneficiarios Fase 1', value: '100 multiplicadores directos' },
      { label: 'Alcance multiplicador', value: '1.000+ personas en comunidades' },
      { label: 'Duración curricular', value: '10 meses intensivos + Fase 2 avanzada' },
      { label: 'Costo para el estudiante', value: '$ 0 COP (Beca 100 % Gratuita)' },
    ],
    roiBreakdown: [
      { label: 'Efecto multiplicador comunitario', value: '10 personas impactadas por cada líder' },
      { label: 'Horas de formación impartidas', value: '+240.000 horas lectivas' },
      { label: 'Retorno Social de la Inversión (SROI)', value: '4,5x en capital humano del Pacífico' },
    ],
  },
  {
    id: 'APL-002',
    name: 'Microredes Solares y Conectividad Satelital para Aulas',
    category: 'Infraestructura & Conectividad',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Adecuación de paneles solares fotovoltaicos, almacenamiento en litio y terminales Starlink en 6 centros de formación de Quibdó e Istmina para blindar las clases del TrAIning frente a apagones.',
    description: [
      'Frente a los recurrentes cortes del fluido eléctrico en el Chocó, esta iniciativa busca garantizar 24/7 de suministro continuo y conectividad de alta velocidad a las aulas donde se dictan las clases del TrAIning.',
      'La propuesta técnica contempla 18 kWp solares y baterías para proteger más de 750 horas de código anuales que se pierden con la red convencional, asegurando que las prácticas de programación nunca se detengan.',
    ],
    roi: 320,
    roiHorizonMonths: 48,
    investment: 480000000,
    projectedReturn: 1536000000,
    paybackMonths: 8,
    impactScore: 95,
    priority: 'Crítica',
    risk: 'Medio',
    startDate: '2026-06-01',
    targetDate: '2026-12-30',
    createdAt: '2026-02-20',
    region: 'Quibdó e Istmina',
    owner: { name: 'Jader Palacios', role: 'Líder de Infraestructura y Conectividad', email: 'infraestructura@fundacionamas.org.co' },
    highlights: [
      'Autonomía eléctrica del 100 % durante apagones en 6 sedes comunitarias.',
      'Conexión satelital de 150 a 220 Mbps por aula.',
      '450 estudiantes concurrentes protegidos.',
      'Sustitución progresiva de plantas diésel contaminantes.',
    ],
    specs: [
      { label: 'Capacidad solar', value: '18 kWp con respaldo en litio' },
      { label: 'Sedes cubiertas', value: '6 aulas comunitarias de aprendizaje' },
      { label: 'Horas de clase protegidas', value: '+750 horas anuales' },
      { label: 'Fuente de fondos', value: 'Fondo de cooperación energética sostenible' },
    ],
    roiBreakdown: [
      { label: 'Continuidad operativa garantizada', value: '99,8 % sin cortes' },
      { label: 'Jóvenes con acceso ininterrumpido', value: '450 estudiantes' },
      { label: 'SROI territorial estimado', value: '3,2x en horas lectivas salvadas' },
    ],
  },
  {
    id: 'APL-003',
    name: 'Hub de Prototipado e Internet de las Cosas (IoT Atrato)',
    category: 'Innovación Social',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Laboratorio comunitario en Quibdó para que los becados del TrAIning diseñen sensores IoT de calidad del agua, monitoreo del río Atrato y estaciones climáticas abiertas.',
    description: [
      'El Hub articula la programación de software aprendida en el TrAIning con la electrónica abierta (Arduino, ESP32, Raspberry Pi) para resolver problemas ambientales y productivos del territorio.',
      'Los jóvenes prototiparán boyas inteligentes de alerta temprana para crecientes súbitas y sensores de turbidez del agua en colaboración con veedurías y comunidades ribereñas del río Atrato.',
    ],
    roi: 260,
    roiHorizonMonths: 36,
    investment: 320000000,
    projectedReturn: 832000000,
    paybackMonths: 9,
    impactScore: 92,
    priority: 'Alta',
    risk: 'Bajo',
    startDate: '2026-07-01',
    targetDate: '2027-02-28',
    createdAt: '2026-03-10',
    region: 'Quibdó',
    owner: { name: 'Ing. Yeison Cuesta', role: 'Director de Innovación y Tecnología', email: 'innovacion@fundacionamas.org.co' },
    highlights: [
      'Primer makerspace comunitario de robótica e IoT ambiental en Quibdó.',
      'Proyectos de sensores hídricos aplicados al río Atrato.',
      '25 estaciones de prototipado rápido y ensamblaje.',
      'Convenio de transferencia tecnológica con universidades aliadas.',
    ],
    specs: [
      { label: 'Puestos de desarrollo', value: '25 estaciones completas de IoT' },
      { label: 'Equipamiento', value: 'Impresoras 3D, osciloscopios y microcontroladores' },
      { label: 'Proyectos territoriales/año', value: '15 prototipos funcionales' },
      { label: 'Acceso para becados', value: '100 % libre y gratuito' },
    ],
    roiBreakdown: [
      { label: 'Prototipos comunitarios validados', value: '15 al año' },
      { label: 'Jóvenes capacitados en hardware/IoT', value: '120 anuales' },
      { label: 'Retorno social estimado (SROI)', value: '2,6x en innovación cívica' },
    ],
  },
  {
    id: 'APL-004',
    name: 'Nodos Satélite TrAIning en el San Juan y la Costa Pacífica',
    category: 'Impacto Comunitario',
    status: 'En evaluación',
    isAPlus: false,
    summary:
      'Descentralización del TrAIning con la apertura de 4 aulas satélite en Tadó, Condoto, Bahía Solano y Buenaventura para formar líderes comunitarios sin exigir migración a Quibdó.',
    description: [
      'El proyecto evalúa la articulación con colegios públicos y consejos comunitarios de 4 municipios para equipar salas y enviar a los multiplicadores más destacados de la primera cohorte a dictar la Fase 1.',
      'Permitirá sumar 400 nuevos cupos de formación para jóvenes en zonas dispersas que no tienen recursos para desplazarse o radicarse en la capital departamental.',
    ],
    roi: 210,
    roiHorizonMonths: 36,
    investment: 390000000,
    projectedReturn: 819000000,
    paybackMonths: 12,
    impactScore: 85,
    priority: 'Media',
    risk: 'Medio',
    startDate: '2026-08-15',
    targetDate: '2027-06-30',
    createdAt: '2026-04-05',
    region: 'Subregiones del Chocó',
    owner: { name: 'Doris Córdoba', role: 'Coordinadora de Articulación Territorial', email: 'territorio@fundacionamas.org.co' },
    highlights: [
      'Lleva el programa TrAIning fuera de Quibdó a subregiones apartadas.',
      '400 nuevos cupos para jóvenes afro e indígenas.',
      'Potencia salas comunitarias y colegios públicos locales.',
      '20 facilitadores certificados de las primeras cohortes contratados.',
    ],
    specs: [
      { label: 'Municipios sede', value: 'Tadó, Condoto, Bahía Solano y Buenaventura' },
      { label: 'Nuevos cupos de beca', value: '400 jóvenes' },
      { label: 'Facilitadores comunitarios', value: '20 multiplicadores certificados' },
      { label: 'Sinergia institucional', value: 'Consejos comunitarios y alcaldías' },
    ],
    roiBreakdown: [
      { label: 'Comunidades impactadas', value: '4 subregiones del Pacífico' },
      { label: 'Jóvenes certificados', value: '400 nuevos talentos' },
      { label: 'Efecto multiplicador 10:1', value: '4.000 personas alcanzadas' },
    ],
  },
  {
    id: 'APL-005',
    name: 'Campus Virtual Offline-First y Paquetes de Código Ligero',
    category: 'Educación & IA',
    status: 'En evaluación',
    isAPlus: false,
    summary:
      'Desarrollo de módulos descargables que permiten practicar código Python y algoritmos sin internet, sincronizando calificaciones y dudas al conectarse en el aula.',
    description: [
      'Dado que muchos alumnos no cuentan con wifi permanente en sus viviendas, este campus virtual ligero permite descargar lecciones interactivas y ejercitar código en local mediante WebAssembly.',
      'Al regresar a un punto de conexión comunitaria o al aula del TrAIning, el sistema sincroniza automáticamente los avances con el portal de calificaciones y el semáforo docente.',
    ],
    roi: 195,
    roiHorizonMonths: 24,
    investment: 180000000,
    projectedReturn: 351000000,
    paybackMonths: 6,
    impactScore: 83,
    priority: 'Media',
    risk: 'Bajo',
    startDate: '2026-05-01',
    targetDate: '2026-11-30',
    createdAt: '2026-02-10',
    region: 'Litoral Pacífico',
    owner: { name: 'Andrés Mosquera', role: 'Arquitecto de Software Educativo', email: 'tecnologia@fundacionamas.org.co' },
    highlights: [
      'Estudio y programación autónoma sin depender de conexión permanente.',
      'Ahorra más del 80 % del gasto en paquetes de datos móviles.',
      'Sincronización automática con la base de datos de notas del portal.',
      'Funciona en computadores básicos y reacondicionados.',
    ],
    specs: [
      { label: 'Arquitectura técnica', value: 'PWA Offline-First con IndexedDB' },
      { label: 'Ahorro en conectividad', value: '80 % menos datos móviles requeridos' },
      { label: 'Soporte de plataformas', value: 'Windows, Linux y navegadores Android' },
      { label: 'Compilador integrado', value: 'Python WebAssembly en navegador' },
    ],
    roiBreakdown: [
      { label: 'Estudiantes beneficiados sin wifi fijo', value: '600 activos' },
      { label: 'Cumplimiento de proyectos prácticos', value: '94 % de entregas' },
      { label: 'SROI pedagógico estimado', value: '1,95x en continuidad académica' },
    ],
  },
  {
    id: 'APL-006',
    name: 'Tutor Inteligente IA y Semáforo de Alerta Temprana',
    category: 'Educación & IA',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Ampliación del asistente de IA de la fundación con explicaciones adaptadas al contexto del Pacífico, conectado al semáforo de riesgo para prevenir deserción escolar.',
    description: [
      'Aprovecha el microservicio FastAPI y la cascada de modelos LLM (Llama 3.3 y Gemini) ya construida en la plataforma para ofrecer un tutor conversacional que atiende dudas técnicas a deshoras.',
      'El sistema detecta patrones de dificultad en ejercicios y registros de asistencia, clasificando en semáforo de riesgo (Verde, Amarillo, Rojo) para que los docentes intervengan antes de que el estudiante desista.',
    ],
    roi: 310,
    roiHorizonMonths: 36,
    investment: 240000000,
    projectedReturn: 744000000,
    paybackMonths: 5,
    impactScore: 96,
    priority: 'Crítica',
    risk: 'Bajo',
    startDate: '2026-06-15',
    targetDate: '2027-01-15',
    createdAt: '2026-01-10',
    region: 'Chocó',
    owner: { name: 'Dra. Sandra Mena', role: 'Directora Académica del TrAIning', email: 'academica@fundacionamas.org.co' },
    highlights: [
      'Integración directa con el Semáforo de Riesgo y el panel docente.',
      'Respuestas en lenguaje empático adaptado a la pedagogía territorial.',
      'Disponibilidad de tutoría 24/7 para dudas de código y sintaxis.',
      'Disminución proyectada del 35 % en reprobación de módulos.',
    ],
    specs: [
      { label: 'Stack tecnológico', value: 'FastAPI + Llama 3.3 / Gemini + SSE' },
      { label: 'Capacidad de atención', value: 'Consultas concurrentes en streaming' },
      { label: 'Alertas tempranas', value: 'Notificación directa a coordinadores' },
      { label: 'Tiempo de respuesta', value: '< 1,5 segundos por consulta' },
    ],
    roiBreakdown: [
      { label: 'Reducción de deserción académica', value: '35 % menos pérdidas' },
      { label: 'Consultas formativas resueltas/mes', value: '+12.000 respuestas' },
      { label: 'SROI de retención de talento', value: '3,1x por cada peso invertido' },
    ],
  },
  {
    id: 'APL-007',
    name: 'Fondo Semilla de Becas 100% Gratuitas y Auxilios de Manutención',
    category: 'Sostenibilidad & Becas',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Fondo de patrocinio y cooperación con empresas aliadas internacionales para cubrir matrícula, conectividad, transporte y alimentación de 300 nuevos becados.',
    description: [
      'La Fundación A+ tiene como principio que ningún joven con vocación tecnológica se quede sin estudiar por falta de recursos para transporte o alimentación diaria.',
      'Este fondo canaliza donaciones filantrópicas y de responsabilidad social corporativa para garantizar becas 100% integrales, desembolsando auxilios mensuales supervisados por el comité de bienestar.',
    ],
    roi: 380,
    roiHorizonMonths: 48,
    investment: 850000000,
    projectedReturn: 3230000000,
    paybackMonths: 10,
    impactScore: 98,
    priority: 'Crítica',
    risk: 'Bajo',
    startDate: '2026-05-01',
    targetDate: '2027-05-01',
    createdAt: '2026-02-28',
    region: 'Chocó & Pacífico',
    owner: { name: 'Carlos Mario Rentería', role: 'Director de Alianzas y Cooperación', email: 'alianzas@fundacionamas.org.co' },
    highlights: [
      '300 becas completas 100 % gratuitas con auxilios de transporte y almuerzo.',
      'Alianzas con corporaciones tecnológicas de alcance global.',
      'Trazabilidad abierta de cada peso donado.',
      'Movilidad social real para familias en situación de vulnerabilidad.',
    ],
    specs: [
      { label: 'Becas financiadas', value: '300 cupos integrales' },
      { label: 'Componentes de la beca', value: 'Formación, conectividad, equipo y auxilio' },
      { label: 'Duración por becario', value: '10 meses intensivos + 6 meses inserción' },
      { label: 'Auditoría financiera', value: 'Revisión trimestral con cooperantes' },
    ],
    roiBreakdown: [
      { label: 'Aumento en ingresos familiares futuros', value: '3x a 5x salario mínimo' },
      { label: 'Multiplicadores activos formados', value: '300 líderes en territorio' },
      { label: 'Retorno Social de la Inversión (SROI)', value: '3,8x en ingreso familiar transferido' },
    ],
  },
  {
    id: 'APL-008',
    name: 'Aulas Fluviales Itinerantes por la Cuenca del Atrato',
    category: 'Infraestructura & Conectividad',
    status: 'En evaluación',
    isAPlus: false,
    summary:
      'Embarcaciones dotadas de computadores portátiles rugerizados, paneles solares y Starlink para llevar talleres introductorios de lógica computacional a comunidades ribereñas.',
    description: [
      'En el departamento del Chocó los ríos son las arterias de la vida cotidiana. Muchas comunidades sobre el río Atrato y San Juan carecen de conectividad y aulas físicas para aprender tecnología.',
      'La propuesta evalúa dos lanchas equipadas que recorrerán cuenca arriba y cuenca abajo impartiendo talleres de 3 días para sembrar vocaciones tecnológicas tempranas y seleccionar talentos para las próximas cohortes del TrAIning.',
    ],
    roi: 180,
    roiHorizonMonths: 36,
    investment: 310000000,
    projectedReturn: 558000000,
    paybackMonths: 14,
    impactScore: 79,
    priority: 'Media',
    risk: 'Medio',
    startDate: '2026-09-01',
    targetDate: '2027-08-31',
    createdAt: '2026-03-18',
    region: 'Cuencas del Atrato y San Juan',
    owner: { name: 'Jader Palacios', role: 'Líder de Infraestructura y Conectividad', email: 'infraestructura@fundacionamas.org.co' },
    highlights: [
      'Acceso a tecnología para comunidades ribereñas sin conexión terrestre.',
      '20 portátiles a bordo con autonomía solar de 8 horas.',
      'Detección y semillero de talentos para futuras cohortes.',
      'Talleres prácticos de pensamiento computacional sin desarraigo.',
    ],
    specs: [
      { label: 'Embarcaciones adaptadas', value: '2 lanchas comunitarias dotadas' },
      { label: 'Capacidad por taller', value: '20 jóvenes por jornada' },
      { label: 'Comunidades ribereñas meta', value: '12 asentamientos por ciclo' },
      { label: 'Equipamiento', value: 'Starlink + computadores de alta resistencia' },
    ],
    roiBreakdown: [
      { label: 'Participantes en talleres fluviales', value: '600 niños y jóvenes' },
      { label: 'Talentos preseleccionados para beca', value: '50 jóvenes al año' },
      { label: 'SROI de inclusión territorial', value: '1,8x en democratización de acceso' },
    ],
  },
  {
    id: 'APL-009',
    name: 'Red de Empleabilidad Tech Remota sin Desarraigo Territorial',
    category: 'Empleabilidad Tech',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Alianzas con empresas de desarrollo de software globales para vincular laboralmente a los egresados del TrAIning en puestos remotos como programadores junior y analistas de IA.',
    description: [
      'El lema central de la Fundación A+ es la tecnología sin desarraigo: que los jóvenes del Chocó trabajen para empresas de todo el mundo sin tener que abandonar sus raíces familiares ni su tierra natal.',
      'El proyecto estructura la fase avanzada con empresas aliadas que ofrecen mentoría directa, simulaciones de entrevistas en inglés técnico y plazas de trabajo formal 100% remoto con salarios dignos.',
    ],
    roi: 420,
    roiHorizonMonths: 48,
    investment: 260000000,
    projectedReturn: 1092000000,
    paybackMonths: 6,
    impactScore: 97,
    priority: 'Crítica',
    risk: 'Bajo',
    startDate: '2026-06-01',
    targetDate: '2027-03-31',
    createdAt: '2026-02-14',
    region: 'Quibdó (Remoto Global)',
    owner: { name: 'Vanessa Hinestroza', role: 'Directora de Empleabilidad y Conexión Laboral', email: 'empleabilidad@fundacionamas.org.co' },
    highlights: [
      'Empleabilidad tech formal 100 % remota sin salir de Quibdó.',
      'Convenios con más de 14 empresas tecnológicas aliadas.',
      'Ingresos iniciales dignos que rompen círculos de pobreza.',
      'Mentorías 1:1 con ingenieros senior de la industria.',
    ],
    specs: [
      { label: 'Plazas laborales año 1', value: '120 graduados contratados' },
      { label: 'Modalidad de contratación', value: 'Trabajo remoto formal con prestaciones' },
      { label: 'Empresas aliadas vinculadas', value: '14 compañías de software' },
      { label: 'Acompañamiento en empleo', value: '6 meses de mentoría sénior' },
    ],
    roiBreakdown: [
      { label: 'Masa salarial inyectada al territorio', value: '+ $ 1.800 M COP anuales' },
      { label: 'Tasa de retención comunitaria', value: '92 % permanece en el Chocó' },
      { label: 'Retorno social de la empleabilidad', value: '4,2x en dinamización económica' },
    ],
  },
  {
    id: 'APL-010',
    name: 'Laboratorio de IA para Bioeconomía y Biodiversidad del Chocó',
    category: 'Innovación Social',
    status: 'En evaluación',
    isAPlus: false,
    summary:
      'Semillero donde graduados del TrAIning entrenan modelos de visión por computador y bioacústica para estudiar la selva pluvial del Pacífico y apoyar proyectos ambientales comunitarios.',
    description: [
      'El Chocó biogeográfico es uno de los pulmones más biodiversos del planeta. Esta iniciativa permite a los egresados del TrAIning aplicar sus conocimientos de Inteligencia Artificial para preservar el entorno natural.',
      'El laboratorio procesará cantos de aves, cámaras trampa y alertas tempranas de deforestación, generando datasets abiertos y herramientas digitales al servicio de los consejos comunitarios y la ciencia.',
    ],
    roi: 205,
    roiHorizonMonths: 36,
    investment: 380000000,
    projectedReturn: 779000000,
    paybackMonths: 15,
    impactScore: 86,
    priority: 'Media',
    risk: 'Medio',
    startDate: '2026-09-15',
    targetDate: '2027-09-15',
    createdAt: '2026-03-25',
    region: 'Chocó Biogeográfico',
    owner: { name: 'Ing. Yeison Cuesta', role: 'Director de Innovación y Tecnología', email: 'innovacion@fundacionamas.org.co' },
    highlights: [
      'Inteligencia Artificial aplicada a la riqueza natural del Chocó.',
      'Modelos entrenados con fauna y flora nativa del Pacífico.',
      'Participación activa de becados en proyectos de grado e investigación.',
      'Alianzas con centros de investigación ambiental y comunidades locales.',
    ],
    specs: [
      { label: 'Capacidad de cómputo', value: 'Servidor GPU local donado por aliados' },
      { label: 'Líneas de investigación', value: 'Bioacústica, fauna silvestre y bosque pluvial' },
      { label: 'Becarios investigadores', value: '45 jóvenes en semillero avanzado' },
      { label: 'Licencia de software', value: 'Código abierto para la comunidad' },
    ],
    roiBreakdown: [
      { label: 'Área monitoreada con modelos de IA', value: '25.000 ha de selva pluvial' },
      { label: 'Especies registradas en bases de datos', value: '+400 especies nativas' },
      { label: 'SROI ambiental y científico', value: '2,05x en conservación biológica' },
    ],
  },
  {
    id: 'APL-011',
    name: 'Portal Público de Auditoría Abierta y Veeduría Comunitaria',
    category: 'Impacto Comunitario',
    status: 'En evaluación',
    isAPlus: false,
    summary:
      'Módulo abierto donde cooperantes, familias y veedurías ciudadanas auditan en vivo la asistencia de clases con códigos QR, calificaciones y ejecución de donaciones.',
    description: [
      'La transparencia es el pilar de legitimidad de la Fundación A+. Este portal conecta la base de datos MySQL institucional para publicar balances en tiempo real, actas de entrega y resultados verificables.',
      'Cualquier donante o ciudadano podrá constatar la asistencia 0-click mediante QR de los estudiantes, notas y certificaciones emitidas, asegurando un estándar ético y fiduciario del 100%.',
    ],
    roi: 260,
    roiHorizonMonths: 24,
    investment: 120000000,
    projectedReturn: 312000000,
    paybackMonths: 4,
    impactScore: 90,
    priority: 'Alta',
    risk: 'Bajo',
    startDate: '2026-04-15',
    targetDate: '2026-10-15',
    createdAt: '2026-02-01',
    region: 'Institucional',
    owner: { name: 'Carlos Mario Rentería', role: 'Director de Alianzas y Cooperación', email: 'alianzas@fundacionamas.org.co' },
    highlights: [
      'Auditoría y trazabilidad abierta al público sin barreras de acceso.',
      'Integración en tiempo real con asistencias QR y calificaciones.',
      'Verificación criptográfica de diplomas y certificados.',
      'Cumplimiento de estándares de rendición de cuentas para ONGs.',
    ],
    specs: [
      { label: 'Fuentes de datos conectadas', value: 'Asistencias QR, notas, PQR y balances' },
      { label: 'Tipo de acceso', value: '100 % público y gratuito' },
      { label: 'Frecuencia de actualización', value: 'En tiempo real con cada evento' },
      { label: 'Certificación digital', value: 'Código QR y hash único de verificación' },
    ],
    roiBreakdown: [
      { label: 'Confianza y auditoría comunitaria', value: '100 % de reportes abiertos' },
      { label: 'Atracción de nuevos donantes', value: '+ $ 600 M COP en donaciones' },
      { label: 'SROI de transparencia institucional', value: '2,6x en legitimidad y alianzas' },
    ],
  },
  {
    id: 'APL-012',
    name: 'Donatón Tecnológica y Taller de Reacondicionamiento de Portátiles',
    category: 'Impacto Comunitario',
    status: 'En evaluación',
    isAPlus: true,
    summary:
      'Taller de economía circular donde estudiantes del TrAIning reparan, actualizan y entregan computadores donados por empresas aliadas a hogares de escasos recursos en Quibdó.',
    description: [
      'Las empresas aliadas renuevan sus equipos de cómputo periódicamente. A través de este programa, los portátiles en desuso se reciben en Quibdó y los propios becados realizan mantenimiento preventivo e instalación de software ligero.',
      'Los computadores reacondicionados se entregan a las familias de los becados y escuelas rurales, convirtiendo la chatarra tecnológica en oportunidades de educación.',
    ],
    roi: 340,
    roiHorizonMonths: 36,
    investment: 150000000,
    projectedReturn: 510000000,
    paybackMonths: 5,
    impactScore: 94,
    priority: 'Alta',
    risk: 'Bajo',
    startDate: '2026-05-15',
    targetDate: '2026-11-30',
    createdAt: '2026-02-15',
    region: 'Quibdó',
    owner: { name: 'Doris Córdoba', role: 'Coordinadora de Articulación Territorial', email: 'territorio@fundacionamas.org.co' },
    highlights: [
      'Economía circular que extiende la vida útil de equipos corporativos.',
      'Práctica real de ensamble, diagnóstico y soporte técnico para becados.',
      'Meta de 350 computadores portátiles entregados a familias vulnerables.',
      'Reducción de residuos electrónicos promoviendo sostenibilidad.',
    ],
    specs: [
      { label: 'Equipos meta a reacondicionar', value: '350 laptops y computadores' },
      { label: 'Sistema operativo instalado', value: 'Linux ligero configurado para programar' },
      { label: 'Familias beneficiadas', value: '350 hogares del Chocó' },
      { label: 'Talleres de capacitación técnica', value: '24 jornadas de soporte y ensamble' },
    ],
    roiBreakdown: [
      { label: 'Equipos rescatados y en uso activo', value: '350 portátiles entregados' },
      { label: 'Ahorro económico directo a familias', value: '+ $ 420 M COP en hardware' },
      { label: 'Retorno social de la donatón (SROI)', value: '3,4x en acceso tecnológico familiar' },
    ],
  },
];
