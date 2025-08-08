#!/bin/bash

# PortableLLM Linux Installer
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

# Default configuration
INSTALL_PATH="$HOME/.local/share/PortableLLM"
PORTABLE_MODE=false
SKIP_DEPS=false
SYSTEM_INSTALL=false

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
        --system)
            SYSTEM_INSTALL=true
            INSTALL_PATH="/opt/portablellm"
            shift
            ;;
        --skip-dependencies)
            SKIP_DEPS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --install-path PATH    Installation directory (default: ~/.local/share/PortableLLM)"
            echo "  --portable             Portable installation (no system integration)"
            echo "  --system               System-wide installation (requires sudo)"
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

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$ID"
    elif [[ -f /etc/redhat-release ]]; then
        echo "rhel"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)
echo -e "${BLUE}Detected distribution: $DISTRO${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install packages based on distribution
install_package() {
    local package=$1
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y "$package"
            ;;
        fedora)
            sudo dnf install -y "$package"
            ;;
        centos|rhel)
            sudo yum install -y "$package"
            ;;
        arch)
            sudo pacman -S --noconfirm "$package"
            ;;
        opensuse*)
            sudo zypper install -y "$package"
            ;;
        *)
            echo -e "${RED}Unsupported distribution: $DISTRO${NC}"
            echo "Please install $package manually and run with --skip-dependencies"
            exit 1
            ;;
    esac
}

# Check for sudo if system install
if [[ $SYSTEM_INSTALL == true ]] && [[ $EUID -ne 0 ]]; then
    echo -e "${YELLOW}System installation requires sudo privileges.${NC}"
    sudo -v || exit 1
fi

# Create installation directory
if [[ $SYSTEM_INSTALL == true ]]; then
    sudo mkdir -p "$INSTALL_PATH"
    sudo chown $USER:$USER "$INSTALL_PATH"
else
    mkdir -p "$INSTALL_PATH"
fi

echo -e "${GREEN}Created installation directory: $INSTALL_PATH${NC}"

# Check and install dependencies
if [[ $SKIP_DEPS == false ]]; then
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Check curl
    if ! command_exists curl; then
        echo -e "${YELLOW}Installing curl...${NC}"
        install_package curl
    fi
    
    # Check Docker
    if ! command_exists docker; then
        echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
        
        case $DISTRO in
            ubuntu|debian)
                # Install Docker using official script
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                rm get-docker.sh
                
                # Add user to docker group
                sudo usermod -aG docker $USER
                ;;
            fedora)
                sudo dnf install -y docker
                sudo systemctl enable --now docker
                sudo usermod -aG docker $USER
                ;;
            centos|rhel)
                sudo yum install -y docker
                sudo systemctl enable --now docker
                sudo usermod -aG docker $USER
                ;;
            arch)
                sudo pacman -S --noconfirm docker
                sudo systemctl enable --now docker
                sudo usermod -aG docker $USER
                ;;
            *)
                echo -e "${RED}Please install Docker manually for your distribution.${NC}"
                exit 1
                ;;
        esac
        
        echo -e "${YELLOW}Docker installed. You may need to log out and back in for group changes to take effect.${NC}"
        echo -e "${YELLOW}Starting Docker service...${NC}"
        sudo systemctl start docker
        
    else
        echo -e "${GREEN}Docker found: $(docker --version)${NC}"
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${YELLOW}Starting Docker daemon...${NC}"
        sudo systemctl start docker
        
        # Wait for Docker to start
        sleep 5
        
        if ! docker info >/dev/null 2>&1; then
            echo -e "${RED}Failed to start Docker daemon. Please check Docker installation.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}Docker is running.${NC}"
    
    # Check docker-compose
    if ! command_exists docker-compose; then
        echo -e "${YELLOW}Installing docker-compose...${NC}"
        
        # Install via package manager first, fallback to pip
        case $DISTRO in
            ubuntu|debian)
                sudo apt-get install -y docker-compose || pip3 install docker-compose
                ;;
            fedora)
                sudo dnf install -y docker-compose || pip3 install docker-compose
                ;;
            *)
                if command_exists pip3; then
                    pip3 install --user docker-compose
                else
                    echo -e "${RED}Please install docker-compose manually.${NC}"
                    exit 1
                fi
                ;;
        esac
    else
        echo -e "${GREEN}docker-compose found: $(docker-compose --version)${NC}"
    fi
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
RED='\033[0;31m'
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
    echo -e "${YELLOW}Docker daemon is not running. Attempting to start...${NC}"
    
    if command -v systemctl >/dev/null; then
        sudo systemctl start docker
    elif command -v service >/dev/null; then
        sudo service docker start
    else
        echo -e "${RED}Cannot start Docker daemon. Please start it manually.${NC}"
        exit 1
    fi
    
    # Wait for Docker to start
    sleep 5
    
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Failed to start Docker daemon.${NC}"
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

# Try to open browser
if command -v xdg-open >/dev/null; then
    sleep 5
    xdg-open http://localhost:8080 >/dev/null 2>&1 &
elif command -v gnome-open >/dev/null; then
    sleep 5
    gnome-open http://localhost:8080 >/dev/null 2>&1 &
fi

echo -e "${GREEN}PortableLLM is now running!${NC}"
echo "To view logs, run: docker-compose logs -f"
echo "To stop PortableLLM, run: ./stop.sh"
EOF

chmod +x "$INSTALL_PATH/start.sh"

# Create stop script
cat > "$INSTALL_PATH/stop.sh" << 'EOF'
#!/bin/bash

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

# Create desktop entry
if [[ $PORTABLE_MODE == false ]]; then
    DESKTOP_FILE="$HOME/.local/share/applications/portablellm.desktop"
    mkdir -p "$(dirname "$DESKTOP_FILE")"
    
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=PortableLLM
Comment=Professional-Grade AI for Healthcare & Small Business
Exec=$INSTALL_PATH/start.sh
Icon=portablellm
Terminal=false
Categories=Office;Science;
Keywords=AI;LLM;Healthcare;Privacy;
StartupNotify=true
EOF
    
    echo -e "${GREEN}Created desktop entry.${NC}"
fi

# Create uninstaller
cat > "$INSTALL_PATH/uninstall.sh" << 'EOF'
#!/bin/bash

echo "Uninstalling PortableLLM..."

cd "$(dirname "$0")"

# Stop services
docker-compose down 2>/dev/null || true

# Remove Docker image
docker rmi portablellm/app:latest 2>/dev/null || true

# Remove desktop entry
rm -f "$HOME/.local/share/applications/portablellm.desktop"

# Remove from system location (if installed there)
if [[ "$PWD" == "/opt/portablellm" ]]; then
    echo "Removing system installation..."
    sudo rm -rf /opt/portablellm
    echo "PortableLLM has been completely removed."
else
    echo "PortableLLM services stopped and Docker images removed."
    echo "Application files remain in: $PWD"
    echo "You can safely delete this folder if desired."
fi

echo "Uninstallation complete."
EOF

chmod +x "$INSTALL_PATH/uninstall.sh"

# Set appropriate permissions
if [[ $SYSTEM_INSTALL == true ]]; then
    sudo chown -R root:root "$INSTALL_PATH"
    sudo chmod -R 755 "$INSTALL_PATH"
    # Make scripts executable by all users
    sudo chmod 755 "$INSTALL_PATH"/*.sh
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}PortableLLM Installation Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Installation Path: $INSTALL_PATH${NC}"
if [[ $PORTABLE_MODE == false ]]; then
    echo -e "${YELLOW}Desktop Entry: Available${NC}"
fi
echo ""
echo -e "${CYAN}To start PortableLLM:${NC}"
if [[ $PORTABLE_MODE == false ]]; then
    echo -e "  • Search for 'PortableLLM' in your applications menu"
fi
echo -e "  • Or run: $INSTALL_PATH/start.sh"
echo ""
echo -e "${CYAN}Web Interface: http://localhost:8080${NC}"
echo -e "${CYAN}API Endpoint: http://localhost:11434${NC}"
echo ""
echo -e "${YELLOW}For support and documentation:${NC}"
echo -e "  GitHub: https://github.com/YourUsername/PortableLLM"
echo ""

# Check if user needs to log out for Docker group
if groups $USER | grep -q docker; then
    echo -e "${GREEN}Docker group membership confirmed.${NC}"
else
    echo -e "${YELLOW}Note: You may need to log out and back in for Docker group changes to take effect.${NC}"
fi

# Option to start immediately
read -p "Would you like to start PortableLLM now? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo -e "${GREEN}Starting PortableLLM...${NC}"
    "$INSTALL_PATH/start.sh" &
fi

echo -e "${GREEN}Installation completed successfully!${NC}"