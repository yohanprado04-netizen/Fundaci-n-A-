import type { Student, AlertItem, KPISummary, ActionRecord } from '../types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'est-001',
    name: 'Juan Pérez',
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
    id: 'est-002',
    name: 'María López',
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
      },
      {
        title: 'Actividades pendientes',
        description: '1 entrega atrasada en el taller de JavaScript.',
        severity: 'amber'
      }
    ],
    recommendation: 'Verificar estado de conectividad y coordinar tutoría de nivelación para entrega de talleres.'
  },
  {
    id: 'est-003',
    name: 'Carlos Gómez',
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
      },
      {
        title: 'Baja asistencia',
        description: 'Asistencia al 68% inferior al umbral mínimo del 80%.',
        severity: 'rose'
      }
    ],
    recommendation: 'Intervención prioritaria con citación a tutoría individual y acuerdo de recuperación pedagógica.'
  },
  {
    id: 'est-004',
    name: 'Ana Torres',
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
    id: 'est-005',
    name: 'Luis Vargas',
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
    id: 'est-006',
    name: 'Sofía Ramírez',
    program: 'Estudiante de Diseño UI/UX',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
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

export const RECENT_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    studentId: 'est-001',
    studentName: 'Juan Pérez',
    title: 'Bajo rendimiento académico + baja asistencia',
    description: 'Promedio actual 2.7 y asistencia 71% con 3 inasistencias seguidas',
    severity: 'Riesgo alto',
    timestamp: 'Hoy, 09:42 a.m.',
    status: 'Pendiente'
  },
  {
    id: 'alt-002',
    studentId: 'est-002',
    studentName: 'María López',
    title: '3 inasistencias consecutivas',
    description: 'Falta recurrente a las últimas clases de Frontend',
    severity: 'Riesgo medio',
    timestamp: 'Hoy, 08:17 a.m.',
    status: 'Pendiente'
  },
  {
    id: 'alt-003',
    studentId: 'est-003',
    studentName: 'Carlos Gómez',
    title: 'Promedio académico: 2.5',
    description: 'Calificación acumulada en zona de riesgo de pérdida',
    severity: 'Riesgo alto',
    timestamp: 'Ayer, 04:32 p.m.',
    status: 'En proceso'
  },
  {
    id: 'alt-004',
    studentId: 'est-004',
    studentName: 'Ana Torres',
    title: 'Disminución en el rendimiento académico',
    description: 'Descenso en promedio general durante el último mes',
    severity: 'Riesgo medio',
    timestamp: 'Ayer, 02:15 p.m.',
    status: 'Vista'
  },
  {
    id: 'alt-005',
    studentId: 'est-006',
    studentName: 'Sofía Ramírez',
    title: 'Seguimiento normal',
    description: 'Verificación periódica completada con éxito',
    severity: 'Bajo riesgo',
    timestamp: 'Ayer, 11:03 a.m.',
    status: 'Resuelta'
  }
];

class DataService {
  private students: Student[] = [...INITIAL_STUDENTS];
  private alerts: AlertItem[] = [...RECENT_ALERTS];
  private actions: ActionRecord[] = [];

  public getKPISummary(): KPISummary {
    return {
      totalStudents: 80,
      lowRiskCount: 52,
      lowRiskPercent: 65,
      mediumRiskCount: 18,
      mediumRiskPercent: 22,
      highRiskCount: 10,
      highRiskPercent: 13
    };
  }

  public getStudents(searchQuery = '', filterRisk = 'Todos'): Student[] {
    return this.students.filter(student => {
      const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.program.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRisk = filterRisk === 'Todos' || 
                        (filterRisk === 'Bajo riesgo' && student.riskLevel === 'Bajo') ||
                        (filterRisk === 'Riesgo medio' && student.riskLevel === 'Medio') ||
                        (filterRisk === 'Riesgo alto' && student.riskLevel === 'Alto');
      return matchSearch && matchRisk;
    });
  }

  public getStudentById(id: string): Student | undefined {
    return this.students.find(s => s.id === id);
  }

  public getStudentByName(name: string): Student | undefined {
    return this.students.find(s => s.name === name);
  }

  public getRecentAlerts(): AlertItem[] {
    return this.alerts;
  }

  public registerAction(action: Omit<ActionRecord, 'id' | 'timestamp'>): ActionRecord {
    const newRecord: ActionRecord = {
      ...action,
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    this.actions.push(newRecord);

    const student = this.students.find(s => s.id === action.studentId);
    if (student && action.newStatus === 'Resuelta') {
      student.activeAlerts = [];
      student.riskLevel = 'Bajo';
    }

    return newRecord;
  }

  public getActionHistory(): ActionRecord[] {
    return this.actions;
  }
}

export const dataService = new DataService();
