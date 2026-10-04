@echo off
title Habilitar Acceso en Red Local - Fundacion A+
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0abrir_puerto_firewall.ps1"
