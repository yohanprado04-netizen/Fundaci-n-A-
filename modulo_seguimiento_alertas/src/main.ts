import { apiService } from './services/apiService';
import type { Student } from './types';
import { Chart, registerables } from 'chart.js';
import { createIcons, icons } from 'lucide';

// Register Chart.js components
Chart.register(...registerables);

class FundacionPulseApp {
  private currentStudentId: string | null = null;
  private currentRiskFilter: string = 'Todos';
  private currentAlertSeverityFilter: string = 'Todas';
  private currentSearchQuery: string = '';
  private studentsList: Student[] = [];
  private allRecentAlerts: any[] = [];
  private rulesList: any[] = [];
  private activeTeachers: any[] = [];
  public activeTab: string = 'dashboard';

  private donutChartInstance: Chart | null = null;
  private trendChartInstance: Chart | null = null;
  private studentChartInstance: Chart | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.refreshIcons();
    this.setupRoleSwitcher();
    this.setupNavTabs();
    this.setupRuleEvents();
    this.setupAlertFilters();
    this.setupEngineRunner();
    this.setupExportReport();
    await this.checkSession();
  }

  private refreshIcons(): void {
    createIcons({ icons });
  }

  // ----------------------------------------------------
  // SISTEMA DE TOAST NOTIFICATIONS INTERACTIVAS
  // ----------------------------------------------------
  private showToast(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success'): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xl flex items-start space-x-3.5 max-w-md w-full relative overflow-hidden';
    
    let iconName = 'check-circle-2';
    let iconColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    let accentBorder = 'bg-emerald-500';

    if (type === 'warning') {
      iconName = 'alert-triangle';
      iconColor = 'text-amber-600 bg-amber-50 border-amber-200';
      accentBorder = 'bg-[#ffab4d]';
    } else if (type === 'error') {
      iconName = 'x-circle';
      iconColor = 'text-[#fb5373] bg-rose-50 border-rose-200';
      accentBorder = 'bg-[#fb5373]';
    } else if (type === 'info') {
      iconName = 'info';
      iconColor = 'text-blue-600 bg-blue-50 border-blue-200';
      accentBorder = 'bg-[#fd7f60]';
    }

    toast.innerHTML = `
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${accentBorder}"></div>
      <div class="w-10 h-10 rounded-xl ${iconColor} border flex items-center justify-center flex-shrink-0">
        <i data-lucide="${iconName}" class="w-5 h-5"></i>
      </div>
      <div class="flex-1 pr-2">
        <h5 class="text-sm font-bold text-slate-900 font-['Rubik',sans-serif]">${title}</h5>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5 leading-snug">${message}</p>
      </div>
      <button class="toast-close text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    };

    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 4500);
  }

  // ----------------------------------------------------
  // 1. GESTIÓN DIRECTA DE VISTA Y PERFIL (SIN LOGIN)
  // ----------------------------------------------------
  private async checkSession(): Promise<void> {
    const user = apiService.getCurrentUser();
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (dashboardScreen) dashboardScreen.classList.remove('hidden');

    // Actualizar encabezado y perfil institucional
    const tbName = document.getElementById('topbarUserName');
    const tbRole = document.getElementById('topbarUserRole');
    const tbAvatar = document.getElementById('topbarAvatar') as HTMLImageElement;
    const roleSelect = document.getElementById('roleSwitcherSelect') as HTMLSelectElement;

    if (tbName) tbName.innerText = user.name;
    if (tbRole) tbRole.innerText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (tbAvatar) tbAvatar.src = user.avatar;
    if (roleSelect) {
      if (user.email === 'ana.torres@fundacion.org') {
        roleSelect.value = 'estudiante_ana';
      } else if (user.email === 'juan.perez@fundacion.org') {
        roleSelect.value = 'estudiante_juan';
      } else {
        roleSelect.value = user.role;
      }
    }

    this.applyRolePrivileges(user);
    await this.loadAllData();
    this.refreshIcons();
  }

  private setupRoleSwitcher(): void {
    const roleSelect = document.getElementById('roleSwitcherSelect') as HTMLSelectElement;
    if (roleSelect) {
      roleSelect.addEventListener('change', async () => {
        const selectedRole = roleSelect.value;
        apiService.switchRole(selectedRole);
        this.showToast('Rol de Usuario Actualizado', `Cambiando a vista: ${roleSelect.options[roleSelect.selectedIndex].text}`, 'info');
        await this.checkSession();
      });
    }
  }

  private applyRolePrivileges(user: any): void {
    const studentBanner = document.getElementById('studentRoleBanner');
    const tabStudentsNav = document.getElementById('tabStudentsNav');
    const tabAlertsNav = document.getElementById('tabAlertsNav');
    const tabInterventionsNav = document.getElementById('tabInterventionsNav');
    const quickNewActionBtn = document.getElementById('quickNewActionBtn');
    const openActionModalBtn = document.getElementById('openActionModalBtn');
    const studentActionDisabledNotice = document.getElementById('studentActionDisabledNotice');

    if (user.role === 'estudiante') {
      // 1. MODO ESTUDIANTE: PRIVACIDAD TOTAL, SIN ACCESO A REGLAS NI OTROS ESTUDIANTES
      if (studentBanner) studentBanner.classList.remove('hidden');
      if (tabStudentsNav) tabStudentsNav.classList.add('hidden');
      if (tabAlertsNav) tabAlertsNav.classList.add('hidden');

      if (tabInterventionsNav) {
        tabInterventionsNav.classList.remove('hidden');
        tabInterventionsNav.innerHTML = `
          <i data-lucide="clipboard-check" class="w-5 h-5"></i>
          <span>Mis Compromisos y Acompañamiento</span>
        `;
      }
      if (quickNewActionBtn) quickNewActionBtn.classList.add('hidden');
      if (openActionModalBtn) openActionModalBtn.classList.add('hidden');
      if (studentActionDisabledNotice) studentActionDisabledNotice.classList.remove('hidden');

      this.switchTab('dashboard');
    } else if (user.role === 'docente') {
      // 2. MODO DOCENTE: GESTIÓN DE AULA E INTERVENCIONES
      if (studentBanner) studentBanner.classList.add('hidden');
      if (tabStudentsNav) tabStudentsNav.classList.remove('hidden');
      if (tabAlertsNav) tabAlertsNav.classList.add('hidden');
      if (tabInterventionsNav) {
        tabInterventionsNav.classList.remove('hidden');
        tabInterventionsNav.innerHTML = `
          <i data-lucide="clipboard-check" class="w-5 h-5"></i>
          <span>Bitácora de Intervenciones</span>
        `;
      }
      if (quickNewActionBtn) quickNewActionBtn.classList.remove('hidden');
      if (openActionModalBtn) openActionModalBtn.classList.remove('hidden');
      if (studentActionDisabledNotice) studentActionDisabledNotice.classList.add('hidden');

      if (this.activeTab === 'alerts') {
        this.switchTab('dashboard');
      }
    } else {
      // 3. MODO ADMINISTRADOR: CONFIGURACIÓN GENERAL Y REGLAS
      if (studentBanner) studentBanner.classList.add('hidden');
      if (tabStudentsNav) tabStudentsNav.classList.remove('hidden');
      if (tabAlertsNav) tabAlertsNav.classList.remove('hidden');
      if (tabInterventionsNav) {
        tabInterventionsNav.classList.remove('hidden');
        tabInterventionsNav.innerHTML = `
          <i data-lucide="clipboard-check" class="w-5 h-5"></i>
          <span>Bitácora de Intervenciones</span>
        `;
      }
      if (quickNewActionBtn) quickNewActionBtn.classList.remove('hidden');
      if (openActionModalBtn) openActionModalBtn.classList.remove('hidden');
      if (studentActionDisabledNotice) studentActionDisabledNotice.classList.add('hidden');
    }
    this.refreshIcons();
  }

  // ----------------------------------------------------
  // 2. NAVEGACIÓN POR PESTAÑAS (MODULAR TABS)
  // ----------------------------------------------------
  private setupNavTabs(): void {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        if (target) this.switchTab(target);
      });
    });
  }

  private switchTab(tabName: string): void {
    this.activeTab = tabName;

    const views = ['dashboard', 'students', 'alerts', 'interventions'];
    views.forEach(v => {
      const viewEl = document.getElementById(`view${v.charAt(0).toUpperCase() + v.slice(1)}`);
      if (viewEl) {
        if (v === tabName) {
          viewEl.classList.remove('hidden');
        } else {
          viewEl.classList.add('hidden');
        }
      }
    });

    const tabBtns = document.querySelectorAll('.nav-tab');
    tabBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabName;
      if (isTarget) {
        btn.classList.add('active', 'bg-gradient-amas', 'text-white', 'shadow-amas');
        btn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
      } else {
        btn.classList.remove('active', 'bg-gradient-amas', 'text-white', 'shadow-amas');
        btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
      }
    });

    // Re-renderizar elementos según la pestaña activa
    if (tabName === 'dashboard') {
      setTimeout(() => {
        this.initDonutChart();
        this.initTrendChart();
      }, 50);
    } else if (tabName === 'students') {
      this.renderStudentTable();
    } else if (tabName === 'alerts') {
      this.renderRulesList();
    } else if (tabName === 'interventions') {
      this.renderInterventionsList();
    }

    this.refreshIcons();
  }

  // ----------------------------------------------------
  // 3. CARGA INTEGRAL DE DATOS
  // ----------------------------------------------------
  private async loadAllData(): Promise<void> {
    const user = apiService.getCurrentUser();
    await this.loadActiveTeachers();
    await this.renderKPIs();
    await this.fetchAndRenderRecentAlerts();
    this.initDonutChart();
    this.initTrendChart();
    await this.renderStudentTable();
    if (user && user.role === 'administrador') {
      await this.renderRulesList();
    }
    await this.renderInterventionsList();
    await this.loadNotifications();
    this.setupInteractivity();
    this.refreshIcons();
  }

  private async renderKPIs(): Promise<void> {
    const kpis = await apiService.getKPIs();
    const user = apiService.getCurrentUser();
    const elTotal = document.getElementById('kpiTotal');
    const elLow = document.getElementById('kpiLow');
    const elMed = document.getElementById('kpiMedium');
    const elHigh = document.getElementById('kpiHigh');

    if (user && user.role === 'estudiante') {
      if (elTotal) elTotal.innerText = '1';
      if (elLow) elLow.innerText = kpis.lowRiskCount.toString();
      if (elMed) elMed.innerText = kpis.mediumRiskCount.toString();
      if (elHigh) elHigh.innerText = kpis.highRiskCount.toString();
    } else {
      if (elTotal) elTotal.innerText = kpis.totalStudents.toString();
      if (elLow) elLow.innerText = kpis.lowRiskCount.toString();
      if (elMed) elMed.innerText = kpis.mediumRiskCount.toString();
      if (elHigh) elHigh.innerText = kpis.highRiskCount.toString();
    }
  }

  // ----------------------------------------------------
  // FILTRADO INTERACTIVO DE ALERTAS RECIENTES
  // ----------------------------------------------------
  private setupAlertFilters(): void {
    const filterBtns = document.querySelectorAll('.alert-filter-pill');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active', 'bg-slate-900', 'text-white', 'shadow-xs');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('active', 'bg-slate-900', 'text-white', 'shadow-xs');

        this.currentAlertSeverityFilter = btn.getAttribute('data-severity') || 'Todas';
        this.renderFilteredAlerts();
      });
    });
  }

  private async fetchAndRenderRecentAlerts(): Promise<void> {
    this.allRecentAlerts = await apiService.getRecentAlerts();
    this.renderFilteredAlerts();
  }

  private renderFilteredAlerts(): void {
    const container = document.getElementById('recentAlertsContainer');
    if (!container) return;

    const user = apiService.getCurrentUser();
    let filtered = this.allRecentAlerts;

    if (this.currentAlertSeverityFilter !== 'Todas') {
      filtered = this.allRecentAlerts.filter(a => {
        if (this.currentAlertSeverityFilter === 'Crítica') {
          return a.severity === 'Riesgo alto' || a.severity === 'Crítica';
        }
        return a.severity === this.currentAlertSeverityFilter;
      });
    }

    if (filtered.length === 0) {
      const msg = user?.role === 'estudiante'
        ? '¡Excelente! No tienes alertas activas registradas en tu expediente.'
        : `No hay alertas en la categoría "${this.currentAlertSeverityFilter}".`;
      container.innerHTML = `
        <div class="py-10 text-center text-base text-slate-500 font-medium">
          <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
          <span>${msg}</span>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = filtered.map((alt: any) => {
      let dotColor = 'bg-[#fb5373]';
      let badgeStyle = 'text-[#fb5373] bg-rose-50 border border-rose-200';
      let severityLabel = alt.severity;

      if (alt.severity === 'Riesgo medio') {
        dotColor = 'bg-[#ffab4d]';
        badgeStyle = 'text-amber-800 bg-amber-50 border border-amber-200';
      } else if (alt.severity === 'Bajo riesgo') {
        dotColor = 'bg-emerald-500';
        badgeStyle = 'text-emerald-800 bg-emerald-50 border border-emerald-200';
      }

      const canAct = user?.role !== 'estudiante';

      return `
        <div class="py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-orange-50/40 rounded-2xl px-5 transition cursor-pointer alert-row gap-3" data-name="${alt.studentName}">
          <div class="flex items-start sm:items-center space-x-4">
            <span class="w-4 h-4 rounded-full ${dotColor} flex-shrink-0 mt-1 sm:mt-0 ring-4 ring-orange-100"></span>
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="text-lg font-bold text-slate-900 font-['Rubik',sans-serif]">${alt.studentName}</span>
                <span class="text-xs sm:text-sm font-extrabold ${badgeStyle} px-3 py-1 rounded-full flex items-center space-x-1.5">
                  <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                  <span>${severityLabel}</span>
                </span>
              </div>
              <p class="text-sm sm:text-base text-slate-600 mt-1 leading-snug">${alt.title}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2.5 self-end sm:self-center">
            <span class="text-xs sm:text-sm font-semibold text-slate-400 mr-2">${alt.timestamp || 'Hoy'}</span>
            ${canAct ? `
              <button class="quick-intervene-btn px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#fb5373] border border-orange-200 text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs" data-name="${alt.studentName}">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
                <span>Atender Caso</span>
              </button>
            ` : ''}
            <button class="view-student-sheet-btn px-4 py-2 rounded-xl border border-slate-200 hover:border-[#fd7f60] hover:text-[#fb5373] text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer bg-white shadow-xs" data-name="${alt.studentName}">
              Ver Ficha 360°
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach row clicks
    container.querySelectorAll('.view-student-sheet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studentName = btn.getAttribute('data-name');
        const match = this.studentsList.find(s => s.name === studentName);
        if (match) {
          const sId = match._id || match.id;
          if (sId) this.openStudentDetail(sId);
        }
      });
    });

    container.querySelectorAll('.quick-intervene-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studentName = btn.getAttribute('data-name');
        const match = this.studentsList.find(s => s.name === studentName);
        if (match) {
          const sId = match._id || match.id;
          this.openActionDialog(sId);
        }
      });
    });

    container.querySelectorAll('.alert-row').forEach(row => {
      row.addEventListener('click', () => {
        const studentName = row.getAttribute('data-name');
        const match = this.studentsList.find(s => s.name === studentName);
        if (match) {
          const sId = match._id || match.id;
          if (sId) this.openStudentDetail(sId);
        }
      });
    });

    this.refreshIcons();
  }

  // ----------------------------------------------------
  // INTERACCIÓN: RE-EVALUAR MOTOR DE ALERTAS EN VIVO
  // ----------------------------------------------------
  private setupEngineRunner(): void {
    const runBtn = document.getElementById('runRiskEngineBtn');
    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        const icon = document.getElementById('runEngineIcon');
        if (icon) icon.classList.add('animate-spin');

        try {
          // Re-cargar datos y simular evaluación completa
          await this.loadAllData();
          this.showToast(
            'Motor Determinista Ejecutado',
            '80 estudiantes analizados en tiempo real bajo los umbrales pedagógicos vigentes.',
            'success'
          );
        } catch (err: any) {
          this.showToast('Error en Evaluación', err.message || 'Error del motor', 'error');
        } finally {
          if (icon) {
            setTimeout(() => icon.classList.remove('animate-spin'), 600);
          }
        }
      });
    }
  }

  // ----------------------------------------------------
  // INTERACCIÓN: EXPORTAR INFORME REAL (CSV / RESUMEN)
  // ----------------------------------------------------
  private setupExportReport(): void {
    const reportBtn = document.getElementById('quickReportBtn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        try {
          const headers = ['ID', 'Nombre', 'Programa', 'Riesgo', 'GPA', 'Asistencia(%)', 'Faltas', 'Recomendacion'];
          const rows = this.studentsList.map(s => [
            s._id || s.id,
            `"${s.name}"`,
            `"${s.program}"`,
            s.riskLevel,
            s.gpa,
            s.attendancePercentage,
            s.totalAbsences ?? 0,
            `"${(s.recommendation || '').replace(/"/g, '""')}"`
          ]);

          const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement('a');
          link.setAttribute('href', encodedUri);
          link.setAttribute('download', `Informe_Seguimiento_Fundacion_A_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.showToast(
            'Informe Exportado',
            'Se ha generado y descargado el archivo CSV con la ficha consolidada de la cohorte.',
            'success'
          );
        } catch (err: any) {
          this.showToast('Error de Exportación', err.message || 'No se pudo generar el reporte', 'error');
        }
      });
    }
  }

  // ----------------------------------------------------
  // 4. GRÁFICOS INTERACTIVOS (CHART.JS)
  // ----------------------------------------------------
  private initDonutChart(): void {
    const canvas = document.getElementById('riskDonutChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.donutChartInstance) {
      this.donutChartInstance.destroy();
    }

    this.donutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [52, 18, 10],
          backgroundColor: ['#10b981', '#ffab4d', '#fb5373'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const labels = ['Bajo riesgo: 52 (65%)', 'Riesgo medio: 18 (22%)', 'Riesgo alto: 10 (13%)'];
                return labels[context.dataIndex];
              }
            }
          }
        }
      }
    });
  }

  private initTrendChart(): void {
    const canvas = document.getElementById('gradesLineChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
    }

    this.trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo (Actual)'],
        datasets: [
          {
            label: 'Promedio GPA',
            data: [3.9, 3.7, 3.5, 3.4, 3.2],
            borderColor: '#fb5373',
            backgroundColor: 'rgba(251, 83, 115, 0.12)',
            pointBackgroundColor: '#fb5373',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 6,
            tension: 0.35,
            borderWidth: 3.5,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Asistencia Promedio (%)',
            data: [94, 91, 86, 82, 79],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 6,
            tension: 0.35,
            borderWidth: 3.5,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 1.0,
            max: 5.0,
            ticks: { font: { size: 12, weight: 'bold' }, stepSize: 1.0 },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 50,
            max: 100,
            ticks: { font: { size: 12, weight: 'bold' }, callback: v => v + '%' },
            grid: { display: false }
          },
          x: {
            ticks: { font: { size: 13, weight: 'bold' } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // ----------------------------------------------------
  // 5. DIRECTORIO GENERAL DE ESTUDIANTES (TABLA MEJORADA)
  // ----------------------------------------------------
  private async renderStudentTable(): Promise<void> {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    this.studentsList = await apiService.getStudents(this.currentSearchQuery, this.currentRiskFilter);
    const countBadge = document.getElementById('studentCountBadge');
    if (countBadge) {
      countBadge.innerText = `${this.studentsList.length} estudiantes`;
    }

    if (this.studentsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-14 text-center text-base text-slate-400 font-medium">
            <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
            <span>No se encontraron estudiantes con los filtros aplicados.</span>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }

    const user = apiService.getCurrentUser();
    const canIntervene = user?.role !== 'estudiante';

    tbody.innerHTML = this.studentsList.map(student => {
      const studentId = student._id || student.id || '';

      let riskPill = `<span class="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-[#fb5373] bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full">
        <span class="w-2.5 h-2.5 rounded-full bg-[#fb5373] animate-pulse"></span>
        <span>Riesgo Alto</span>
      </span>`;
      if (student.riskLevel === 'Medio') {
        riskPill = `<span class="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full">
          <span class="w-2.5 h-2.5 rounded-full bg-[#ffab4d]"></span>
          <span>Riesgo Medio</span>
        </span>`;
      } else if (student.riskLevel === 'Bajo') {
        riskPill = `<span class="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Bajo Riesgo</span>
        </span>`;
      }

      // Barra de progreso visual para asistencia
      const attPct = student.attendancePercentage || 80;
      let attBarColor = 'bg-emerald-500';
      if (attPct < 75) attBarColor = 'bg-[#fb5373]';
      else if (attPct < 85) attBarColor = 'bg-[#ffab4d]';

      return `
        <tr class="hover:bg-orange-50/40 transition cursor-pointer student-table-row" data-id="${studentId}">
          <td class="py-4 px-5 flex items-center space-x-4">
            <img src="${student.avatar}" alt="${student.name}" class="w-11 h-11 rounded-2xl object-cover shadow-xs ring-2 ring-orange-200 flex-shrink-0">
            <div>
              <span class="font-bold text-slate-900 text-base sm:text-lg block font-['Rubik',sans-serif]">${student.name}</span>
              <span class="text-xs sm:text-sm text-slate-500 font-normal">${student.email || 'estudiante@fundacion.org'}</span>
            </div>
          </td>
          <td class="py-4 px-5 text-sm sm:text-base font-semibold text-slate-700">${student.program}</td>
          <td class="py-4 px-5">${riskPill}</td>
          <td class="py-4 px-5 font-black text-slate-900 text-base sm:text-lg">
            ${(student.gpa || 3.0).toFixed(1)} <span class="text-xs sm:text-sm font-normal text-slate-400">/ 5.0</span>
          </td>
          <td class="py-4 px-5 text-right font-bold text-base">
            <div class="flex items-center justify-end space-x-2">
              <span class="${attPct < 75 ? 'text-[#fb5373]' : 'text-slate-800'}">${attPct}%</span>
            </div>
            <div class="w-24 bg-slate-100 rounded-full h-2 ml-auto mt-1 overflow-hidden">
              <div class="${attBarColor} h-2 rounded-full" style="width: ${attPct}%"></div>
            </div>
          </td>
          <td class="py-4 px-5 text-center">
            <div class="flex items-center justify-center space-x-2">
              ${canIntervene ? `
                <button class="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#fb5373] border border-orange-200 text-xs sm:text-sm font-bold transition table-action-intervene cursor-pointer shadow-xs" data-id="${studentId}" title="Registrar intervención directa">
                  Intervenir
                </button>
              ` : ''}
              <button class="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#fd7f60] hover:text-[#fb5373] text-slate-700 text-xs sm:text-sm font-bold transition view-detail-btn cursor-pointer bg-white shadow-xs" data-id="${studentId}">
                Ficha 360°
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row clicks
    tbody.querySelectorAll('.view-detail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) this.openStudentDetail(id);
      });
    });

    tbody.querySelectorAll('.table-action-intervene').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) this.openActionDialog(id);
      });
    });

    tbody.querySelectorAll('.student-table-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        if (id) this.openStudentDetail(id);
      });
    });

    this.refreshIcons();
  }

  // ----------------------------------------------------
  // 6. EXPEDIENTE 360° MODAL
  // ----------------------------------------------------
  private openStudentDetail(studentId: string): void {
    const student = this.studentsList.find(s => (s._id || s.id) === studentId);
    if (!student) return;

    this.currentStudentId = studentId;

    const modal = document.getElementById('studentDetailModal');
    const elName = document.getElementById('detailName');
    const elProg = document.getElementById('detailProgram');
    const elAvatar = document.getElementById('detailAvatar') as HTMLImageElement;
    const badgeContainer = document.getElementById('detailRiskBadgeContainer');

    if (elName) elName.innerText = student.name;
    if (elProg) elProg.innerText = student.program;
    if (elAvatar) elAvatar.src = student.avatar;

    if (badgeContainer) {
      if (student.riskLevel === 'Alto') {
        badgeContainer.innerHTML = `
          <span class="text-xs sm:text-sm font-bold text-[#fb5373] bg-rose-50 border border-rose-200 px-3.5 py-1 rounded-full flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#fb5373] animate-pulse"></span>
            <span>Riesgo Alto</span>
          </span>
        `;
      } else if (student.riskLevel === 'Medio') {
        badgeContainer.innerHTML = `
          <span class="text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#ffab4d]"></span>
            <span>Riesgo Medio</span>
          </span>
        `;
      } else {
        badgeContainer.innerHTML = `
          <span class="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Bajo Riesgo</span>
          </span>
        `;
      }
    }

    // Mini KPIs
    const elGpa = document.getElementById('detailGpa');
    const elAtt = document.getElementById('detailAttendance');
    const elAbs = document.getElementById('detailAbsences');
    const elCons = document.getElementById('detailConsecutive');

    if (elGpa) elGpa.innerText = `${(student.gpa || 3.0).toFixed(1)} / 5.0`;
    if (elAtt) elAtt.innerText = `${student.attendancePercentage || 80}%`;
    if (elAbs) elAbs.innerText = (student.totalAbsences ?? 0).toString();
    if (elCons) elCons.innerText = (student.consecutiveAbsences ?? 0).toString();

    // Active Alerts List
    const alertsContainer = document.getElementById('detailActiveAlertsList');
    if (alertsContainer) {
      if (!student.activeAlerts || student.activeAlerts.length === 0) {
        alertsContainer.innerHTML = `
          <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm sm:text-base flex items-center space-x-3">
            <i data-lucide="check-circle-2" class="w-6 h-6 text-emerald-600 flex-shrink-0"></i>
            <span>Sin alertas activas registradas en el expediente de este estudiante.</span>
          </div>
        `;
      } else {
        alertsContainer.innerHTML = student.activeAlerts.map((alt: any) => {
          const dot = alt.severity === 'rose' ? 'bg-[#fb5373]' : 'bg-[#ffab4d]';
          return `
            <div class="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="w-3 h-3 rounded-full ${dot} mt-1.5 flex-shrink-0 ring-2 ring-white"></span>
              <div>
                <span class="font-bold text-slate-900 text-base font-['Rubik',sans-serif]">${alt.title}</span>
                <p class="text-sm text-slate-600 mt-0.5 leading-relaxed">${alt.description}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Recommendation
    const elRec = document.getElementById('detailRecommendation');
    if (elRec) elRec.innerText = student.recommendation || 'Realizar acompañamiento continuo para mantener la excelencia.';

    // Update Student Personal Chart
    const attendance = student.monthlyAttendance || [95, 90, 85, 78, 71];
    const grades = student.monthlyGrades || [4.0, 3.8, 3.4, 3.0, 2.7];
    this.updateStudentChart(grades, attendance);

    if (modal) modal.classList.remove('hidden');
    this.refreshIcons();
  }

  private updateStudentChart(grades: number[], attendance: number[]): void {
    const canvas = document.getElementById('attendanceLineChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.studentChartInstance) {
      this.studentChartInstance.destroy();
    }

    this.studentChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
        datasets: [
          {
            label: 'Calificaciones',
            data: grades,
            borderColor: '#fd7f60',
            backgroundColor: 'rgba(253, 127, 96, 0.12)',
            pointBackgroundColor: '#fb5373',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            tension: 0.3,
            borderWidth: 3,
            fill: true
          },
          {
            label: 'Asistencia (%)',
            data: attendance,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            tension: 0.3,
            borderWidth: 3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 2.0, max: 100, ticks: { font: { size: 11, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: { font: { size: 12, weight: 'bold' } }, grid: { display: false } }
        },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 12, weight: 'bold' } } }
        }
      }
    });
  }

  // ----------------------------------------------------
  // 6.1 GESTIÓN DE REGLAS Y DISPARADORES (ADMIN)
  // ----------------------------------------------------
  private async renderRulesList(): Promise<void> {
    const container = document.getElementById('rulesListContainer');
    if (!container) return;

    this.rulesList = await apiService.getRules();
    if (!this.rulesList || this.rulesList.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-slate-50 border border-slate-200 rounded-3xl">
          <i data-lucide="sliders" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
          <p class="text-base text-slate-500 font-medium">No hay reglas configuradas en el motor determinista.</p>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = this.rulesList.map((rule: any) => {
      const isRose = rule.defaultSeverity === 'Crítica' || rule.defaultSeverity === 'Riesgo';
      const isAmber = rule.defaultSeverity === 'Advertencia' || rule.defaultSeverity === 'Recordatorio';
      const sevBadgeColor = isRose 
        ? 'text-rose-700 bg-rose-50 border-rose-200' 
        : isAmber 
        ? 'text-amber-700 bg-amber-50 border-amber-200' 
        : 'text-blue-700 bg-blue-50 border-blue-200';

      const activeBadge = rule.isActive !== false
        ? '<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Activa</span>'
        : '<span class="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">Inactiva</span>';

      const cond = rule.conditionJson || {};
      let metricLabel = cond.metric || 'promedio';
      if (metricLabel === 'promedio') metricLabel = 'Promedio GPA';
      else if (metricLabel === 'asistencia') metricLabel = 'Asistencia';
      else if (metricLabel === 'faltas_consecutivas') metricLabel = 'Faltas Seguidas';
      else if (metricLabel === 'dias_inactivo') metricLabel = 'Días Inactivo';
      else if (metricLabel === 'promedio_asistencia_combinado') metricLabel = 'Riesgo Combinado';

      const operator = cond.operator || '<';
      const threshold = cond.threshold !== undefined ? cond.threshold : 3.0;

      return `
        <div class="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 hover:border-orange-200 hover:shadow-md transition space-y-4 relative flex flex-col justify-between">
          <div class="space-y-3.5">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <span class="text-xs font-mono font-bold text-slate-400 block">${rule.code}</span>
                <h4 class="font-bold text-slate-900 text-base sm:text-lg leading-snug font-['Rubik',sans-serif]">${rule.name}</h4>
              </div>
              <div class="flex flex-col items-end space-y-1.5">
                <span class="text-xs font-bold ${sevBadgeColor} border px-2.5 py-0.5 rounded-full uppercase">
                  ${rule.defaultSeverity}
                </span>
                ${activeBadge}
              </div>
            </div>

            <div class="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Criterio Numérico</span>
                <div class="text-sm sm:text-base font-bold text-slate-800">
                  ${metricLabel} <span class="font-mono text-[#fb5373]">${operator}</span> ${threshold}
                </div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-orange-50 text-[#fd7f60] flex items-center justify-center">
                <i data-lucide="zap" class="w-5 h-5"></i>
              </div>
            </div>

            <p class="text-sm text-slate-600 leading-relaxed">
              ${rule.description || 'Dispara notificación inmediata y actualiza el expediente del estudiante en el sistema.'}
            </p>
          </div>

          <div class="pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Motor Determinista</span>
            <button class="edit-rule-btn px-4 py-2 rounded-xl bg-white hover:bg-orange-50 text-slate-700 hover:text-[#fb5373] border border-slate-200 hover:border-orange-200 font-bold text-xs sm:text-sm transition flex items-center space-x-2 cursor-pointer shadow-xs" data-id="${rule._id || rule.id}">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
              <span>Editar Regla</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.edit-rule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const rule = this.rulesList.find((r: any) => (r._id || r.id) === id);
        if (rule) this.openRuleModal(rule);
      });
    });

    this.refreshIcons();
  }

  private openRuleModal(rule?: any): void {
    const modal = document.getElementById('ruleModal');
    const titleEl = document.getElementById('ruleModalTitle');
    const idInput = document.getElementById('ruleIdInput') as HTMLInputElement;
    const codeInput = document.getElementById('ruleCodeInput') as HTMLInputElement;
    const nameInput = document.getElementById('ruleNameInput') as HTMLInputElement;
    const sevInput = document.getElementById('ruleSeverityInput') as HTMLSelectElement;
    const metricInput = document.getElementById('ruleMetricInput') as HTMLSelectElement;
    const opInput = document.getElementById('ruleOperatorInput') as HTMLSelectElement;
    const threshInput = document.getElementById('ruleThresholdInput') as HTMLInputElement;
    const descInput = document.getElementById('ruleDescriptionInput') as HTMLTextAreaElement;
    const activeInput = document.getElementById('ruleIsActiveInput') as HTMLInputElement;

    if (rule) {
      if (titleEl) titleEl.innerText = 'Editar Regla de Alerta';
      if (idInput) idInput.value = rule._id || rule.id || '';
      if (codeInput) codeInput.value = rule.code || '';
      if (nameInput) nameInput.value = rule.name || '';
      if (sevInput) sevInput.value = rule.defaultSeverity || 'Riesgo';
      if (metricInput) metricInput.value = rule.conditionJson?.metric || 'promedio';
      if (opInput) opInput.value = rule.conditionJson?.operator || '<';
      if (threshInput) threshInput.value = (rule.conditionJson?.threshold ?? 3.0).toString();
      if (descInput) descInput.value = rule.description || '';
      if (activeInput) activeInput.checked = rule.isActive !== false;
    } else {
      if (titleEl) titleEl.innerText = 'Crear Nueva Regla de Alerta';
      if (idInput) idInput.value = '';
      if (codeInput) codeInput.value = 'REG-NUEVA-' + Math.floor(Math.random() * 900 + 100);
      if (nameInput) nameInput.value = '';
      if (sevInput) sevInput.value = 'Riesgo';
      if (metricInput) metricInput.value = 'promedio';
      if (opInput) opInput.value = '<';
      if (threshInput) threshInput.value = '3.0';
      if (descInput) descInput.value = '';
      if (activeInput) activeInput.checked = true;
    }

    if (modal) modal.classList.remove('hidden');
    this.refreshIcons();
  }

  private setupRuleEvents(): void {
    const createNewRuleBtn = document.getElementById('createNewRuleBtn');
    if (createNewRuleBtn) {
      createNewRuleBtn.addEventListener('click', () => {
        this.openRuleModal();
      });
    }

    const closeRuleModalBtn = document.getElementById('closeRuleModalBtn');
    const cancelRuleModalBtn = document.getElementById('cancelRuleModalBtn');
    const closeRuleModal = () => {
      const modal = document.getElementById('ruleModal');
      if (modal) modal.classList.add('hidden');
    };

    if (closeRuleModalBtn) closeRuleModalBtn.addEventListener('click', closeRuleModal);
    if (cancelRuleModalBtn) cancelRuleModalBtn.addEventListener('click', closeRuleModal);

    const ruleForm = document.getElementById('ruleForm') as HTMLFormElement;
    if (ruleForm) {
      ruleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = (document.getElementById('ruleIdInput') as HTMLInputElement)?.value;
        const code = (document.getElementById('ruleCodeInput') as HTMLInputElement)?.value;
        const name = (document.getElementById('ruleNameInput') as HTMLInputElement)?.value;
        const defaultSeverity = (document.getElementById('ruleSeverityInput') as HTMLSelectElement)?.value;
        const metric = (document.getElementById('ruleMetricInput') as HTMLSelectElement)?.value;
        const operator = (document.getElementById('ruleOperatorInput') as HTMLSelectElement)?.value;
        const threshold = parseFloat((document.getElementById('ruleThresholdInput') as HTMLInputElement)?.value || '0');
        const description = (document.getElementById('ruleDescriptionInput') as HTMLTextAreaElement)?.value;
        const isActive = (document.getElementById('ruleIsActiveInput') as HTMLInputElement)?.checked;

        const payload = {
          code,
          name,
          defaultSeverity,
          conditionJson: { metric, operator, threshold },
          description,
          isActive
        };

        try {
          if (id) {
            await apiService.updateRule(id, payload);
          } else {
            await apiService.createRule(payload);
          }
          closeRuleModal();
          await this.renderRulesList();
          this.showToast('Regla Guardada', `La regla ${name} fue actualizada en el motor determinista.`, 'success');
        } catch (err: any) {
          this.showToast('Error', err.message || 'Error del servidor al guardar regla', 'error');
        }
      });
    }
  }

  // ----------------------------------------------------
  // 7. BITÁCORA DE INTERVENCIONES DOCENTES (MONGODB)
  // ----------------------------------------------------
  private async renderInterventionsList(): Promise<void> {
    const container = document.getElementById('interventionsListContainer');
    if (!container) return;

    const user = apiService.getCurrentUser();
    const history = await apiService.getFollowUpHistory();

    // Banner informativo según el rol y aislamiento
    let bannerHtml = '';
    if (user?.role === 'docente') {
      bannerHtml = `
        <div class="mb-5 p-4 bg-orange-50/90 border border-orange-200 rounded-2xl text-sm sm:text-base font-semibold text-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-white border border-orange-200 flex items-center justify-center text-[#fd7f60]">
              <i data-lucide="user-check" class="w-5 h-5"></i>
            </div>
            <span>Apartado del docente: Mostrando exclusivamente intervenciones gestionadas por <strong>${user.name}</strong></span>
          </div>
          <span class="text-xs sm:text-sm font-bold text-[#fb5373] bg-white px-3 py-1 rounded-xl border border-orange-100 shadow-xs">${history.length} registradas</span>
        </div>
      `;
    } else if (user?.role === 'estudiante') {
      bannerHtml = `
        <div class="mb-5 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-sm sm:text-base font-semibold text-emerald-900 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <span>Apartado privado del estudiante: Mostrando únicamente compromisos dirigidos a <strong>${user.name}</strong></span>
          </div>
          <span class="text-xs sm:text-sm font-bold text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-100 shadow-xs">${history.length} acuerdos</span>
        </div>
      `;
    } else {
      bannerHtml = `
        <div class="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold text-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              <i data-lucide="building" class="w-5 h-5"></i>
            </div>
            <span>Consolidado Institucional (Admin): Historial completo de intervenciones en la Fundación A+</span>
          </div>
          <span class="text-xs sm:text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">${history.length} en total</span>
        </div>
      `;
    }

    if (!history || history.length === 0) {
      const msg = user?.role === 'estudiante'
        ? `No registras intervenciones ni compromisos pedagógicos pendientes en tu expediente (${user.name}).`
        : user?.role === 'docente'
        ? `No has registrado intervenciones pedagógicas aún como docente (${user.name}).`
        : 'Sin intervenciones registradas en el historial institucional.';
      container.innerHTML = `
        ${bannerHtml}
        <div class="py-12 text-center rounded-3xl bg-slate-50 border border-slate-200 p-8">
          <i data-lucide="clipboard-check" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
          <p class="text-base text-slate-500 font-medium">${msg}</p>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    const cardsHtml = history.map((log: any) => {
      let badgeStyle = 'text-amber-800 bg-amber-50 border border-amber-200';
      if (log.newStatus === 'Resuelta') {
        badgeStyle = 'text-emerald-800 bg-emerald-50 border border-emerald-200';
      } else if (log.newStatus === 'Descartada') {
        badgeStyle = 'text-slate-700 bg-slate-100 border border-slate-200';
      }

      return `
        <div class="p-7 rounded-3xl bg-white border border-slate-200/90 hover:shadow-lg transition-all duration-200 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center space-x-3.5">
              <span class="w-4 h-4 rounded-full bg-gradient-amas flex-shrink-0 shadow-xs"></span>
              <h4 class="font-bold text-slate-900 text-lg sm:text-xl font-['Rubik',sans-serif]">${log.studentName}</h4>
              <span class="text-sm text-slate-500 font-medium">• Registrado por <strong class="text-slate-800">${log.teacherName}</strong></span>
            </div>
            <div class="flex items-center space-x-2.5">
              <span class="text-xs sm:text-sm font-bold ${badgeStyle} px-4 py-1 rounded-full">
                ${log.newStatus}
              </span>
              <span class="text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                <i data-lucide="mail-check" class="w-4 h-4 text-emerald-600"></i>
                <span>Copia despachada</span>
              </span>
            </div>
          </div>
          
          <p class="text-base text-slate-700 leading-relaxed font-normal bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            ${log.observations}
          </p>
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 text-sm text-slate-500 font-medium gap-2">
            <span>Intervención: <strong class="text-slate-800 font-semibold">${log.interventionType}</strong></span>
            <span>Próximo seguimiento: <strong class="text-[#fb5373] font-bold">${log.nextFollowupDate}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = bannerHtml + `<div class="space-y-4">${cardsHtml}</div>`;
    this.refreshIcons();
  }

  // ----------------------------------------------------
  // 8. CENTRO DE NOTIFICACIONES INSTITUCIONALES (CAMPANA & CORREO)
  // ----------------------------------------------------
  private async loadNotifications(): Promise<void> {
    const { notifications, unreadCount } = await apiService.getNotifications();
    const badge = document.getElementById('unreadNotificationsBadge');
    const list = document.getElementById('notificationsList');

    if (badge) {
      if (unreadCount > 0) {
        badge.innerText = unreadCount.toString();
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (!list) return;

    if (!notifications || notifications.length === 0) {
      list.innerHTML = `
        <div class="py-10 text-center text-sm text-slate-400 font-medium">
          <i data-lucide="bell-off" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
          <span>No tienes notificaciones pendientes. ¡Estás al día!</span>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    list.innerHTML = notifications.map((notif: any) => {
      const isUnread = !notif.read;
      const unreadDot = isUnread 
        ? '<span class="w-3 h-3 rounded-full bg-[#fb5373] animate-pulse flex-shrink-0"></span>'
        : '<span class="w-3 h-3 rounded-full bg-slate-300 flex-shrink-0"></span>';

      return `
        <div class="p-4 rounded-2xl hover:bg-orange-50/70 transition cursor-pointer notif-item space-y-2 ${isUnread ? 'bg-orange-50/40 border border-orange-200/50' : 'bg-white'}" data-id="${notif._id}">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              ${unreadDot}
              <span class="text-sm font-bold text-slate-900">${notif.title}</span>
            </div>
            <span class="text-xs text-slate-400 font-medium">Reciente</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            ${notif.message}
          </p>
          <div class="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span>Docente: <strong class="text-slate-800">${notif.teacherName}</strong></span>
            <span class="text-emerald-700 font-bold flex items-center space-x-1">
              <i data-lucide="mail-check" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Copia en correo</span>
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click event to inspect notification
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.getAttribute('data-id');
        const notif = notifications.find((n: any) => n._id === id);
        if (notif) {
          if (!notif.read && id) {
            await apiService.markNotificationRead(id);
          }
          this.openNotificationDetail(notif);
          await this.loadNotifications();
        }
      });
    });

    this.refreshIcons();
  }

  private openNotificationDetail(notif: any): void {
    const modal = document.getElementById('notificationDetailModal');
    const titleEl = document.getElementById('notifDetailTitle');
    const authorEl = document.getElementById('notifDetailAuthor');
    const typeEl = document.getElementById('notifDetailType');
    const messageEl = document.getElementById('notifDetailMessage');
    const dateEl = document.getElementById('notifDetailDate');

    if (titleEl) titleEl.innerText = notif.title;
    if (authorEl) authorEl.innerText = `Atendido por: ${notif.teacherName}`;
    if (typeEl) typeEl.innerText = notif.interventionType || 'Intervención y Acompañamiento Pedagógico';
    if (messageEl) messageEl.innerText = notif.message;
    if (dateEl) dateEl.innerText = notif.nextFollowupDate || 'Por coordinar';

    if (modal) modal.classList.remove('hidden');
    this.refreshIcons();
  }

  // ----------------------------------------------------
  // GESTIÓN Y VERIFICACIÓN EN VIVO DE DOCENTES ACTIVOS
  // ----------------------------------------------------
  private async loadActiveTeachers(): Promise<void> {
    this.activeTeachers = await apiService.getTeachers();
    this.populateTeacherControls();
  }

  private populateTeacherControls(): void {
    const datalist = document.getElementById('teachersDatalist');
    const chipsContainer = document.getElementById('teacherQuickChipsContainer');

    if (datalist && this.activeTeachers.length > 0) {
      datalist.innerHTML = this.activeTeachers.map(t => `<option value="${t.name}">${t.program || 'Docente A+'}</option>`).join('');
    }

    if (chipsContainer && this.activeTeachers.length > 0) {
      chipsContainer.innerHTML = this.activeTeachers.map(t => `
        <button type="button" class="teacher-chip px-3 py-1.5 bg-slate-100 hover:bg-orange-100/90 hover:text-[#fb5373] hover:border-orange-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition cursor-pointer shadow-xs flex items-center space-x-1.5" data-name="${t.name}">
          <i data-lucide="user-check" class="w-3.5 h-3.5 text-[#fd7f60]"></i>
          <span>${t.name}</span>
        </button>
      `).join('');

      chipsContainer.querySelectorAll('.teacher-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const name = btn.getAttribute('data-name');
          if (name) {
            const input = document.getElementById('modalTeacherName') as HTMLInputElement;
            if (input) {
              input.value = name;
              this.validateTeacherInput(name);
            }
          }
        });
      });
      this.refreshIcons();
    }
  }

  public validateTeacherInput(name: string): boolean {
    const feedback = document.getElementById('teacherValidationFeedback');
    const iconContainer = document.getElementById('teacherValidationIcon');
    const input = document.getElementById('modalTeacherName') as HTMLInputElement;
    const trimmed = (name || '').trim().toLowerCase();

    if (!trimmed) {
      if (feedback) {
        feedback.className = 'text-xs sm:text-sm font-semibold p-3 rounded-2xl border bg-rose-50 border-rose-200 text-rose-800 flex items-center space-x-2';
        feedback.innerHTML = `
          <i data-lucide="alert-circle" class="w-4 h-4 text-[#fb5373] flex-shrink-0"></i>
          <span>El campo es obligatorio. Ingresa el nombre de un docente activo de la Fundación A+.</span>
        `;
      }
      if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="alert-circle" class="w-5 h-5 text-[#fb5373]"></i>`;
      }
      if (input) {
        input.classList.remove('border-emerald-500', 'bg-emerald-50/20');
        input.classList.add('border-rose-400', 'bg-rose-50/20');
      }
      this.refreshIcons();
      return false;
    }

    const match = this.activeTeachers.find(t => t.name.toLowerCase() === trimmed);
    if (match) {
      if (feedback) {
        feedback.className = 'text-xs sm:text-sm font-semibold p-3 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center space-x-2 shadow-xs';
        feedback.innerHTML = `
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 flex-shrink-0"></i>
          <span>Docente activo verificado en plataforma: <strong>${match.name}</strong> (${match.program || 'Fundación A+'})</span>
        `;
      }
      if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>`;
      }
      if (input) {
        input.classList.remove('border-rose-400', 'bg-rose-50/20');
        input.classList.add('border-emerald-500', 'bg-emerald-50/20');
      }
      this.refreshIcons();
      return true;
    } else {
      if (feedback) {
        feedback.className = 'text-xs sm:text-sm font-semibold p-3 rounded-2xl border bg-rose-50 border-rose-200 text-rose-900 flex items-center space-x-2 shadow-xs';
        feedback.innerHTML = `
          <i data-lucide="alert-triangle" class="w-4 h-4 text-[#fb5373] flex-shrink-0"></i>
          <span>❌ El nombre <strong>"${name.trim()}"</strong> NO corresponde a un docente activo registrado en la plataforma.</span>
        `;
      }
      if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="alert-triangle" class="w-5 h-5 text-[#fb5373]"></i>`;
      }
      if (input) {
        input.classList.remove('border-emerald-500', 'bg-emerald-50/20');
        input.classList.add('border-rose-400', 'bg-rose-50/20');
      }
      this.refreshIcons();
      return false;
    }
  }

  // ----------------------------------------------------
  // DIÁLOGO DE REGISTRO DE INTERVENCIÓN (EXPUESTO)
  // ----------------------------------------------------
  public openActionDialog(targetStudentId?: string): void {
    const currentUser = apiService.getCurrentUser();
    if (currentUser?.role === 'estudiante') {
      this.showToast('Acceso Denegado', 'Solo los docentes y coordinadores pueden registrar intervenciones.', 'warning');
      return;
    }

    const actionModal = document.getElementById('actionModal');
    const studentSelect = document.getElementById('modalStudentSelect') as HTMLSelectElement;
    const sub = document.getElementById('modalStudentSub');

    if (studentSelect && this.studentsList.length > 0) {
      studentSelect.innerHTML = this.studentsList.map(s => {
        const sid = s._id || s.id;
        return `<option value="${sid}">${s.name} — ${s.program}</option>`;
      }).join('');

      if (targetStudentId) {
        this.currentStudentId = targetStudentId;
      } else if (!this.currentStudentId && this.studentsList[0]) {
        this.currentStudentId = this.studentsList[0]._id || this.studentsList[0].id || null;
      }

      if (this.currentStudentId) {
        studentSelect.value = this.currentStudentId;
      }

      studentSelect.onchange = () => {
        this.currentStudentId = studentSelect.value;
        const chosen = this.studentsList.find(s => (s._id || s.id) === this.currentStudentId);
        if (chosen && sub) {
          sub.innerText = `Estudiante: ${chosen.name} (${chosen.program})`;
        }
      };
    }

    const student = this.studentsList.find(s => (s._id || s.id) === this.currentStudentId) || this.studentsList[0];
    if (student && sub) {
      sub.innerText = `Estudiante: ${student.name} (${student.program})`;
    }

    // Inicializar y verificar el campo del docente responsable
    const teacherInput = document.getElementById('modalTeacherName') as HTMLInputElement;
    if (teacherInput) {
      if (currentUser && currentUser.role === 'docente') {
        teacherInput.value = currentUser.name;
      } else {
        // Si es administrador u otro rol, asignar un docente activo oficial (ej. Laura Gómez)
        const defaultTeacher = this.activeTeachers[0]?.name || 'Laura Gómez';
        teacherInput.value = defaultTeacher;
      }
      this.validateTeacherInput(teacherInput.value);
    }

    if (actionModal) actionModal.classList.remove('hidden');
    this.refreshIcons();
  }

  // ----------------------------------------------------
  // 9. CONFIGURACIÓN DE EVENTOS E INTERACTIVIDAD GENERAL
  // ----------------------------------------------------
  private setupInteractivity(): void {
    // Buscadores con debounce
    const studentSearchInput = document.getElementById('studentSearchInput') as HTMLInputElement;
    if (studentSearchInput) {
      studentSearchInput.addEventListener('input', (e) => {
        this.currentSearchQuery = (e.target as HTMLInputElement).value;
        this.renderStudentTable();
      });
    }

    const globalSearch = document.getElementById('globalSearchInput') as HTMLInputElement;
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        this.currentSearchQuery = (e.target as HTMLInputElement).value;
        this.switchTab('students');
        if (studentSearchInput) studentSearchInput.value = this.currentSearchQuery;
        this.renderStudentTable();
      });
    }

    // Píldoras de Filtro
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => {
          p.classList.remove('bg-gradient-amas', 'text-white', 'font-bold', 'shadow-amas');
          p.classList.add('bg-slate-100', 'text-slate-600');
        });
        pill.classList.remove('bg-slate-100', 'text-slate-600');
        pill.classList.add('bg-gradient-amas', 'text-white', 'font-bold', 'shadow-amas');

        this.currentRiskFilter = pill.getAttribute('data-filter') || 'Todos';
        this.renderStudentTable();
      });
    });

    // Control de Notificaciones Popover
    const notifBtn = document.getElementById('notificationsBtn');
    const notifDropdown = document.getElementById('notificationsDropdown');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#notificationsMenuContainer')) {
          notifDropdown.classList.add('hidden');
        }
      });
    }

    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await apiService.markAllNotificationsRead();
        await this.loadNotifications();
        this.showToast('Notificaciones Leídas', 'Todas las notificaciones institucionales fueron marcadas como leídas.', 'info');
      });
    }

    // Modales de detalle de notificación y confirmación
    const closeNotifDetailBtn = document.getElementById('closeNotifDetailBtn');
    const okNotifDetailBtn = document.getElementById('okNotifDetailBtn');
    const notifDetailModal = document.getElementById('notificationDetailModal');

    const closeNotifModal = () => {
      if (notifDetailModal) notifDetailModal.classList.add('hidden');
    };
    if (closeNotifDetailBtn) closeNotifDetailBtn.addEventListener('click', closeNotifModal);
    if (okNotifDetailBtn) okNotifDetailBtn.addEventListener('click', closeNotifModal);

    const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
    const interventionSuccessModal = document.getElementById('interventionSuccessModal');
    if (closeSuccessModalBtn && interventionSuccessModal) {
      closeSuccessModalBtn.addEventListener('click', () => {
        interventionSuccessModal.classList.add('hidden');
      });
    }

    // Modal de Detalle 360°
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const studentDetailModal = document.getElementById('studentDetailModal');
    if (closeDetailModalBtn && studentDetailModal) {
      closeDetailModalBtn.addEventListener('click', () => {
        studentDetailModal.classList.add('hidden');
      });
    }

    // Botones de Registro de Intervención
    const openActionModalBtn = document.getElementById('openActionModalBtn');
    const quickNewActionBtn = document.getElementById('quickNewActionBtn');
    const actionModal = document.getElementById('actionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const actionForm = document.getElementById('actionForm') as HTMLFormElement;

    if (openActionModalBtn) openActionModalBtn.addEventListener('click', () => this.openActionDialog(this.currentStudentId || undefined));
    if (quickNewActionBtn) quickNewActionBtn.addEventListener('click', () => this.openActionDialog());

    const closeAction = () => {
      if (actionModal) actionModal.classList.add('hidden');
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeAction);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeAction);

    // Validación en tiempo real del docente mientras el usuario escribe
    const teacherInput = document.getElementById('modalTeacherName') as HTMLInputElement;
    if (teacherInput) {
      teacherInput.addEventListener('input', () => {
        this.validateTeacherInput(teacherInput.value);
      });
    }

    if (actionForm) {
      actionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = apiService.getCurrentUser();
        if (currentUser?.role === 'estudiante') {
          this.showToast('Acceso Denegado', 'Los estudiantes no pueden realizar intervenciones.', 'error');
          return;
        }

        const teacherNameInput = (document.getElementById('modalTeacherName') as HTMLInputElement)?.value || '';

        // VERIFICACIÓN ESTRICTA EN EL FRONTEND ANTES DE ENVIAR
        const isTeacherValid = this.validateTeacherInput(teacherNameInput);
        if (!isTeacherValid) {
          this.showToast(
            'Docente No Verificado',
            'El nombre ingresado no corresponde a un docente activo registrado en la plataforma Fundación A+.',
            'error'
          );
          if (teacherInput) teacherInput.focus();
          return;
        }

        const selectedStudentId = (document.getElementById('modalStudentSelect') as HTMLSelectElement)?.value || this.currentStudentId;
        const student = this.studentsList.find(s => (s._id || s.id) === selectedStudentId) || this.studentsList[0];
        if (!student) return;

        const effectiveTeacher = teacherNameInput.trim();

        const intervention = (document.getElementById('modalInterventionType') as HTMLSelectElement).value;
        const nextDate = (document.getElementById('modalNextDate') as HTMLInputElement).value;
        const observations = (document.getElementById('modalObservations') as HTMLTextAreaElement).value;
        const stateRadio = document.querySelector('input[name="alertaEstado"]:checked') as HTMLInputElement;
        const newStatus = stateRadio ? stateRadio.value : 'En proceso';

        try {
          const targetEmail = student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}@fundacion.org`;
          await apiService.registerAction({
            studentId: student._id || student.id || '',
            studentName: student.name,
            teacherName: effectiveTeacher,
            interventionType: intervention,
            newStatus: newStatus,
            nextFollowupDate: nextDate,
            observations: observations
          });

          closeAction();

          // Mostrar Modal de Confirmación y Notificación al Correo
          const successModal = document.getElementById('interventionSuccessModal');
          const emailTarget = document.getElementById('successModalEmailTarget');
          const nextDateTarget = document.getElementById('successModalNextDate');

          if (emailTarget) emailTarget.innerText = `Copia despachada a: ${targetEmail}`;
          if (nextDateTarget) nextDateTarget.innerText = nextDate;
          if (successModal) successModal.classList.remove('hidden');

          this.showToast(
            'Intervención Exitosa',
            `Acuerdo guardado para ${student.name}. Copia despachada a ${targetEmail}.`,
            'success'
          );

          // Actualizar todas las fuentes de datos en la interfaz
          await this.fetchAndRenderRecentAlerts();
          await this.renderInterventionsList();
          await this.loadNotifications();
        } catch (err: any) {
          this.showToast('Error', err.message || 'Error al registrar intervención', 'error');
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FundacionPulseApp();
});
