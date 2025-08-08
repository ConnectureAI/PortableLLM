#!/bin/bash

# PortableLLM Setup Script
# Automated setup for non-technical users
# Professional-Grade AI for Healthcare & Small Business

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/setup.log"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✓ $1${NC}"
    log "SUCCESS: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ $1${NC}"
    log "INFO: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log "WARNING: $1"
}

# ASCII Art Banner
show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _` | '_ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready
EOF
    echo -e "${NC}"
}

# Check if running with correct permissions
check_permissions() {
    info "Checking permissions..."
    
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        error_exit "No write permission to $PROJECT_ROOT. Please run with appropriate permissions."
    fi
    
    success "Permissions check passed"
}

# Check system requirements
check_system_requirements() {
    info "Checking system requirements..."
    
    # Check OS
    case "$OSTYPE" in
        linux*)   OS="Linux" ;;
        darwin*)  OS="macOS" ;;
        msys*)    OS="Windows" ;;
        cygwin*)  OS="Windows" ;;
        *)        error_exit "Unsupported operating system: $OSTYPE" ;;
    esac
    
    info "Operating System: $OS"
    
    # Check memory
    if command -v free >/dev/null 2>&1; then
        TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
        info "Total Memory: ${TOTAL_MEM}GB"
        
        if [[ $TOTAL_MEM -lt 8 ]]; then
            warning "Low memory detected (${TOTAL_MEM}GB). 16GB+ recommended for optimal performance."
        fi
    elif command -v sysctl >/dev/null 2>&1; then
        # macOS
        TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
        info "Total Memory: ${TOTAL_MEM}GB"
        
        if [[ $TOTAL_MEM -lt 8 ]]; then
            warning "Low memory detected (${TOTAL_MEM}GB). 16GB+ recommended for optimal performance."
        fi
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    AVAILABLE_GB=$((AVAILABLE_SPACE / 1024 / 1024))
    
    info "Available disk space: ${AVAILABLE_GB}GB"
    
    if [[ $AVAILABLE_GB -lt 50 ]]; then
        warning "Low disk space (${AVAILABLE_GB}GB). 100GB+ recommended for models and data."
    fi
    
    success "System requirements check completed"
}

# Check Docker installation
check_docker() {
    info "Checking Docker installation..."
    
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        info "Docker found: version $DOCKER_VERSION"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            success "Docker daemon is running"
        else
            warning "Docker daemon is not running. Please start Docker and run this script again."
            return 1
        fi
        
        # Check docker-compose
        if command -v docker-compose >/dev/null 2>&1; then
            COMPOSE_VERSION=$(docker-compose --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
            success "Docker Compose found: version $COMPOSE_VERSION"
        else
            warning "Docker Compose not found. Some features may not work."
        fi
        
        return 0
    else
        warning "Docker not found. Please install Docker Desktop and run this script again."
        return 1
    fi
}

# Create necessary directories
create_directories() {
    info "Creating necessary directories..."
    
    local dirs=(
        "$PROJECT_ROOT/data"
        "$PROJECT_ROOT/models"
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/config"
        "$PROJECT_ROOT/backups"
        "$PROJECT_ROOT/data/uploads"
        "$PROJECT_ROOT/data/temp"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            info "Created directory: $dir"
        else
            info "Directory exists: $dir"
        fi
    done
    
    success "Directory structure created"
}

# Create default configuration
create_configuration() {
    info "Creating default configuration..."
    
    local config_file="$PROJECT_ROOT/config/app.json"
    
    if [[ ! -f "$config_file" ]]; then
        cat > "$config_file" << 'EOF'
{
  "version": "1.0.0",
  "mode": "healthcare",
  "privacy": {
    "local_only": true,
    "audit_logging": true,
    "encryption": true
  },
  "models": {
    "default": "deepseek-coder:6.7b-instruct",
    "auto_download": true
  },
  "ui": {
    "theme": "healthcare",
    "show_privacy_notice": true
  },
  "setup": {
    "completed": false,
    "timestamp": ""
  }
}
EOF
        success "Created default configuration file"
    else
        info "Configuration file already exists"
    fi
}

# Create environment file
create_env_file() {
    info "Creating environment configuration..."
    
    local env_file="$PROJECT_ROOT/.env"
    
    if [[ ! -f "$env_file" ]]; then
        cat > "$env_file" << EOF
# PortableLLM Environment Configuration
NODE_ENV=production
PORTABLELLM_MODE=healthcare

# Application Settings
HOST=localhost
PORT=8080

# Ollama Configuration
OLLAMA_HOST=0.0.0.0
OLLAMA_PORT=11434

# Security & Privacy
LOCAL_ONLY=true
AUDIT_LOGGING=true
ENCRYPTION=true
HIPAA_MODE=true

# Paths
DATA_PATH=./data
LOGS_PATH=./logs
MODELS_PATH=./models

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Generated on $(date)
SETUP_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
        success "Created environment configuration"
    else
        info "Environment file already exists"
    fi
}

# Pull default models
pull_models() {
    info "Setting up default AI models..."
    
    if ! check_docker; then
        warning "Docker not available. Skipping model download."
        return 0
    fi
    
    # Start Docker containers if not running
    cd "$PROJECT_ROOT"
    
    info "Starting PortableLLM services..."
    docker-compose up -d --quiet-pull 2>/dev/null || {
        warning "Failed to start services. You can start them manually later with 'docker-compose up -d'"
        return 0
    }
    
    # Wait for Ollama to be ready
    info "Waiting for Ollama to be ready..."
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
            success "Ollama is ready"
            break
        fi
        
        sleep 2
        attempt=$((attempt + 1))
        
        if [[ $((attempt % 10)) -eq 0 ]]; then
            info "Still waiting for Ollama... (${attempt}/${max_attempts})"
        fi
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        warning "Ollama did not start in time. You can download models manually later."
        return 0
    fi
    
    # Download default model
    info "Downloading default model (this may take several minutes)..."
    
    local model="deepseek-coder:6.7b-instruct"
    
    # Check if model already exists
    if curl -s "http://localhost:11434/api/show" -d '{"name": "'$model'"}' 2>/dev/null | grep -q "model"; then
        success "Model $model already exists"
    else
        info "Downloading $model (approximately 3.8GB)..."
        
        # Start download
        curl -s -X POST "http://localhost:11434/api/pull" \
             -H "Content-Type: application/json" \
             -d '{"name": "'$model'", "stream": false}' \
             >/dev/null 2>&1 &
        
        local download_pid=$!
        
        # Show progress
        while kill -0 $download_pid 2>/dev/null; do
            info "Download in progress..."
            sleep 10
        done
        
        wait $download_pid
        
        if [[ $? -eq 0 ]]; then
            success "Model $model downloaded successfully"
        else
            warning "Model download may have failed. You can try again later."
        fi
    fi
}

# Create convenience scripts
create_scripts() {
    info "Creating convenience scripts..."
    
    # Start script
    cat > "$PROJECT_ROOT/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting PortableLLM..."
docker-compose up -d
echo "PortableLLM is starting up..."
echo "Web Interface: http://localhost:8080"
echo "Open WebUI: http://localhost:3000"
sleep 5
if command -v xdg-open >/dev/null; then
    xdg-open http://localhost:8080
elif command -v open >/dev/null; then
    open http://localhost:8080
fi
EOF
    chmod +x "$PROJECT_ROOT/start.sh"
    
    # Stop script
    cat > "$PROJECT_ROOT/stop.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Stopping PortableLLM..."
docker-compose down
echo "PortableLLM stopped."
EOF
    chmod +x "$PROJECT_ROOT/stop.sh"
    
    # Status script
    cat > "$PROJECT_ROOT/status.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "PortableLLM Status:"
echo "=================="
docker-compose ps
echo ""
echo "Health Check:"
curl -s http://localhost:8080/health | jq . 2>/dev/null || echo "Service not responding"
EOF
    chmod +x "$PROJECT_ROOT/status.sh"
    
    success "Convenience scripts created"
}

# Update setup completion
mark_setup_complete() {
    info "Marking setup as complete..."
    
    local config_file="$PROJECT_ROOT/config/app.json"
    
    if [[ -f "$config_file" ]]; then
        # Update config to mark setup as complete
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        local temp_file=$(mktemp)
        
        jq --arg timestamp "$timestamp" '.setup.completed = true | .setup.timestamp = $timestamp' "$config_file" > "$temp_file"
        mv "$temp_file" "$config_file"
        
        success "Setup marked as complete"
    fi
}

# Main setup function
main() {
    show_banner
    
    log "Starting PortableLLM setup process"
    info "Starting PortableLLM setup process..."
    info "Log file: $LOG_FILE"
    echo ""
    
    # Run setup steps
    check_permissions
    check_system_requirements
    create_directories
    create_configuration
    create_env_file
    create_scripts
    
    # Optional steps
    if check_docker; then
        pull_models
    fi
    
    mark_setup_complete
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}PortableLLM Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${CYAN}To start PortableLLM:${NC}"
    echo -e "  ${YELLOW}./start.sh${NC}"
    echo ""
    echo -e "${CYAN}To stop PortableLLM:${NC}"
    echo -e "  ${YELLOW}./stop.sh${NC}"
    echo ""
    echo -e "${CYAN}To check status:${NC}"
    echo -e "  ${YELLOW}./status.sh${NC}"
    echo ""
    echo -e "${CYAN}Web Interfaces:${NC}"
    echo -e "  Main App: ${YELLOW}http://localhost:8080${NC}"
    echo -e "  Open WebUI: ${YELLOW}http://localhost:3000${NC}"
    echo ""
    echo -e "${BLUE}For support and documentation:${NC}"
    echo -e "  GitHub: ${YELLOW}https://github.com/YourUsername/PortableLLM${NC}"
    echo ""
    
    log "Setup process completed successfully"
    
    # Ask if user wants to start now
    echo -n "Would you like to start PortableLLM now? (Y/n): "
    read -r response
    
    if [[ "$response" =~ ^[Nn]$ ]]; then
        info "You can start PortableLLM later by running: ./start.sh"
    else
        info "Starting PortableLLM..."
        ./start.sh
    fi
}

# Run main function
main "$@"