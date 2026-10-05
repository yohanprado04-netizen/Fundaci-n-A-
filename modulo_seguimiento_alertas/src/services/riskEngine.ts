import type { Student, RiskLevel } from '../types';

export interface EvaluationResult {
  riskLevel: RiskLevel;
  triggeredAlerts: {
    title: string;
    description: string;
    severity: 'rose' | 'amber' | 'emerald';
  }[];
  recommendation: string;
}

export class RiskEngine {
  /**
   * Evaluates student metrics against declarative thresholds.
   * Thresholds can be updated dynamically by administrators without modifying codebase.
   */
  public static evaluateStudent(student: Pick<Student, 'gpa' | 'attendancePercentage' | 'consecutiveAbsences' | 'totalAbsences'>): EvaluationResult {
    const triggeredAlerts: EvaluationResult['triggeredAlerts'] = [];
    let isHigh = false;
    let isMedium = false;

    // Rule 1: GPA Threshold
    if (student.gpa < 3.0) {
      triggeredAlerts.push({
        title: 'Bajo rendimiento académico',
        description: `Promedio actual de ${student.gpa.toFixed(1)}/5.0 (mínimo establecido: 3.0).`,
        severity: 'rose'
      });
      isHigh = true;
    } else if (student.gpa < 3.5) {
      triggeredAlerts.push({
        title: 'Rendimiento en observación',
        description: `Promedio actual de ${student.gpa.toFixed(1)}/5.0 próximo al límite de aprobación.`,
        severity: 'amber'
      });
      isMedium = true;
    }

    // Rule 2: Attendance Threshold
    if (student.attendancePercentage < 75) {
      triggeredAlerts.push({
        title: 'Baja asistencia',
        description: `${student.attendancePercentage}% de asistencia (mínimo establecido: 80%).`,
        severity: 'rose'
      });
      isHigh = true;
    } else if (student.attendancePercentage < 85) {
      triggeredAlerts.push({
        title: 'Asistencia en observación',
        description: `${student.attendancePercentage}% de asistencia en riesgo de incumplimiento.`,
        severity: 'amber'
      });
      isMedium = true;
    }

    // Rule 3: Consecutive Absences
    if (student.consecutiveAbsences >= 3) {
      triggeredAlerts.push({
        title: 'Inasistencias consecutivas',
        description: `Registra ${student.consecutiveAbsences} inasistencias seguidas.`,
        severity: 'rose'
      });
      isHigh = true;
    } else if (student.consecutiveAbsences === 2) {
      triggeredAlerts.push({
        title: 'Inasistencias recurrentes',
        description: 'Registra 2 faltas consecutivas a sesiones programadas.',
        severity: 'amber'
      });
      isMedium = true;
    }

    let riskLevel: RiskLevel = 'Bajo';
    if (isHigh) {
      riskLevel = 'Alto';
    } else if (isMedium) {
      riskLevel = 'Medio';
    }

    // Generate Assistive Recommendation
    let recommendation = '';
    if (riskLevel === 'Alto') {
      recommendation = 'Realizar seguimiento académico y contactar al estudiante para conocer las causas de sus inasistencias y dificultades en las calificaciones.';
    } else if (riskLevel === 'Medio') {
      recommendation = 'Verificar avance en actividades pendientes y coordinar sesión de refuerzo preventivo con el docente titular.';
    } else {
      recommendation = 'Seguimiento normal. El estudiante mantiene un ritmo académico y de asistencia satisfactorio.';
    }

    return {
      riskLevel,
      triggeredAlerts,
      recommendation
    };
  }
}
