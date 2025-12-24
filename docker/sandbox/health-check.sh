#!/bin/bash
#
# Sandbox Health Check Script
# Monitors container health and resource usage
#

set -euo pipefail

CONTAINER_ID="${1:-}"
THRESHOLD_MEMORY="${2:-90}"
THRESHOLD_CPU="${3:-80}"

if [ -z "${CONTAINER_ID}" ]; then
    echo "Usage: $0 <container_id> [memory_threshold] [cpu_threshold]"
    exit 1
fi

# Check if container exists
if ! docker ps -a --quiet --filter "id=${CONTAINER_ID}" | grep -q .; then
    echo "UNHEALTHY: Container not found"
    exit 1
fi

# Get container stats
if ! STATS=$(docker stats "${CONTAINER_ID}" --no-stream --format 'json' 2>/dev/null); then
    echo "UNHEALTHY: Unable to retrieve container stats"
    exit 1
fi

# Parse memory usage percentage
MEMORY=$(echo "${STATS}" | grep -o '"MemPerc":"[^"]*' | cut -d'"' -f4 | tr -d '%')
if [ -z "${MEMORY}" ] || [ $(echo "${MEMORY} > ${THRESHOLD_MEMORY}" | bc) -eq 1 ]; then
    echo "UNHEALTHY: Memory usage exceeds threshold: ${MEMORY}%"
    exit 1
fi

# Parse CPU usage percentage
CPU=$(echo "${STATS}" | grep -o '"CPUPerc":"[^"]*' | cut -d'"' -f4 | tr -d '%')
if [ -z "${CPU}" ] || [ $(echo "${CPU} > ${THRESHOLD_CPU}" | bc) -eq 1 ]; then
    echo "UNHEALTHY: CPU usage exceeds threshold: ${CPU}%"
    exit 1
fi

echo "HEALTHY: Memory=${MEMORY}% CPU=${CPU}%"
exit 0
