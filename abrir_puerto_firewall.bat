@echo off
title Habilitar Acceso en Red Local - Fundacion A+
color 0b
echo ================================================================
echo       CONFIGURAR FIREWALL DE WINDOWS (ACCESO DESDE CELULAR)
echo ================================================================
echo.
echo Esta herramienta autoriza el puerto 8000 en el Firewall de Windows
echo para que puedas abrir la pagina desde tu celular o tablet en WiFi.
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"Servidor Fundacion A+ (Puerto 8000)\" dir=in action=allow protocol=TCP localport=8000 & echo. & echo [+] REGLA CREADA CON EXITO. Ya puedes conectar tu celular al servidor. & echo. & pause' -Verb RunAs"
    exit /b
)

netsh advfirewall firewall add rule name="Servidor Fundacion A+ (Puerto 8000)" dir=in action=allow protocol=TCP localport=8000
echo.
echo [+] REGLA CREADA CON EXITO. El puerto 8000 ya esta abierto en tu red local.
echo.
pause
