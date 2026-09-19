const { spawn } = require('child_process');
const os = require('os');

// Obtener dirección IPv4 local activa de la red
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const PORT = process.env.PORT || 8000;
const localIP = getLocalIP();

console.clear();
console.log('================================================================');
console.log('         SERVIDOR FUNDACIÓN A+ — ACCESO LOCAL Y EN RED          ');
console.log('================================================================');
console.log('');
console.log(`  🖥️  Desde esta computadora:`);
console.log(`      http://localhost:${PORT}`);
console.log('');
console.log(`  📱  Desde tu celular u otros dispositivos en la misma red WiFi:`);
console.log(`      http://${localIP}:${PORT}`);
console.log('');
console.log('  ⚠️  Nota: Asegúrate de tener MySQL activo en XAMPP para la BD.');
console.log('  Presiona Ctrl + C para detener el servidor.');
console.log('================================================================\n');

// Iniciar servidor PHP integrado con router.php
const php = spawn('php', ['-S', `0.0.0.0:${PORT}`, 'router.php'], { stdio: 'inherit' });

php.on('error', (err) => {
  console.error('❌ Error al iniciar el servidor PHP:', err.message);
  console.log('Asegúrate de que PHP esté instalado y disponible en la consola.');
});

php.on('close', (code) => {
  console.log(`Servidor detenido con código: ${code}`);
});
