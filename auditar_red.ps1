$ErrorActionPreference = 'SilentlyContinue'

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       AUDITORIA DE ACCESO EN RED LOCAL - FUNDACION A+" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- 1. DIRECCIONES IP Y ADAPTADORES ---" -ForegroundColor Cyan
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }
foreach ($a in $adapters) {
    $desc = (Get-NetAdapter -InterfaceIndex $a.InterfaceIndex -ErrorAction SilentlyContinue).InterfaceDescription
    $isVirt = ($desc -match 'VirtualBox|VMware|Hyper-V|Virtual') -or ($a.IPAddress -like '192.168.56.*') -or ($a.IPAddress -like '169.254.*')
    if ($isVirt) {
        Write-Host " [!] $($a.InterfaceAlias) ($($a.IPAddress)) -> ADAPTADOR VIRTUAL (No usar en otra PC)" -ForegroundColor DarkGray
    } else {
        Write-Host " [+] $($a.InterfaceAlias) ($($a.IPAddress)) -> IP REAL PARA OTRAS PC" -ForegroundColor Green
    }
}

$mainIp = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1 | Get-NetIPAddress -AddressFamily IPv4).IPAddress
Write-Host "`n [+] IP Activa recomendada para compartir: $mainIp" -ForegroundColor Yellow

Write-Host "`n--- 2. PERFIL DE RED ACTUAL ---" -ForegroundColor Cyan
$profile = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' -or $_.InterfaceAlias -match 'Wi-Fi' } | Select-Object -First 1
if ($profile) {
    if ($profile.NetworkCategory -eq 'Private') {
        Write-Host " [+] Red actual: $($profile.Name) (Modo: Privada - Correcto para compartir)" -ForegroundColor Green
    } else {
        Write-Host " [-] Red actual: $($profile.Name) (Modo: Publica - Puede bloquear conexiones entrantes)" -ForegroundColor Red
        Write-Host "     Sugerencia: Ejecuta 'abrir_puerto_firewall.bat' para cambiar a Privada." -ForegroundColor Yellow
    }
} else {
    Write-Host " [?] No se detecto perfil activo" -ForegroundColor Yellow
}

Write-Host "`n--- 3. PUERTOS EN ESCUCHA EN ESTA MAQUINA ---" -ForegroundColor Cyan
$p8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$p8001 = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
$p80   = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
$p3306 = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue

if ($p8000) { Write-Host " [+] Puerto 8000 (Servidor Web PHP): ACTIVO Y ESCUCHANDO" -ForegroundColor Green }
else { Write-Host " [-] Puerto 8000 (Web PHP): INACTIVO (Inicia con iniciar_servidor.bat)" -ForegroundColor Red }

if ($p8001) { Write-Host " [+] Puerto 8001 (Chat IA FastAPI): ACTIVO Y ESCUCHANDO" -ForegroundColor Green }
else { Write-Host " [-] Puerto 8001 (Chat IA): INACTIVO" -ForegroundColor Yellow }

if ($p80)   { Write-Host " [+] Puerto 80 (Apache XAMPP): ACTIVO" -ForegroundColor Green }
else { Write-Host " [i] Puerto 80 (Apache): Inactivo" -ForegroundColor DarkGray }

if ($p3306) { Write-Host " [+] Puerto 3306 (MySQL): ACTIVO" -ForegroundColor Green }
else { Write-Host " [-] Puerto 3306 (MySQL): INACTIVO (Inicia MySQL en XAMPP)" -ForegroundColor Red }

Write-Host "`n--- 4. REGLAS EN EL FIREWALL DE WINDOWS ---" -ForegroundColor Cyan
$fw8000 = Get-NetFirewallRule | Where-Object { $_.DisplayName -eq 'Servidor Fundacion A+ (Puerto 8000)' -and $_.Enabled -eq 'True' }
$fw8001 = Get-NetFirewallRule | Where-Object { $_.DisplayName -eq 'Servidor Chat IA Fundacion A+ (Puerto 8001)' -and $_.Enabled -eq 'True' }
$fwPhp  = Get-NetFirewallRule | Where-Object { $_.DisplayName -match 'PHP' -and $_.Enabled -eq 'True' }

if ($fw8000) { Write-Host " [+] Regla Firewall Puerto 8000: PERMITIDA" -ForegroundColor Green }
else { Write-Host " [-] Regla Firewall Puerto 8000: NO ENCONTRADA (Bloquea a otras PC)" -ForegroundColor Red }

if ($fw8001) { Write-Host " [+] Regla Firewall Puerto 8001: PERMITIDA" -ForegroundColor Green }
else { Write-Host " [-] Regla Firewall Puerto 8001: NO ENCONTRADA (Bloquea a otras PC)" -ForegroundColor Red }

Write-Host "`n================================================================" -ForegroundColor White
Write-Host "                  RESUMEN DE DIAGNOSTICO" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor White

if (-not $fw8000 -or -not $fw8001 -or ($profile -and $profile.NetworkCategory -ne 'Private')) {
    Write-Host " ACCION REQUERIDA:" -ForegroundColor Magenta
    Write-Host "  1. Haz clic derecho en 'abrir_puerto_firewall.bat'" -ForegroundColor Yellow
    Write-Host "  2. Selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    Write-Host "  3. En la otra computadora, ingresa en el navegador a:" -ForegroundColor Yellow
    Write-Host "     http://$($mainIp):8000" -ForegroundColor Green
} else {
    Write-Host " TODO ESTA CONFIGURADO CORRECTAMENTE." -ForegroundColor Green
    Write-Host " En la otra PC escribe en Google Chrome o Edge:" -ForegroundColor White
    Write-Host "   http://$($mainIp):8000" -ForegroundColor Green
    Write-Host " O si usas Apache en XAMPP:" -ForegroundColor White
    Write-Host "   http://$($mainIp)/fundacion-api" -ForegroundColor Cyan
}
Write-Host ""
