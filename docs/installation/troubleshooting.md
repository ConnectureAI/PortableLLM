# Troubleshooting Guide

## Table of Contents

- [Common Installation Issues](#common-installation-issues)
- [Runtime Problems](#runtime-problems)
- [Performance Issues](#performance-issues)
- [Healthcare & Compliance Issues](#healthcare--compliance-issues)
- [Network and Connectivity](#network-and-connectivity)
- [Model Management Issues](#model-management-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Advanced Diagnostics](#advanced-diagnostics)

## Common Installation Issues

### Docker Not Found or Not Running

**Symptoms:**
```
Error: docker: command not found
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solutions:**

**Windows:**
```powershell
# Check if Docker Desktop is installed
Get-Command docker -ErrorAction SilentlyContinue

# If not found, install Docker Desktop
winget install Docker.DockerDesktop

# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait for Docker to start (30-60 seconds)
Start-Sleep 30
docker version
```

**macOS:**
```bash
# Check Docker installation
command -v docker

# Install Docker Desktop via Homebrew
brew install --cask docker

# Start Docker Desktop
open -a Docker

# Wait for Docker to start
sleep 30
docker version
```

**Linux (Ubuntu/Debian):**
```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker version
```

### Insufficient Permissions

**Symptoms:**
```
Permission denied while trying to connect to the Docker daemon
mkdir: cannot create directory: Permission denied
```

**Solutions:**

**Windows:**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell icon → "Run as administrator"

# Verify admin privileges
[Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains 'S-1-5-32-544'
```

**macOS/Linux:**
```bash
# Check if user is in docker group
groups $USER | grep docker

# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Use sudo for directory creation if needed
sudo mkdir -p /path/to/directory
sudo chown -R $USER:$USER /path/to/directory

# Log out and back in for group changes to take effect
```

### Port Already in Use

**Symptoms:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:8080: bind: address already in use
Port 11434 is already allocated
```

**Solutions:**

**Find What's Using the Port:**
```bash
# Windows
netstat -ano | findstr :8080
netstat -ano | findstr :11434

# macOS/Linux  
lsof -i :8080
lsof -i :11434
netstat -tulpn | grep :8080
```

**Kill Conflicting Process:**
```bash
# Windows (replace PID with actual process ID)
taskkill /PID 1234 /F

# macOS/Linux
sudo kill -9 PID_NUMBER
```

**Change PortableLLM Ports:**
```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Change port mappings:
ports:
  - "8081:8080"    # Changed from 8080:8080
  - "11435:11434"  # Changed from 11434:11434
```

### Insufficient Disk Space

**Symptoms:**
```
No space left on device
Error response from daemon: failed to create container: no space left on device
```

**Solutions:**

**Check Disk Space:**
```bash
# Windows
dir C:\ /s
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID,FreeSpace,Size

# macOS/Linux
df -h
du -sh /path/to/portablellm
```

**Free Up Space:**
```bash
# Clean Docker system
docker system prune -af
docker volume prune -f

# Remove unused images
docker image prune -af

# Clean system cache (Linux)
sudo apt autoclean && sudo apt autoremove

# macOS cache cleanup
sudo rm -rf /Library/Caches/*
rm -rf ~/Library/Caches/*
```

## Runtime Problems

### Application Won't Start

**Symptoms:**
```
Container exits immediately
Application not responding on http://localhost:8080
```

**Diagnostic Commands:**
```bash
# Check container status
docker ps -a

# View container logs
docker logs portablellm-app
docker logs portablellm-proxy

# Check Docker Compose status
docker-compose ps

# Restart services
docker-compose restart
```

**Common Solutions:**

**Configuration Issues:**
```bash
# Validate configuration files
node -e "console.log(JSON.parse(require('fs').readFileSync('config/app.json')))"

# Reset to default configuration
cp config/app.json.example config/app.json

# Check environment variables
docker-compose config
```

**Memory Issues:**
```bash
# Check system memory
free -h  # Linux
vm_stat  # macOS
Get-WmiObject -Class Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory  # Windows

# Adjust Docker memory limits
# Edit docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 8G  # Reduced from 16G
```

### Ollama Service Not Responding

**Symptoms:**
```
Error: ollama not running
Connection refused to http://localhost:11434
```

**Solutions:**

**Check Ollama Status:**
```bash
# Check if Ollama container is running
docker ps | grep ollama

# View Ollama logs
docker logs portablellm-app | grep ollama

# Test Ollama directly
curl http://localhost:11434/api/version
```

**Restart Ollama:**
```bash
# Restart the main container
docker-compose restart portablellm

# Or restart specific service
docker-compose restart portablellm

# Check startup sequence
docker-compose logs -f portablellm
```

**Manual Ollama Start:**
```bash
# Enter container
docker exec -it portablellm-app bash

# Start Ollama manually
ollama serve &

# Test connection
curl localhost:11434/api/version
```

## Performance Issues

### Slow Model Loading

**Symptoms:**
```
Model loading takes >5 minutes
High disk I/O during model operations
```

**Solutions:**

**Storage Optimization:**
```bash
# Move models to SSD if possible
# Edit docker-compose.yml volumes:
volumes:
  - /fast-ssd-path/models:/app/models

# Enable model caching
# Edit config/app.json:
{
  "models": {
    "cache_enabled": true,
    "preload_default": true
  }
}
```

**Memory Optimization:**
```bash
# Reduce concurrent operations
# Edit config/app.json:
{
  "performance": {
    "max_concurrent_requests": 2,
    "model_context_size": 2048
  }
}
```

### High Memory Usage

**Symptoms:**
```
System becomes unresponsive
Out of memory errors
```

**Monitor Memory Usage:**
```bash
# System memory
docker stats portablellm-app

# Application memory
curl http://localhost:8080/health | jq '.memory'

# Node.js heap usage
docker exec portablellm-app node -e "console.log(process.memoryUsage())"
```

**Memory Optimization:**
```bash
# Limit Node.js heap size
# Edit Dockerfile or docker-compose.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=4096

# Reduce model sizes (use quantized models)
# Pull smaller models
docker exec portablellm-app ollama pull llama3.1:8b-instruct-q4_0
```

### Slow Response Times

**Symptoms:**
```
API responses take >10 seconds
Web interface feels sluggish
```

**Performance Profiling:**
```bash
# Run health check with timing
time curl http://localhost:8080/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/

# Monitor system resources
top -p $(docker inspect -f '{{.State.Pid}}' portablellm-app)
```

**Optimization Steps:**
```bash
# Enable GPU acceleration (if available)
# Edit docker-compose.yml:
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]

# Optimize model parameters
# Use smaller context windows
# Reduce temperature for faster responses
```

## Healthcare & Compliance Issues

### HIPAA Audit Logging Not Working

**Symptoms:**
```
No audit logs generated
Audit logs missing required fields
```

**Check Audit Configuration:**
```bash
# Verify audit settings
cat config/app.json | jq '.security.auditLogging'

# Check log files
ls -la logs/audit.log
tail -f logs/audit.log
```

**Enable Proper Auditing:**
```bash
# Edit config/app.json
{
  "security": {
    "auditLogging": true,
    "localOnly": true
  },
  "healthcare": {
    "hipaaMode": true,
    "auditTrail": true
  }
}

# Restart application
docker-compose restart portablellm
```

### Data Encryption Issues

**Symptoms:**
```
Data stored in plaintext
Encryption keys not found
```

**Verify Encryption:**
```bash
# Check encryption settings
cat config/app.json | jq '.security.encryption'

# Verify database encryption
docker exec portablellm-app ls -la /app/data/

# Test encryption functionality
curl -X POST http://localhost:8080/api/v1/test-encryption
```

### Access Control Problems

**Symptoms:**
```
All users have admin access
Role-based access not working
```

**Fix Access Control:**
```bash
# Check user roles
curl http://localhost:8080/api/v1/users | jq

# Reset user permissions
docker exec portablellm-app node scripts/reset-permissions.js

# Configure RBAC properly
# Edit config/app.json:
{
  "security": {
    "rbac": {
      "enabled": true,
      "default_role": "user",
      "admin_users": ["admin@clinic.com"]
    }
  }
}
```

## Network and Connectivity

### Cannot Access Web Interface

**Symptoms:**
```
Browser shows "This site can't be reached"
Connection timeout errors
```

**Network Diagnostics:**
```bash
# Test local connectivity
curl -I http://localhost:8080
telnet localhost 8080

# Check if services are listening
netstat -tlnp | grep :8080
ss -tlnp | grep :8080

# Test from different network interface
curl -I http://127.0.0.1:8080
curl -I http://[your-ip]:8080
```

**Firewall Issues:**
```bash
# Windows Firewall
netsh advfirewall firewall add rule name="PortableLLM" dir=in action=allow protocol=TCP localport=8080

# Linux iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo ufw allow 8080

# macOS (usually not needed for localhost)
# Check System Preferences → Security & Privacy → Firewall
```

### SSL/HTTPS Issues

**Symptoms:**
```
SSL certificate errors
Mixed content warnings
```

**Configure HTTPS:**
```bash
# Generate self-signed certificates
mkdir -p config/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/ssl/key.pem \
  -out config/ssl/cert.pem \
  -subj "/CN=localhost"

# Update nginx.conf to enable HTTPS
# Uncomment HTTPS server block in config/nginx.conf

# Restart services
docker-compose restart portablellm-proxy
```

## Model Management Issues

### Model Download Failures

**Symptoms:**
```
Failed to download model: network error
Model download stuck at 0%
```

**Network Diagnostics:**
```bash
# Test internet connectivity
ping -c 3 ollama.com
nslookup ollama.com

# Test download directly
wget -O test.txt https://ollama.com/api/version
curl -I https://ollama.com
```

**Manual Model Management:**
```bash
# Download model manually
docker exec portablellm-app ollama pull deepseek-coder:6.7b-instruct

# Check available models
docker exec portablellm-app ollama list

# Remove corrupted models
docker exec portablellm-app ollama rm model-name

# Check disk space for models
docker exec portablellm-app df -h /app/models
```

### Model Loading Errors

**Symptoms:**
```
Error loading model: file not found
Model fails to respond
```

**Diagnostic Steps:**
```bash
# Check model files
docker exec portablellm-app ls -la /app/models/

# Test model directly
docker exec portablellm-app ollama run deepseek-coder:6.7b-instruct "Hello"

# Check model format
docker exec portablellm-app ollama show deepseek-coder:6.7b-instruct
```

**Model Repair:**
```bash
# Re-download corrupted model
docker exec portablellm-app ollama rm deepseek-coder:6.7b-instruct
docker exec portablellm-app ollama pull deepseek-coder:6.7b-instruct

# Verify model integrity
docker exec portablellm-app ollama show deepseek-coder:6.7b-instruct --verbose
```

## Platform-Specific Issues

### Windows-Specific Problems

**WSL2 Issues:**
```powershell
# Update WSL2
wsl --update
wsl --set-default-version 2

# Check WSL2 integration
docker info | findstr "WSL"

# Restart Docker Desktop with WSL2
Restart-Service -Name "Docker Desktop Service"
```

**PowerShell Execution Policy:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run installer with bypass
PowerShell -ExecutionPolicy Bypass -File install.ps1
```

### macOS-Specific Problems

**Homebrew Issues:**
```bash
# Update Homebrew
brew update && brew upgrade

# Fix permissions
sudo chown -R $(whoami) $(brew --prefix)/*

# Reinstall problematic packages
brew uninstall docker
brew install --cask docker
```

**Apple Silicon (M1/M2) Issues:**
```bash
# Use ARM-compatible images
# Edit docker-compose.yml:
image: portablellm/app:latest-arm64

# Install Rosetta if needed
softwareupdate --install-rosetta

# Check architecture
uname -m  # Should show arm64
```

### Linux-Specific Problems

**SystemD Service Issues:**
```bash
# Check Docker service status
sudo systemctl status docker

# Restart Docker service
sudo systemctl restart docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Check logs
sudo journalctl -u docker -f
```

**User Group Issues:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Verify group membership
groups $USER

# Apply group changes without logout
newgrp docker

# Test Docker without sudo
docker run hello-world
```

## Advanced Diagnostics

### Comprehensive Health Check

**Run Full Diagnostic:**
```bash
# Navigate to PortableLLM directory
cd /path/to/PortableLLM

# Run comprehensive health check
node scripts/health-check.js > health-report.txt

# Review results
cat health-report.txt

# Check specific components
node scripts/health-check.js --component=ollama
node scripts/health-check.js --component=database
```

### Container Deep Dive

**Inspect Container Configuration:**
```bash
# Inspect main container
docker inspect portablellm-app | jq

# Check resource usage
docker stats portablellm-app --no-stream

# View all container processes
docker exec portablellm-app ps aux

# Check network configuration
docker network ls
docker network inspect portablellm_portablellm-network
```

### Log Analysis

**Comprehensive Log Collection:**
```bash
# Collect all logs
mkdir debug-logs
docker-compose logs > debug-logs/compose.log
docker logs portablellm-app > debug-logs/app.log
docker logs portablellm-proxy > debug-logs/proxy.log

# Application logs
cp logs/*.log debug-logs/

# System logs (Linux)
sudo dmesg > debug-logs/dmesg.log
sudo journalctl > debug-logs/journal.log

# Create debug package
tar -czf debug-$(date +%Y%m%d-%H%M%S).tar.gz debug-logs/
```

### Performance Profiling

**Advanced Performance Analysis:**
```bash
# CPU profiling
docker exec portablellm-app node --prof app.js &
sleep 60
kill %1
docker exec portablellm-app node --prof-process isolate-*.log

# Memory heap dump
docker exec portablellm-app node -e "
  const v8 = require('v8');
  const fs = require('fs');
  const heapSnapshot = v8.getHeapSnapshot();
  const fileName = \`heap-\${Date.now()}.heapsnapshot\`;
  const fileStream = fs.createWriteStream(fileName);
  heapSnapshot.pipe(fileStream);
"

# Network latency testing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/system
```

## Getting Help

### Before Contacting Support

1. **Run Health Check:**
   ```bash
   node scripts/health-check.js
   ```

2. **Collect System Information:**
   ```bash
   # System details
   uname -a  # Linux/macOS
   systeminfo  # Windows
   
   # Docker information
   docker version
   docker info
   
   # PortableLLM version
   cat package.json | jq .version
   ```

3. **Gather Logs:**
   ```bash
   docker-compose logs > support-logs.txt
   cat logs/app.log >> support-logs.txt
   ```

### Support Channels

**Community Support:**
- **GitHub Issues**: [Report Issues](https://github.com/YourUsername/PortableLLM/issues)
- **GitHub Discussions**: [Community Help](https://github.com/YourUsername/PortableLLM/discussions)

**Professional Support:**
- **Email**: support@portablellm.com
- **Healthcare Specialist**: healthcare@portablellm.com
- **Emergency Support**: Available 24/7 for healthcare operations

### Creating Effective Support Requests

**Include This Information:**

1. **System Details:**
   - Operating system and version
   - Docker version
   - Available RAM and disk space
   - Hardware specifications (CPU, GPU)

2. **Problem Description:**
   - What you were trying to do
   - What happened instead
   - Error messages (exact text)
   - Steps to reproduce

3. **Diagnostic Information:**
   - Health check results
   - Relevant log files
   - Configuration files (remove sensitive data)

4. **Impact Assessment:**
   - Is this blocking healthcare operations?
   - How many users are affected?
   - Urgency level (Low/Medium/High/Critical)

---

This troubleshooting guide covers the most common issues with PortableLLM. For issues not covered here, please don't hesitate to reach out to our support team with detailed information about your problem.