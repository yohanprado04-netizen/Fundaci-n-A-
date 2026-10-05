import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { User } from './models/User.js';
import { Student } from './models/Student.js';
import { Alert } from './models/Alert.js';
import { Rule } from './models/Rule.js';
import { FollowUp } from './models/FollowUp.js';
import { Notification } from './models/Notification.js';

async function seed() {
  await connectDB();
  console.log('[Seed] Limpiando colecciones existentes...');
  await User.deleteMany({});
  await Student.deleteMany({});
  await Alert.deleteMany({});
  await Rule.deleteMany({});
  await FollowUp.deleteMany({});
  await Notification.deleteMany({});

  console.log('[Seed] Insertando usuarios de prueba...');
  // Users: Docentes, Administradores, Estudiantes
  const users = await User.create([
    {
      name: 'Laura Gómez',
      email: 'laura@fundacion.org',
      password: 'Password123!',
      role: 'docente',
      program: 'Docente Titular de Programación',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'
    },
    {
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@fundacion.org',
      password: 'Password123!',
      role: 'docente',
      program: 'Docente de Ciberseguridad y Redes',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces'
    },
    {
      name: 'Administrador General',
      email: 'admin@fundacion.org',
      password: 'Password123!',
      role: 'administrador',
      program: 'Dirección Académica y Convocatorias',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces'
    },
    {
      name: 'Juan Pérez',
      email: 'juan.perez@fundacion.org',
      password: 'Password123!',
      role: 'estudiante',
      program: 'Estudiante de Programación',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces'
    },
    {
      name: 'María López',
      email: 'maria.lopez@fundacion.org',
      password: 'Password123!',
      role: 'estudiante',
      program: 'Estudiante de Desarrollo Web',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces'
    }
  ]);
  console.log(`[Seed] ${users.length} usuarios creados exitosamente.`);

  console.log('[Seed] Insertando catálogo de 80 estudiantes de prueba...');
  // Primary Students from visual mockup
  const baseStudents = [
    {
      name: 'Juan Pérez',
      email: 'juan.perez@fundacion.org',
      program: 'Estudiante de Programación',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Alto',
      gpa: 2.7,
      attendancePercentage: 71,
      totalAbsences: 8,
      consecutiveAbsences: 3,
      monthlyGrades: [4.0, 3.8, 3.4, 3.0, 2.7],
      monthlyAttendance: [95, 90, 85, 78, 71],
      activeAlerts: [
        {
          title: 'Bajo rendimiento académico',
          description: 'Promedio actual de 2.7/5.0 (mínimo establecido: 3.0).',
          severity: 'rose'
        },
        {
          title: 'Baja asistencia',
          description: '71% de asistencia (mínimo establecido: 80%).',
          severity: 'rose'
        },
        {
          title: 'Inasistencias consecutivas',
          description: 'Registra 3 inasistencias seguidas.',
          severity: 'rose'
        }
      ],
      recommendation: 'Realizar seguimiento académico y contactar al estudiante para conocer las causas de sus inasistencias y dificultades en las calificaciones.'
    },
    {
      name: 'María López',
      email: 'maria.lopez@fundacion.org',
      program: 'Estudiante de Desarrollo Web',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Medio',
      gpa: 3.2,
      attendancePercentage: 82,
      totalAbsences: 5,
      consecutiveAbsences: 2,
      monthlyGrades: [4.2, 4.0, 3.7, 3.4, 3.2],
      monthlyAttendance: [96, 92, 88, 85, 82],
      activeAlerts: [
        {
          title: 'Inasistencias consecutivas',
          description: 'Registra 2 inasistencias consecutivas en el módulo de Frontend.',
          severity: 'amber'
        }
      ],
      recommendation: 'Verificar estado de conectividad y coordinar tutoría de nivelación para entrega de talleres.'
    },
    {
      name: 'Carlos Gómez',
      email: 'carlos.gomez@fundacion.org',
      program: 'Estudiante de Ciberseguridad',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Alto',
      gpa: 2.5,
      attendancePercentage: 68,
      totalAbsences: 9,
      consecutiveAbsences: 3,
      monthlyGrades: [3.9, 3.5, 3.1, 2.8, 2.5],
      monthlyAttendance: [90, 85, 78, 72, 68],
      activeAlerts: [
        {
          title: 'Rendimiento crítico',
          description: 'Promedio académico de 2.5/5.0 en evaluaciones de redes.',
          severity: 'rose'
        }
      ],
      recommendation: 'Intervención prioritaria con citación a tutoría individual y acuerdo de recuperación pedagógica.'
    },
    {
      name: 'Ana Torres',
      email: 'ana.torres@fundacion.org',
      program: 'Estudiante de Analítica de Datos',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Medio',
      gpa: 3.4,
      attendancePercentage: 79,
      totalAbsences: 6,
      consecutiveAbsences: 1,
      monthlyGrades: [4.5, 4.2, 3.9, 3.6, 3.4],
      monthlyAttendance: [95, 91, 86, 82, 79],
      activeAlerts: [
        {
          title: 'Disminución en rendimiento',
          description: 'Descenso sostenido en las últimas 3 evaluaciones de SQL.',
          severity: 'amber'
        }
      ],
      recommendation: 'Agendar sesión de repaso de conceptos y monitorear próximas evaluaciones prácticas.'
    },
    {
      name: 'Luis Vargas',
      email: 'luis.vargas@fundacion.org',
      program: 'Estudiante de Programación',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Bajo',
      gpa: 4.1,
      attendancePercentage: 92,
      totalAbsences: 2,
      consecutiveAbsences: 0,
      monthlyGrades: [4.0, 4.1, 4.0, 4.2, 4.1],
      monthlyAttendance: [98, 96, 94, 93, 92],
      activeAlerts: [],
      recommendation: 'Excelente desempeño general. Mantener seguimiento ordinario en la plataforma.'
    },
    {
      name: 'Sofía Ramírez',
      email: 'sofia.ramirez@fundacion.org',
      program: 'Estudiante de Diseño UI/UX',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      riskLevel: 'Bajo',
      gpa: 4.6,
      attendancePercentage: 97,
      totalAbsences: 1,
      consecutiveAbsences: 0,
      monthlyGrades: [4.4, 4.5, 4.7, 4.6, 4.6],
      monthlyAttendance: [100, 98, 97, 98, 97],
      activeAlerts: [],
      recommendation: 'Seguimiento normal. Participación destacada en talleres y proyectos grupales.'
    }
  ];

  // Generate additional students to reach exactly 80 total:
  // Target: 10 Alto (we have 2, need 8 more)
  // Target: 18 Medio (we have 2, need 16 more)
  // Target: 52 Bajo (we have 2, need 50 more)
  const additionalStudents = [];

  // 8 more Alto
  for (let i = 7; i <= 14; i++) {
    additionalStudents.push({
      name: `Estudiante Alto ${i}`,
      email: `estudiante.alto${i}@fundacion.org`,
      program: 'Estudiante de Programación',
      avatar: `https://images.unsplash.com/photo-${1500000000000 + i}?w=120&h=120&fit=crop&crop=faces`,
      riskLevel: 'Alto',
      gpa: +(2.2 + (i % 6) * 0.1).toFixed(1),
      attendancePercentage: 65 + (i % 8),
      totalAbsences: 7 + (i % 4),
      consecutiveAbsences: 3,
      monthlyGrades: [3.8, 3.4, 3.0, 2.7, 2.4],
      monthlyAttendance: [90, 84, 76, 70, 66],
      activeAlerts: [{ title: 'Inasistencia crítica', description: 'Más de 3 faltas continuas', severity: 'rose' }],
      recommendation: 'Contactar de forma urgente al estudiante.'
    });
  }

  // 16 more Medio
  for (let j = 15; j <= 30; j++) {
    additionalStudents.push({
      name: `Estudiante Medio ${j}`,
      email: `estudiante.medio${j}@fundacion.org`,
      program: 'Estudiante de Desarrollo Web',
      avatar: `https://images.unsplash.com/photo-${1510000000000 + j}?w=120&h=120&fit=crop&crop=faces`,
      riskLevel: 'Medio',
      gpa: +(3.0 + (j % 5) * 0.1).toFixed(1),
      attendancePercentage: 76 + (j % 7),
      totalAbsences: 4 + (j % 3),
      consecutiveAbsences: 2,
      monthlyGrades: [4.0, 3.8, 3.5, 3.3, 3.1],
      monthlyAttendance: [95, 90, 86, 81, 78],
      activeAlerts: [{ title: 'Atención preventiva', description: 'Faltas recurrentes en talleres', severity: 'amber' }],
      recommendation: 'Agendar cita de seguimiento tutorial.'
    });
  }

  // 50 more Bajo
  for (let k = 31; k <= 80; k++) {
    additionalStudents.push({
      name: `Estudiante Destacado ${k}`,
      email: `estudiante.bajo${k}@fundacion.org`,
      program: 'Estudiante de Tecnología',
      avatar: `https://images.unsplash.com/photo-${1520000000000 + k}?w=120&h=120&fit=crop&crop=faces`,
      riskLevel: 'Bajo',
      gpa: +(3.7 + (k % 12) * 0.1).toFixed(1),
      attendancePercentage: 88 + (k % 12),
      totalAbsences: (k % 3),
      consecutiveAbsences: 0,
      monthlyGrades: [4.2, 4.3, 4.1, 4.4, 4.3],
      monthlyAttendance: [98, 97, 96, 95, 94],
      activeAlerts: [],
      recommendation: 'Ritmo formativo óptimo.'
    });
  }

  const allStudentsToCreate = [...baseStudents, ...additionalStudents];
  const createdStudents = await Student.insertMany(allStudentsToCreate);
  console.log(`[Seed] ${createdStudents.length} estudiantes creados exitosamente (80 en total).`);

  // Create Alerts
  const juan = createdStudents.find(s => s.name === 'Juan Pérez');
  const maria = createdStudents.find(s => s.name === 'María López');
  const carlos = createdStudents.find(s => s.name === 'Carlos Gómez');
  const ana = createdStudents.find(s => s.name === 'Ana Torres');
  const sofia = createdStudents.find(s => s.name === 'Sofía Ramírez');

  await Alert.create([
    {
      studentId: juan._id,
      studentName: juan.name,
      title: 'Bajo rendimiento académico + baja asistencia',
      description: 'Promedio actual 2.7 y asistencia 71% con 3 inasistencias seguidas',
      severity: 'Riesgo alto',
      timestamp: 'Hoy, 09:42 a.m.',
      status: 'Pendiente'
    },
    {
      studentId: maria._id,
      studentName: maria.name,
      title: '3 inasistencias consecutivas',
      description: 'Falta recurrente a las últimas clases de Frontend',
      severity: 'Riesgo medio',
      timestamp: 'Hoy, 08:17 a.m.',
      status: 'Pendiente'
    },
    {
      studentId: carlos._id,
      studentName: carlos.name,
      title: 'Promedio académico: 2.5',
      description: 'Calificación acumulada en zona de riesgo de pérdida',
      severity: 'Riesgo alto',
      timestamp: 'Ayer, 04:32 p.m.',
      status: 'En proceso'
    },
    {
      studentId: ana._id,
      studentName: ana.name,
      title: 'Disminución en el rendimiento académico',
      description: 'Descenso en promedio general durante el último mes',
      severity: 'Riesgo medio',
      timestamp: 'Ayer, 02:15 p.m.',
      status: 'Vista'
    },
    {
      studentId: sofia._id,
      studentName: sofia.name,
      title: 'Seguimiento normal',
      description: 'Verificación periódica completada con éxito',
      severity: 'Bajo riesgo',
      timestamp: 'Ayer, 11:03 a.m.',
      status: 'Resuelta'
    }
  ]);
  console.log('[Seed] Alertas recientes insertadas.');

  // Create Rules
  await Rule.create([
    {
      code: 'REG-ASIST-BAJA',
      name: 'Alerta de Baja Asistencia',
      conditionJson: { metric: 'asistencia', operator: '<', threshold: 75 },
      defaultSeverity: 'Riesgo'
    },
    {
      code: 'REG-REND-BAJO',
      name: 'Alerta de Rendimiento Académico Deficiente',
      conditionJson: { metric: 'promedio', operator: '<', threshold: 3.0 },
      defaultSeverity: 'Riesgo'
    },
    {
      code: 'REG-INACT-7D',
      name: 'Inactividad Prolongada en Plataforma',
      conditionJson: { metric: 'dias_inactivo', operator: '>=', threshold: 7 },
      defaultSeverity: 'Crítica'
    }
  ]);
  console.log('[Seed] Reglas declarativas creadas.');

  // Create initial FollowUps
  const followUps = await FollowUp.create([
    {
      studentId: juan._id,
      studentName: juan.name,
      teacherName: 'Laura Gómez',
      interventionType: 'Tutoría académica presencial / virtual',
      newStatus: 'En proceso',
      nextFollowupDate: '2025-05-02',
      observations: 'El estudiante reportó fallas de conectividad en Quibdó. Se acordó entrega extraordinaria de los talleres 3 y 4.'
    },
    {
      studentId: maria._id,
      studentName: maria.name,
      teacherName: 'Laura Gómez',
      interventionType: 'Acuerdo de entrega de actividades pendientes',
      newStatus: 'Resuelta',
      nextFollowupDate: '2025-05-10',
      observations: 'Se recibieron actividades al 100%. Asistencia y calificaciones restablecidas.'
    }
  ]);
  console.log(`[Seed] ${followUps.length} intervenciones docentes insertadas.`);

  // Create initial Notifications (Campana y Correo)
  const notifications = await Notification.create([
    {
      studentEmail: 'juan.perez@fundacion.org',
      studentName: 'Juan Pérez',
      type: 'intervencion',
      title: 'Nueva Intervención: Tutoría académica presencial / virtual',
      message: 'El estudiante reportó fallas de conectividad en Quibdó. Se acordó entrega extraordinaria de los talleres 3 y 4.',
      interventionType: 'Tutoría académica presencial / virtual',
      teacherName: 'Laura Gómez',
      nextFollowupDate: '2025-05-02',
      status: 'En proceso',
      read: false,
      emailSent: true,
      emailSubject: '[Fundación A+] Plan de Intervención Pedagógica: Tutoría académica presencial / virtual',
      emailBody: 'Detalles de tu acuerdo con Profa. Laura Gómez.'
    },
    {
      studentEmail: 'maria.lopez@fundacion.org',
      studentName: 'María López',
      type: 'intervencion',
      title: 'Intervención Resuelta: Acuerdo de entrega de actividades',
      message: 'Se recibieron actividades al 100%. Asistencia y calificaciones restablecidas.',
      interventionType: 'Acuerdo de entrega de actividades pendientes',
      teacherName: 'Laura Gómez',
      nextFollowupDate: '2025-05-10',
      status: 'Resuelta',
      read: true,
      emailSent: true,
      emailSubject: '[Fundación A+] Felicitaciones: Intervención Resuelta con éxito',
      emailBody: 'Tu compromiso académico ha sido completado con éxito.'
    }
  ]);
  console.log(`[Seed] ${notifications.length} notificaciones iniciales creadas.`);

  console.log('[Seed] ¡Proceso de siembra completado con éxito!');
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Error sembrando datos:', err);
  process.exit(1);
});
