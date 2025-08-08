# PortableLLM Docker Image
# Professional-Grade AI for Healthcare & Small Business
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    sqlite \
    bash \
    dumb-init \
    su-exec \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S portablellm && \
    adduser -S portablellm -u 1001 -G portablellm

# Set working directory
WORKDIR /app

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=portablellm:portablellm . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs /app/models /app/config && \
    chown -R portablellm:portablellm /app

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set environment variables
ENV NODE_ENV=production \
    PORTABLELLM_MODE=healthcare \
    HOST=0.0.0.0 \
    PORT=8080 \
    OLLAMA_HOST=0.0.0.0 \
    OLLAMA_PORT=11434 \
    DATA_PATH=/app/data \
    LOGS_PATH=/app/logs \
    MODELS_PATH=/app/models \
    LOG_LEVEL=info

# Expose ports
EXPOSE 8080 11434

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Create entrypoint script
RUN cat > /app/entrypoint.sh << 'EOF'
#!/bin/bash
set -e

# Initialize data directories
mkdir -p /app/data /app/logs /app/models /app/config

# Set proper permissions
chown -R portablellm:portablellm /app/data /app/logs /app/models /app/config

echo "Starting Ollama server..."
# Start Ollama in the background
su-exec portablellm ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -f http://localhost:11434/api/version >/dev/null 2>&1; then
        echo "Ollama is ready"
        break
    fi
    sleep 1
    timeout=$((timeout-1))
done

if [ $timeout -eq 0 ]; then
    echo "Ollama failed to start within 60 seconds"
    exit 1
fi

echo "Starting PortableLLM application..."
# Start the main application
exec su-exec portablellm node src/index.js
EOF

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/entrypoint.sh"]

# Labels for metadata
LABEL maintainer="PortableLLM Project" \
      version="1.0.0" \
      description="Professional-Grade AI for Healthcare & Small Business" \
      org.opencontainers.image.title="PortableLLM" \
      org.opencontainers.image.description="Privacy-First, Local Processing, HIPAA Ready AI Solution" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="PortableLLM Project" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/YourUsername/PortableLLM"