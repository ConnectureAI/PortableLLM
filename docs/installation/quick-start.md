# Quick Start Installation Guide

## Overview

This guide will help you install PortableLLM on your system in under 10 minutes. PortableLLM works on Windows, macOS, and Linux, providing a professional-grade AI solution that runs entirely on your local hardware.

## Before You Begin

### System Requirements Check

**Minimum Requirements:**
- RAM: 16GB (32GB recommended)
- Storage: 100GB free space (500GB recommended)
- CPU: 4 cores (8 cores recommended)
- OS: Windows 10+, macOS 10.15+, or Ubuntu 20.04+

**Optional but Recommended:**
- GPU: NVIDIA RTX series for faster inference
- SSD: For better model loading performance

### Prerequisites

**Required Software:**
- **Docker Desktop**: Required for all platforms
  - Windows: [Download Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)
  - macOS: [Download Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)
  - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/)

**Administrator/Sudo Access:**
- Windows: Run PowerShell as Administrator
- macOS/Linux: Sudo privileges required for installation

## Installation Methods

### Method 1: One-Command Installation (Recommended)

**Windows (PowerShell as Administrator):**
```powershell
# Download and run installer
irm https://github.com/YourUsername/PortableLLM/raw/main/installers/windows/install.ps1 | iex
```

**macOS Terminal:**
```bash
# Download and run installer  
curl -fsSL https://github.com/YourUsername/PortableLLM/raw/main/installers/macos/install.sh | bash
```

**Linux Terminal:**
```bash
# Download and run installer
curl -fsSL https://github.com/YourUsername/PortableLLM/raw/main/installers/linux/install.sh | bash
```

### Method 2: Manual Installation

**Step 1: Download PortableLLM**
```bash
# Clone the repository
git clone https://github.com/YourUsername/PortableLLM.git
cd PortableLLM

# Or download the latest release
wget https://github.com/YourUsername/PortableLLM/archive/refs/tags/v1.0.0.zip
unzip v1.0.0.zip
cd PortableLLM-1.0.0
```

**Step 2: Run Setup Script**
```bash
# Make setup script executable (macOS/Linux)
chmod +x scripts/setup.sh

# Run setup script
./scripts/setup.sh
```

**Step 3: Start PortableLLM**
```bash
# Start the application
./start.sh
```

## Installation Walkthrough

### Windows Installation

![Windows Installation](../images/windows-install-1.png)

**Step 1: Open PowerShell as Administrator**
1. Press `Win + X` and select "Windows PowerShell (Admin)"
2. Click "Yes" when prompted by User Account Control

**Step 2: Run Installation Command**
```powershell
irm https://github.com/YourUsername/PortableLLM/raw/main/installers/windows/install.ps1 | iex
```

**What You'll See:**
```
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _` | '_ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready

Starting PortableLLM installation...
Installation Path: C:\Users\YourName\AppData\Local\PortableLLM

Checking dependencies...
Docker Desktop found: version 4.16.2
Docker is running (version: 24.0.7)

Downloading PortableLLM components...
Created Docker Compose configuration.
Created startup script.
Desktop shortcut created.
Start menu entry created.

========================================
PortableLLM Installation Complete!
========================================

Installation Path: C:\Users\YourName\AppData\Local\PortableLLM
Desktop Shortcut: Available
Start Menu: Available

To start PortableLLM:
  • Double-click the desktop shortcut
  • Or run: C:\Users\YourName\AppData\Local\PortableLLM\start.bat

Web Interface: http://localhost:8080
API Endpoint: http://localhost:11434

For support and documentation:
  GitHub: https://github.com/YourUsername/PortableLLM

Would you like to start PortableLLM now? (Y/n): Y
Starting PortableLLM...
```

![Windows Complete](../images/windows-install-complete.png)

### macOS Installation

**Step 1: Open Terminal**
1. Press `Cmd + Space` and type "Terminal"
2. Press Enter to open Terminal

**Step 2: Run Installation Command**
```bash
curl -fsSL https://github.com/YourUsername/PortableLLM/raw/main/installers/macos/install.sh | bash
```

**Installation Output:**
```
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _` | '_ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready

Starting PortableLLM installation...
Installation Path: /Users/YourName/Applications/PortableLLM

macOS Version: 13.6.1
Checking dependencies...
Homebrew is already installed.
Docker Desktop found: Docker version 24.0.7, build afdd53b

Creating application structure...
Created Docker Compose configuration.
Created PortableLLM.app bundle.

======================================
PortableLLM Installation Complete!
======================================

Installation Path: /Users/YourName/Applications/PortableLLM
App Bundle: Available

To start PortableLLM:
  • Double-click PortableLLM.app in the installation folder
  • Or run: /Users/YourName/Applications/PortableLLM/start.sh

Web Interface: http://localhost:8080
API Endpoint: http://localhost:11434

Would you like to start PortableLLM now? (Y/n): Y
Starting PortableLLM...
```

### Linux Installation

**Step 1: Open Terminal**
- Ubuntu/Debian: `Ctrl + Alt + T`
- Other distributions: Open your preferred terminal

**Step 2: Run Installation Command**
```bash
curl -fsSL https://github.com/YourUsername/PortableLLM/raw/main/installers/linux/install.sh | bash
```

**Installation Process:**
```
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _` | '_ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready

Starting PortableLLM installation...
Installation Path: /home/username/.local/share/PortableLLM

Detected distribution: ubuntu
Checking dependencies...
Docker found: Docker version 24.0.7, build afdd53b
docker-compose found: docker-compose version 1.29.2

Creating necessary directories...
Created Docker Compose configuration.
Created desktop entry.

======================================
PortableLLM Installation Complete!
======================================

Installation Path: /home/username/.local/share/PortableLLM
Desktop Entry: Available

To start PortableLLM:
  • Search for 'PortableLLM' in your applications menu
  • Or run: /home/username/.local/share/PortableLLM/start.sh

Web Interface: http://localhost:8080
API Endpoint: http://localhost:11434

Docker group membership confirmed.

Would you like to start PortableLLM now? (Y/n): Y
Starting PortableLLM...
```

## First Startup

### What Happens During First Startup

**1. Container Initialization (30-60 seconds)**
```
Starting PortableLLM...

Starting PortableLLM services...
[+] Running 4/4
 ✔ Network portablellm_portablellm-network    Created
 ✔ Container portablellm-proxy                Started
 ✔ Container portablellm-app                  Started  
 ✔ Container portablellm-webui                Started

PortableLLM is starting up...

Web Interface: http://localhost:8080
API Endpoint: http://localhost:11434

The interface will be available in about 30 seconds.
```

**2. Model Download (5-15 minutes, first time only)**
```
Downloading default model: deepseek-coder:6.7b-instruct
Model size: ~3.8GB

Download progress: ████████████████████ 100%
Model downloaded successfully.

PortableLLM is now ready!
```

### Accessing PortableLLM

Once installation is complete, you can access PortableLLM through:

**Primary Interface:**
- **Web Interface**: http://localhost:8080
- Modern, responsive interface for all users

**Advanced Interface:**
- **Open WebUI**: http://localhost:3000  
- Feature-rich interface with advanced options

**API Access:**
- **REST API**: http://localhost:8080/api/v1/
- **Health Check**: http://localhost:8080/health

![PortableLLM Interface](../images/interface-welcome.png)

## Verification Steps

### Step 1: Check System Status

**Using the Web Interface:**
1. Open http://localhost:8080/health
2. Verify all services show as "healthy"

**Using Command Line:**
```bash
# Check container status
docker ps

# Check application health
curl http://localhost:8080/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "version": "1.0.0",
  "uptime": 125.5,
  "memory": {
    "heapUsed": 67108864,
    "heapTotal": 134217728
  }
}
```

### Step 2: Test Basic Functionality

**Test API Connection:**
```bash
# Test API endpoint
curl http://localhost:8080/api/v1/ | jq
```

**Test Ollama Integration:**
```bash
# List available models
curl http://localhost:11434/api/tags | jq
```

### Step 3: Run Health Check

**Automated Health Check:**
```bash
# Navigate to PortableLLM directory
cd /path/to/PortableLLM

# Run comprehensive health check
node scripts/health-check.js
```

**Expected Results:**
```
🏥 PortableLLM Health Check
==================================================
Timestamp: 2024-01-15T10:30:45.123Z

📊 System Resources:
✓ Memory usage is healthy
✓ CPU resources are adequate

📁 File System:
✓ Directory data exists and is writable
✓ Directory models exists and is writable
✓ Directory logs exists and is writable
✓ Directory config exists and is writable
✓ File system permissions are correct

🚀 Application Services:
✓ Main Application Health - HTTP 200
✓ API Service - HTTP 200

🤖 Ollama Service:
✓ Ollama Service - HTTP 200
✓ Ollama Models - 1 models available

🌐 Network Connectivity:
✓ Privacy Endpoint - HTTP 200
✓ System Info Endpoint - HTTP 200

📋 Health Check Summary:
==================================================
✓ Passed: 15/15
🎉 Overall Health: Excellent (100%)
```

## Troubleshooting Common Issues

### Docker Not Running
**Error:** `Cannot connect to the Docker daemon`

**Solution:**
```bash
# Windows: Start Docker Desktop from Start Menu
# macOS: Start Docker Desktop from Applications
# Linux: Start Docker service
sudo systemctl start docker
```

### Port Already in Use
**Error:** `Port 8080 is already in use`

**Solution:**
```bash
# Find what's using the port
netstat -tulpn | grep :8080

# Stop PortableLLM and change ports
docker-compose down
# Edit docker-compose.yml to use different ports
```

### Memory Issues
**Error:** `Container killed (OOMKilled)`

**Solution:**
```bash
# Check available memory
free -h

# Adjust Docker memory limits in docker-compose.yml
# Reduce concurrent model operations
```

### Model Download Fails
**Error:** `Failed to download model`

**Solution:**
```bash
# Check internet connection
ping ollama.com

# Retry download manually
docker exec portablellm-app ollama pull deepseek-coder:6.7b-instruct

# Check disk space
df -h
```

## Next Steps

### Configure for Healthcare Use

**Enable HIPAA Mode:**
```bash
# Edit config/app.json
{
  "mode": "healthcare",
  "privacy": {
    "local_only": true,
    "audit_logging": true,
    "encryption": true
  },
  "healthcare": {
    "hipaa_mode": true
  }
}
```

### Add Additional Models

**Download Healthcare Models:**
```bash
# Medical conversation model
docker exec portablellm-app ollama pull llama3.1:8b-instruct

# Legal document analysis
docker exec portablellm-app ollama pull mistral:7b-instruct
```

### Set Up Team Access

**Configure Multiple Users:**
```bash
# Edit docker-compose.yml to enable authentication
# Set up user accounts and permissions
# Configure role-based access control
```

## Getting Help

### Documentation
- **User Manual**: [docs/user-manual.md](../user-manual.md)
- **Healthcare Workflows**: [docs/healthcare/workflows.md](../healthcare/workflows.md)
- **API Reference**: [docs/api/reference.md](../api/reference.md)

### Support Channels
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/YourUsername/PortableLLM/issues)
- **Email Support**: support@portablellm.com
- **Healthcare Specialist**: healthcare@portablellm.com

### Community
- **GitHub Discussions**: [Join the community](https://github.com/YourUsername/PortableLLM/discussions)
- **Twitter**: [@PortableLLM](https://twitter.com/PortableLLM)

---

**🎉 Congratulations!** You now have PortableLLM running on your system. Your AI-powered healthcare solution is ready to use, with complete privacy and HIPAA compliance built-in.