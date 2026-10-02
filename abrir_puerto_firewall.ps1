# Requiere elevación de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "       SOLICITANDO PERMISOS DE ADMINISTRADOR..." -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "Por favor presiona 'SI' en la ventana de control de cuentas (UAC)...`n"
    Start-Process powershell -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    exit
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       CONFIGURANDO FIREWALL DE WINDOWS Y RED LOCAL" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Reglas de Firewall
Write-Host "[+] 1. Eliminando reglas previas..." -ForegroundColor Cyan
Remove-NetFirewallRule -DisplayName "Servidor Fundacion A+ (Puerto 8000)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Servidor Chat IA Fundacion A+ (Puerto 8001)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Servidor Apache Fundacion A+ (Puerto 80)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "PHP Server Fundacion A+" -ErrorAction SilentlyContinue

Write-Host "[+] 2. Habilitando puertos 8000, 8001 y 80 en Firewall (todos los perfiles)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "Servidor Fundacion A+ (Puerto 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Servidor Chat IA Fundacion A+ (Puerto 8001)" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Servidor Apache Fundacion A+ (Puerto 80)" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null

Write-Host "[+] 3. Habilitando ejecutables de PHP y Apache..." -ForegroundColor Cyan
if (Test-Path "C:\xampp\php\php.exe") {
    New-NetFirewallRule -DisplayName "PHP Server Fundacion A+" -Direction Inbound -Program "C:\xampp\php\php.exe" -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
}
if (Test-Path "C:\xampp\apache\bin\httpd.exe") {
    New-NetFirewallRule -DisplayName "Apache Server Fundacion A+" -Direction Inbound -Program "C:\xampp\apache\bin\httpd.exe" -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
}

# 2. Configurar perfil de red a Privado
Write-Host "[+] 4. Estableciendo red Wi-Fi en Modo 'Privada'..." -ForegroundColor Cyan
Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' -or $_.InterfaceAlias -match 'Wi-Fi' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue

# 3. Detectar IP activa
$mainIp = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1 | Get-NetIPAddress -AddressFamily IPv4).IPAddress
if (-not $mainIp) { $mainIp = "192.168.1.26" }

Write-Host ""
Write-Host "================================================================" -ForegroundColor White
Write-Host "          CONFIGURACION APLICADA EXITOSAMENTE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor White
Write-Host ""
Write-Host "  Los puertos y ejecutables estan autorizados en el Firewall de Windows."
Write-Host "  La red Wi-Fi ha sido cambiada a Modo Privada para permitir comunicacion LAN."
Write-Host ""
Write-Host "  En la OTRA COMPUTADORA o celular (conectado al mismo internet):" -ForegroundColor Yellow
Write-Host "  Abre Google Chrome o Microsoft Edge y entra a:" -ForegroundColor Yellow
Write-Host ""
Write-Host "     http://${mainIp}:8000" -ForegroundColor Green
Write-Host "     (O si usas Apache en XAMPP: http://${mainIp}/fundacion-api)" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================================" -ForegroundColor White
Write-Host "Presiona cualquier tecla para cerrar esta ventana..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
