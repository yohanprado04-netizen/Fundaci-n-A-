export type RiskLevel = 'Bajo' | 'Medio' | 'Alto';
export type AlertSeverity = 'Bajo riesgo' | 'Riesgo medio' | 'Riesgo alto' | 'Crítica' | 'Información';
export type AlertStatus = 'Pendiente' | 'Vista' | 'En proceso' | 'Resuelta' | 'Descartada';

export interface AlertItem {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  status: AlertStatus;
}

export interface Student {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  program: string;
  avatar: string;
  riskLevel: RiskLevel;
  gpa: number; // Max 5.0
  attendancePercentage: number;
  totalAbsences: number;
  consecutiveAbsences: number;
  monthlyGrades: number[]; // Jan, Feb, Mar, Apr, May
  monthlyAttendance: number[]; // Jan, Feb, Mar, Apr, May
  activeAlerts: {
    title: string;
    description: string;
    severity: 'rose' | 'amber' | 'emerald';
  }[];
  recommendation: string;
}

export interface KPISummary {
  totalStudents: number;
  lowRiskCount: number;
  lowRiskPercent: number;
  mediumRiskCount: number;
  mediumRiskPercent: number;
  highRiskCount: number;
  highRiskPercent: number;
}

export interface ActionRecord {
  id: string;
  studentId: string;
  studentName: string;
  interventionType: string;
  newStatus: AlertStatus;
  nextFollowupDate: string;
  observations: string;
  timestamp: string;
  teacherName: string;
}

export interface RuleItem {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  conditionJson: {
    metric: string;
    operator: string;
    threshold: number;
  };
  defaultSeverity: string;
  isActive: boolean;
  createdAt?: string;
}
