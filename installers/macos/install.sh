#!/bin/bash

# PortableLLM macOS Installer
# Professional-Grade AI for Healthcare & Small Business
# Copyright (c) 2025 PortableLLM Project

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
cat << 'EOF'
 ____            _        _     _      _     _     __  __ 
|  _ \ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \/  |
| |_) / _ \| '__| __/ _` | '_ \| |/ _ \ |   | |   | |\/| |
|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |
|_|   \___/|_|   \__\__,_|____/|_|\___|_____|_____|_|  |_|

Professional-Grade AI for Healthcare & Small Business
Privacy-First • Local Processing • HIPAA Ready

EOF

# Default installation path
INSTALL_PATH="$HOME/Applications/PortableLLM"
PORTABLE_MODE=false
SKIP_DEPS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        --portable)
            PORTABLE_MODE=true
            shift
            ;;
        --skip-dependencies)
            SKIP_DEPS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --install-path PATH    Installation directory (default: ~/Applications/PortableLLM)"
            echo "  --portable             Portable installation (no system integration)"
            echo "  --skip-dependencies    Skip dependency installation"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}Starting PortableLLM installation...${NC}"
echo -e "${YELLOW}Installation Path: $INSTALL_PATH${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This installer is for macOS only.${NC}"
    exit 1
fi

# Check macOS version
macos_version=$(sw_vers -productVersion)
echo -e "${BLUE}macOS Version: $macos_version${NC}"

# Create installation directory
mkdir -p "$INSTALL_PATH"
echo -e "${GREEN}Created installation directory: $INSTALL_PATH${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Homebrew if not present
install_homebrew() {
    if ! command_exists brew; then
        echo -e "${YELLOW}Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add to PATH for Apple Silicon Macs
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    else
        echo -e "${GREEN}Homebrew is already installed.${NC}"
    fi
}

# Check and install dependencies
if [[ $SKIP_DEPS == false ]]; then
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Install Homebrew
    install_homebrew
    
    # Check Docker Desktop
    if ! command_exists docker; then
        echo -e "${YELLOW}Docker Desktop not found. Installing...${NC}"
        
        # Install Docker Desktop via Homebrew Cask
        brew install --cask docker
        
        echo -e "${YELLOW}Docker Desktop installed. Please open Docker Desktop from Applications and complete the setup.${NC}"
        echo -e "${YELLOW}Then run this installer again.${NC}"
        
        # Open Docker Desktop
        open -a Docker
        exit 0
    else
        echo -e "${GREEN}Docker Desktop found: $(docker --version)${NC}"
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${YELLOW}Docker daemon is not running. Starting Docker Desktop...${NC}"
        open -a Docker
        echo -e "${YELLOW}Waiting for Docker to start (30 seconds)...${NC}"
        sleep 30
        
        # Check again
        if ! docker info >/dev/null 2>&1; then
            echo -e "${RED}Docker is not running. Please start Docker Desktop and run this installer again.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}Docker is running.${NC}"
fi

# Create application structure
for dir in config models data logs scripts; do
    mkdir -p "$INSTALL_PATH/$dir"
done

# Create docker-compose configuration
cat > "$INSTALL_PATH/docker-compose.yml" << 'EOF'
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
EOF

echo -e "${GREEN}Created Docker Compose configuration.${NC}"

# Create startup script
cat > "$INSTALL_PATH/start.sh" << 'EOF'
#!/bin/bash

# PortableLLM Startup Script
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo " ____            _        _     _      _     _     __  __ "
echo "|  _ \\ ___  _ __| |_ __ _| |__ | | ___| |   | |   |  \\/  |"
echo "| |_) / _ \\| '__| __/ _\` | '_ \\| |/ _ \\ |   | |   | |\\/| |"
echo "|  __/ (_) | |  | || (_| | |_) | |  __/ |___| |___| |  | |"
echo "|_|   \\___/|_|   \\__\\__,_|____/|_|\\___|_____|_____|_|  |_|"
echo ""
echo "Professional-Grade AI for Healthcare & Small Business"
echo "Privacy-First • Local Processing • HIPAA Ready"
echo ""

echo -e "${GREEN}Starting PortableLLM...${NC}"

# Change to script directory
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not running. Opening Docker Desktop...${NC}"
    open -a Docker
    echo -e "${YELLOW}Waiting for Docker to start (30 seconds)...${NC}"
    sleep 30
    
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Docker failed to start. Please start Docker Desktop manually and try again.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Starting PortableLLM services...${NC}"
docker-compose up -d

echo ""
echo -e "${CYAN}PortableLLM is starting up...${NC}"
echo ""
echo -e "${CYAN}Web Interface: http://localhost:8080${NC}"
echo -e "${CYAN}API Endpoint: http://localhost:11434${NC}"
echo ""
echo "The interface will be available in about 30 seconds."
echo ""

# Wait a moment then open browser
sleep 5
open http://localhost:8080

echo -e "${GREEN}PortableLLM is now running!${NC}"
echo "To view logs, run: docker-compose logs -f"
echo "To stop PortableLLM, run: ./stop.sh"
EOF

chmod +x "$INSTALL_PATH/start.sh"

# Create stop script
cat > "$INSTALL_PATH/stop.sh" << 'EOF'
#!/bin/bash

# PortableLLM Stop Script
echo "Stopping PortableLLM..."

cd "$(dirname "$0")"
docker-compose down

echo "PortableLLM stopped."
EOF

chmod +x "$INSTALL_PATH/stop.sh"

# Create configuration file
cat > "$INSTALL_PATH/config/app.json" << 'EOF'
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
  }
}
EOF

# Create uninstaller
cat > "$INSTALL_PATH/uninstall.sh" << 'EOF'
#!/bin/bash

echo "Uninstalling PortableLLM..."

cd "$(dirname "$0")"

# Stop services
docker-compose down 2>/dev/null || true

# Remove Docker image
docker rmi portablellm/app:latest 2>/dev/null || true

# Remove from Applications (if installed there)
if [[ "$PWD" == "$HOME/Applications/PortableLLM" ]]; then
    echo "Removing application directory..."
    cd "$HOME"
    rm -rf "$HOME/Applications/PortableLLM"
    echo "PortableLLM has been completely removed."
else
    echo "PortableLLM services stopped and Docker images removed."
    echo "Application files remain in: $PWD"
    echo "You can safely delete this folder if desired."
fi

echo "Uninstallation complete."
EOF

chmod +x "$INSTALL_PATH/uninstall.sh"

# Create .app bundle for better macOS integration
if [[ $PORTABLE_MODE == false ]]; then
    APP_BUNDLE="$INSTALL_PATH/PortableLLM.app"
    mkdir -p "$APP_BUNDLE/Contents/MacOS"
    mkdir -p "$APP_BUNDLE/Contents/Resources"
    
    # Create Info.plist
    cat > "$APP_BUNDLE/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>PortableLLM</string>
    <key>CFBundleDisplayName</key>
    <string>PortableLLM</string>
    <key>CFBundleIdentifier</key>
    <string>com.portablellm.app</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>PortableLLM</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF
    
    # Create app executable
    cat > "$APP_BUNDLE/Contents/MacOS/PortableLLM" << EOF
#!/bin/bash
cd "$INSTALL_PATH"
./start.sh
EOF
    
    chmod +x "$APP_BUNDLE/Contents/MacOS/PortableLLM"
    
    echo -e "${GREEN}Created PortableLLM.app bundle.${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}PortableLLM Installation Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Installation Path: $INSTALL_PATH${NC}"
if [[ $PORTABLE_MODE == false ]]; then
    echo -e "${YELLOW}App Bundle: Available${NC}"
fi
echo ""
echo -e "${CYAN}To start PortableLLM:${NC}"
if [[ $PORTABLE_MODE == false ]]; then
    echo -e "  • Double-click PortableLLM.app in the installation folder"
fi
echo -e "  • Or run: $INSTALL_PATH/start.sh"
echo ""
echo -e "${CYAN}Web Interface: http://localhost:8080${NC}"
echo -e "${CYAN}API Endpoint: http://localhost:11434${NC}"
echo ""
echo -e "${YELLOW}For support and documentation:${NC}"
echo -e "  GitHub: https://github.com/YourUsername/PortableLLM"
echo ""

# Option to start immediately
read -p "Would you like to start PortableLLM now? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo -e "${GREEN}Starting PortableLLM...${NC}"
    "$INSTALL_PATH/start.sh" &
fi

echo -e "${GREEN}Installation completed successfully!${NC}"