#!/bin/bash
#
# Sandbox Cleanup Script
# Removes abandoned containers and cleans up resources
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/cleanup.log"

# Logging functions
log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "${LOG_FILE}"
}

error() {
    echo "[ERROR] [$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "${LOG_FILE}" >&2
}

# Cleanup abandoned containers older than 30 minutes
cleanup_old_containers() {
    log "Checking for abandoned containers..."
    
    local cutoff_time=$(($(date +%s) - 1800))  # 30 minutes
    local cleaned=0
    
    while IFS= read -r container_id; do
        if [ -z "${container_id}" ]; then
            continue
        fi
        
        local created_at=$(docker inspect -f '{{.Created}}' "${container_id}" 2>/dev/null || true)
        if [ -z "${created_at}" ]; then
            continue
        fi
        
        local created_ts=$(date -d "${created_at}" +%s 2>/dev/null || true)
        if [ -z "${created_ts}" ] || [ "${created_ts}" -gt "${cutoff_time}" ]; then
            continue
        fi
        
        log "Removing abandoned container: ${container_id}"
        docker rm -f "${container_id}" || error "Failed to remove container: ${container_id}"
        ((cleaned++))
    done < <(docker ps -a -q --filter="label=sandbox=true" --filter="status=exited" 2>/dev/null || true)
    
    log "Cleaned up ${cleaned} abandoned containers"
}

# Remove dangling images
cleanup_dangling_images() {
    log "Checking for dangling images..."
    
    local removed=0
    while IFS= read -r image_id; do
        if [ -z "${image_id}" ]; then
            continue
        fi
        
        log "Removing dangling image: ${image_id}"
        docker rmi "${image_id}" || error "Failed to remove image: ${image_id}"
        ((removed++))
    done < <(docker images --quiet --filter "dangling=true" 2>/dev/null || true)
    
    log "Removed ${removed} dangling images"
}

# Clean up temporary files
cleanup_temp_files() {
    log "Cleaning up temporary files..."
    
    local temp_dir="/tmp/sandbox-*"
    if [ -d "${temp_dir}" ]; then
        find /tmp -maxdepth 1 -name "sandbox-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
        log "Cleaned up temporary directories"
    fi
}

# Prune unused volumes
cleanup_volumes() {
    log "Checking for unused volumes..."
    
    docker volume prune -f --filter "label=sandbox=true" 2>/dev/null || true
    log "Pruned unused volumes"
}

# Generate cleanup report
generate_report() {
    log "=== Cleanup Report ==="
    log "Docker Disk Usage:"
    docker system df || true
    log "=== End Report ==="
}

# Main cleanup execution
main() {
    log "Starting sandbox cleanup..."
    log "Current disk usage before cleanup:"
    docker system df || true
    
    cleanup_old_containers
    cleanup_dangling_images
    cleanup_temp_files
    cleanup_volumes
    
    log "Current disk usage after cleanup:"
    docker system df || true
    
    generate_report
    log "Sandbox cleanup completed successfully"
}

main "$@"
