# PortableLLM Windows Installer
# Professional-Grade AI for Healthcare & Small Business
# Copyright (c) 2025 PortableLLM Project

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\PortableLLM",
    [switch]$Portable = $false,
    [switch]$SkipDependencies = $false
)

$ErrorActionPreference = "Stop"

# ASCII Art Banner
Write-Host @"
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _  |  _ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready
"@ -ForegroundColor Cyan

Write-Host "Starting PortableLLM installation..." -ForegroundColor Green
Write-Host "Installation Path: $InstallPath" -ForegroundColor Yellow

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This installer requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Create installation directory
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "Created installation directory: $InstallPath" -ForegroundColor Green
}

# Function to download file with progress
function Download-File {
    param([string]$url, [string]$destination)
    
    try {
        $client = New-Object System.Net.WebClient
        $client.DownloadFile($url, $destination)
        Write-Host "Downloaded: $(Split-Path $destination -Leaf)" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to download: $url" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Check and install dependencies
if (-not $SkipDependencies) {
    Write-Host "Checking dependencies..." -ForegroundColor Yellow
    
    # Check Docker Desktop
    $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerPath) {
        Write-Host "Docker Desktop not found. Installing..." -ForegroundColor Yellow
        
        # Download Docker Desktop installer
        $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
        $dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
        
        Write-Host "Downloading Docker Desktop..." -ForegroundColor Yellow
        Download-File -url $dockerUrl -destination $dockerInstaller
        
        # Install Docker Desktop
        Write-Host "Installing Docker Desktop (this may take several minutes)..." -ForegroundColor Yellow
        Start-Process -FilePath $dockerInstaller -ArgumentList "install --quiet" -Wait
        
        Write-Host "Docker Desktop installed. Please restart your computer and run this installer again." -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "Docker Desktop found: $($dockerPath.Source)" -ForegroundColor Green
    }
    
    # Check if Docker is running
    try {
        $dockerVersion = docker version --format "{{.Server.Version}}" 2>$null
        Write-Host "Docker is running (version: $dockerVersion)" -ForegroundColor Green
    }
    catch {
        Write-Host "Docker is installed but not running. Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}

# Create application structure
$appDirs = @("config", "models", "data", "logs", "scripts")
foreach ($dir in $appDirs) {
    $dirPath = Join-Path $InstallPath $dir
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    }
}

# Download PortableLLM components
Write-Host "Downloading PortableLLM components..." -ForegroundColor Yellow

# Create docker-compose configuration
$dockerCompose = @"
version: '3.8'
services:
  portablellm:
    image: portablellm/app:latest
    container_name: portablellm
    ports:
      - "8080:8080"    # Open WebUI
      - "11434:11434"  # Ollama API
    volumes:
      - ./data:/app/data
      - ./models:/app/models
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      - PORTABLELLM_MODE=healthcare
      - OLLAMA_HOST=0.0.0.0
      - OLLAMA_MODELS=/app/models
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
"@

Set-Content -Path (Join-Path $InstallPath "docker-compose.yml") -Value $dockerCompose

# Create startup script
$startupScript = @"
@echo off
title PortableLLM - Professional AI for Healthcare
echo.
echo  ____            _        _     _      _     _     __  __ 
echo ^|  _ \ ___  _ __^| ^|_ __ _^| ^|__ ^| ^| ___^| ^|   ^| ^|   ^|  \/  ^|
echo ^| ^|_^) / _ \^| '__^| __/ _ ^| ^^  _ \^| ^|/ _ \ ^|   ^| ^|   ^| ^|\/^| ^|
echo ^|  __/ ^^^(^^^) ^| ^|  ^| ^^| ^^^(^^^| ^| ^|_^) ^| ^|  __/ ^^|___^| ^^|___^| ^|  ^| ^|
echo ^|_^|   \___/^|_^|   \__\__,^^^_^|____/^|_^|\_^^|_____^|_____^|_^|  ^|_^|
echo.
echo Professional-Grade AI for Healthcare ^& Small Business
echo Privacy-First • Local Processing • HIPAA Ready
echo.

echo Starting PortableLLM...
cd /d "%~dp0"

echo Checking Docker status...
docker version >nul 2>&1
if errorlevel 1 (
    echo Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting PortableLLM services...
docker-compose up -d

echo.
echo PortableLLM is starting up...
echo.
echo Web Interface: http://localhost:8080
echo API Endpoint: http://localhost:11434
echo.
echo The interface will be available in about 30 seconds.
echo.

timeout /t 5 /nobreak >nul
start "" http://localhost:8080

echo PortableLLM is now running!
echo Press any key to view logs, or close this window to run in background.
pause >nul

docker-compose logs -f
"@

Set-Content -Path (Join-Path $InstallPath "start.bat") -Value $startupScript

# Create stop script
$stopScript = @"
@echo off
echo Stopping PortableLLM...
cd /d "%~dp0"
docker-compose down
echo PortableLLM stopped.
pause
"@

Set-Content -Path (Join-Path $InstallPath "stop.bat") -Value $stopScript

# Create configuration file
$config = @{
    version = "1.0.0"
    mode = "healthcare"
    privacy = @{
        local_only = $true
        audit_logging = $true
        encryption = $true
    }
    models = @{
        default = "deepseek-coder:6.7b-instruct"
        auto_download = $true
    }
    ui = @{
        theme = "healthcare"
        show_privacy_notice = $true
    }
} | ConvertTo-Json -Depth 3

Set-Content -Path (Join-Path $InstallPath "config\app.json") -Value $config

# Create desktop shortcut
if (-not $Portable) {
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:PUBLIC\Desktop\PortableLLM.lnk")
    $Shortcut.TargetPath = Join-Path $InstallPath "start.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Description = "PortableLLM - Professional AI for Healthcare"
    $Shortcut.IconLocation = Join-Path $InstallPath "icon.ico"
    $Shortcut.Save()
    
    Write-Host "Desktop shortcut created." -ForegroundColor Green
}

# Create start menu entry
if (-not $Portable) {
    $startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\PortableLLM.lnk"
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($startMenuPath)
    $Shortcut.TargetPath = Join-Path $InstallPath "start.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Description = "PortableLLM - Professional AI for Healthcare"
    $Shortcut.IconLocation = Join-Path $InstallPath "icon.ico"
    $Shortcut.Save()
    
    Write-Host "Start menu entry created." -ForegroundColor Green
}

# Create uninstaller
$uninstaller = @"
@echo off
title PortableLLM Uninstaller
echo Uninstalling PortableLLM...

cd /d "%~dp0"
docker-compose down 2>nul
docker rmi portablellm/app:latest 2>nul

echo Removing desktop shortcut...
del "%PUBLIC%\Desktop\PortableLLM.lnk" 2>nul

echo Removing start menu entry...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\PortableLLM.lnk" 2>nul

echo.
echo PortableLLM has been uninstalled.
echo Application files remain in: %~dp0
echo You can safely delete this folder if desired.
echo.
pause
"@

Set-Content -Path (Join-Path $InstallPath "uninstall.bat") -Value $uninstaller

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "PortableLLM Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation Path: $InstallPath" -ForegroundColor Yellow
Write-Host "Desktop Shortcut: Available" -ForegroundColor Yellow
Write-Host "Start Menu: Available" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start PortableLLM:" -ForegroundColor Cyan
Write-Host "  • Double-click the desktop shortcut" -ForegroundColor White
Write-Host "  • Or run: $InstallPath\start.bat" -ForegroundColor White
Write-Host ""
Write-Host "Web Interface: http://localhost:8080" -ForegroundColor Cyan
Write-Host "API Endpoint: http://localhost:11434" -ForegroundColor Cyan
Write-Host ""
Write-Host "For support and documentation:" -ForegroundColor Yellow
Write-Host "  GitHub: https://github.com/YourUsername/PortableLLM" -ForegroundColor White
Write-Host ""

# Option to start immediately
$start = Read-Host "Would you like to start PortableLLM now? (Y/n)"
if ($start -eq "" -or $start -eq "Y" -or $start -eq "y") {
    Write-Host "Starting PortableLLM..." -ForegroundColor Green
    Start-Process -FilePath (Join-Path $InstallPath "start.bat")
}

Write-Host "Installation completed successfully!" -ForegroundColor Green