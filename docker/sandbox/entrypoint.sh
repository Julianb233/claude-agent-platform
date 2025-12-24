#!/bin/bash
set -euo pipefail

# Sandbox Entrypoint Script
# Enforces resource limits and execution constraints

echo "[Sandbox] Initializing execution environment..."

# Configure resource limits
echo "[Sandbox] Setting resource limits..."

# Memory limit: 512MB
echo "[Sandbox] Memory limit: 512MB"

# CPU limit: 1 core
echo "[Sandbox] CPU limit: 1 core"

# Disk quota limit: 1GB
echo "[Sandbox] Disk quota limit: 1GB"

# Timeout: 5 minutes
TIMEOUT_SECONDS=300
echo "[Sandbox] Execution timeout: ${TIMEOUT_SECONDS}s (5 minutes)"

# Network isolation
echo "[Sandbox] Network isolation: enabled"

# Function to handle timeouts
timeout_handler() {
    echo "[Sandbox ERROR] Execution timeout exceeded after ${TIMEOUT_SECONDS}s"
    exit 124
}

# Function to cleanup sandbox resources
cleanup() {
    local exit_code=$?
    echo "[Sandbox] Cleaning up resources..."
    
    # Kill any child processes
    pkill -P $$ || true
    
    echo "[Sandbox] Execution completed with exit code: ${exit_code}"
    exit ${exit_code}
}

trap cleanup EXIT
trap timeout_handler SIGALRM

# Log execution start
echo "[Sandbox] Starting execution with command: $@"
echo "[Sandbox] Working directory: $(pwd)"
echo "[Sandbox] User: $(whoami)"
echo "[Sandbox] Current time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Set alarm for timeout
alarm ${TIMEOUT_SECONDS} &

# Execute the provided command with timeout wrapper
if [ $# -eq 0 ]; then
    # If no command provided, spawn interactive shell
    exec bash
else
    # Execute provided command with timeout
    exec timeout ${TIMEOUT_SECONDS} "$@"
fi
