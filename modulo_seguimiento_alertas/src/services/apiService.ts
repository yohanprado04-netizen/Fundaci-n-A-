const API_BASE_URL = 'http://localhost:4000/api';

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'docente' | 'estudiante' | 'administrador';
    program: string;
    avatar: string;
  };
}

export const PREDEFINED_USERS: Record<string, AuthResponse['user']> = {
  administrador: {
    id: 'admin_default',
    name: 'Administrador General',
    email: 'admin@fundacion.org',
    role: 'administrador',
    program: 'Dirección Académica y Convocatorias',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces'
  },
  docente: {
    id: 'docente_default',
    name: 'Laura Gómez',
    email: 'laura@fundacion.org',
    role: 'docente',
    program: 'Docente Titular de Programación',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'
  },
  estudiante: {
    id: 'estudiante_ana',
    name: 'Ana Torres',
    email: 'ana.torres@fundacion.org',
    role: 'estudiante',
    program: 'Estudiante de Analítica de Datos',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
  },
  estudiante_ana: {
    id: 'estudiante_ana',
    name: 'Ana Torres',
    email: 'ana.torres@fundacion.org',
    role: 'estudiante',
    program: 'Estudiante de Analítica de Datos',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
  },
  estudiante_juan: {
    id: 'estudiante_juan',
    name: 'Juan Pérez',
    email: 'juan.perez@fundacion.org',
    role: 'estudiante',
    program: 'Estudiante de Programación',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces'
  }
};

class ApiService {
  private token: string | null = localStorage.getItem('token');

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  private getAuthHeaders(): HeadersInit {
    const user = this.getCurrentUser();
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-email': user.email,
      'x-user-role': user.role,
      'x-user-name': encodeURIComponent(user.name)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error en inicio de sesión');
    this.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  public async register(payload: { name: string; email: string; password: string; role: string; program: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al registrar usuario');
    this.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  public getCurrentUser(): AuthResponse['user'] {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return PREDEFINED_USERS.administrador;
    }
    try {
      return JSON.parse(userStr) || PREDEFINED_USERS.administrador;
    } catch {
      return PREDEFINED_USERS.administrador;
    }
  }

  public setCurrentUser(user: AuthResponse['user']): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  public switchRole(roleKey: string): AuthResponse['user'] {
    const selected = PREDEFINED_USERS[roleKey] || PREDEFINED_USERS.administrador;
    this.setCurrentUser(selected);
    return selected;
  }

  public switchStudent(student: { name: string; email?: string; program?: string; avatar?: string }): AuthResponse['user'] {
    const user: AuthResponse['user'] = {
      id: 'student_' + (student.email || student.name),
      name: student.name,
      email: student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}@fundacion.org`,
      role: 'estudiante',
      program: student.program || 'Estudiante de la Fundación A+',
      avatar: student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces'
    };
    this.setCurrentUser(user);
    return user;
  }

  public logout(): void {
    this.setCurrentUser(PREDEFINED_USERS.administrador);
  }

  public async getKPIs() {
    try {
      const res = await fetch(`${API_BASE_URL}/kpi/summary`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return {
        isStudentView: false,
        totalStudents: 80,
        lowRiskCount: 52,
        lowRiskPercent: 65,
        mediumRiskCount: 18,
        mediumRiskPercent: 22,
        highRiskCount: 10,
        highRiskPercent: 13
      };
    }
  }

  public async getStudents(search = '', risk = 'Todos') {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (risk) params.append('risk', risk);
      const res = await fetch(`${API_BASE_URL}/students?${params.toString()}`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (err) {
      console.warn('Fallback o error al consultar estudiantes:', err);
      return [];
    }
  }

  public async getRecentAlerts() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/recent`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  }

  public async registerAction(actionData: {
    studentId: string;
    studentName: string;
    teacherName: string;
    interventionType: string;
    newStatus: string;
    nextFollowupDate: string;
    observations: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/actions/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(actionData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error registrando acción');
    return data;
  }

  public async getFollowUpHistory() {
    try {
      const res = await fetch(`${API_BASE_URL}/actions/history`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  }

  public async getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  public async markNotificationRead(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  public async markAllNotificationsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  // ----------------------------------------------------
  // GESTIÓN DE REGLAS Y DISPARADORES (ADMIN)
  // ----------------------------------------------------
  public async getRules() {
    try {
      const res = await fetch(`${API_BASE_URL}/rules`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  }

  public async createRule(ruleData: any) {
    const res = await fetch(`${API_BASE_URL}/rules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(ruleData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al crear regla');
    return data;
  }

  public async updateRule(id: string, ruleData: any) {
    const res = await fetch(`${API_BASE_URL}/rules/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(ruleData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al actualizar regla');
    return data;
  }

  public async deleteRule(id: string) {
    const res = await fetch(`${API_BASE_URL}/rules/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al eliminar regla');
    return data;
  }
}

export const apiService = new ApiService();
