const fs = require('fs');

const fnsToCheck = [
  'seedIfEmpty',
  'updateMemorandosBadge',
  'permisoUsuarioSobrePanel',
  'initTablesEnPanel',
  'renderSolicitarEquipoForm',
  'expandirFotoPerfil',
  'calcularNotaFinal',
  'calificacionCualitativa',
  'actualizarHeaderUsuario',
  'fechaHoyLocal',
  'docenteEstudiantesDeCohorte',
  'sincronizarAusentesSesion',
  'minutosTranscurridos',
  'abrirModalVisorJustificacion',
  'abrirModalJustificarAsistencia',
  'estadoVentanaSesion',
  'validarTokenSesionConGracia',
  'estadoPorTiempo',
  'uid',
  'letraEscalaNota',
  'colorCualitativa',
  'mesActualParaDocenteCohorte',
  'getSlotsDocente',
  'cambiarCalifMesEstudiante',
  'docentesDeCohorte',
  'franjasActivas',
  'minutosDesdeHora',
  'horasFranja',
  'mesLabel',
  'verArchivoPensum',
  'verMemorandoEstudiante',
  'memorandosParaUsuarioActual',
  'verMemorandoUsuarioActual',
  'leerArchivoComoDataURL',
  'renderNotificacionesEstudiante',
  'renderMisProyectosEstudiante'
];

const files = fs.readdirSync('.').filter(f => f.endsWith('.js'));

const results = {};
for (const fn of fnsToCheck) {
  results[fn] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.match(new RegExp(`(?:function\\s+${fn}\\b|window\\.${fn}\\s*=|const\\s+${fn}\\s*=|let\\s+${fn}\\s*=)`))) {
        results[fn].push(`${file}:${idx+1}`);
      }
    });
  }
}

for (const [fn, locs] of Object.entries(results)) {
  console.log(`${fn}: ${locs.length ? locs.join(', ') : 'NOT FOUND ANYWHERE!'}`);
}
