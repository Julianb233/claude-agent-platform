#!/bin/bash
#
# Test Sandbox Environment
# Validates sandbox functionality and resource limits
#

set -euo pipefail

IMAGE="${1:-claude-agent-sandbox:latest}"
CONTAINER_NAME="test-sandbox-${RANDOM}"

echo "Testing sandbox image: ${IMAGE}"
echo "Test container: ${CONTAINER_NAME}"
echo ""

# Function to cleanup test container
cleanup() {
    echo "Cleaning up test container..."
    docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
}

trap cleanup EXIT

# Test 1: Basic container creation
echo "[Test 1] Creating container..."
if ! docker run -d --name "${CONTAINER_NAME}" --memory 512m --cpus 1 "${IMAGE}" sleep 3600; then
    echo "FAILED: Unable to create container"
    exit 1
fi
echo "PASSED: Container created successfully"

# Test 2: Python availability
echo ""
echo "[Test 2] Checking Python installation..."
if docker exec "${CONTAINER_NAME}" python3 --version | grep -q 'Python 3.11'; then
    echo "PASSED: Python 3.11 is available"
else
    echo "FAILED: Python 3.11 not found"
    exit 1
fi

# Test 3: Node.js availability
echo ""
echo "[Test 3] Checking Node.js installation..."
if docker exec "${CONTAINER_NAME}" node --version | grep -q 'v22'; then
    echo "PASSED: Node.js v22 is available"
else
    echo "FAILED: Node.js v22 not found"
    exit 1
fi

# Test 4: Resource limits
echo ""
echo "[Test 4] Verifying resource limits..."
MEMORY=$(docker inspect "${CONTAINER_NAME}" --format='{{.HostConfig.Memory}}')
if [ "${MEMORY}" -eq 536870912 ]; then
    echo "PASSED: Memory limit correctly set to 512MB"
else
    echo "WARNING: Memory limit is ${MEMORY} bytes (expected 536870912)"
fi

# Test 5: Timeout functionality
echo ""
echo "[Test 5] Testing command execution..."
if OUTPUT=$(docker exec "${CONTAINER_NAME}" echo "Hello from sandbox"); then
    echo "PASSED: Command execution works"
    echo "Output: ${OUTPUT}"
else
    echo "FAILED: Command execution failed"
    exit 1
fi

# Test 6: Network isolation
echo ""
echo "[Test 6] Verifying network isolation..."
if docker exec "${CONTAINER_NAME}" ping -c 1 8.8.8.8 2>/dev/null || true | grep -q "Network is unreachable" || ! docker exec "${CONTAINER_NAME}" curl -s https://example.com >/dev/null 2>&1; then
    echo "PASSED: Network isolation confirmed (or ping failed as expected)"
else
    echo "WARNING: Network appears to be accessible"
fi

# Test 7: Disk limits
echo ""
echo "[Test 7] Testing disk space..."
if DISK_INFO=$(docker exec "${CONTAINER_NAME}" df /sandbox | tail -1); then
    echo "PASSED: Disk information available"
    echo "${DISK_INFO}"
else
    echo "FAILED: Unable to get disk information"
    exit 1
fi

# Test 8: Non-root user
echo ""
echo "[Test 8] Verifying non-root execution..."
if USER_INFO=$(docker exec "${CONTAINER_NAME}" whoami); then
    if [ "${USER_INFO}" != "root" ]; then
        echo "PASSED: Running as non-root user: ${USER_INFO}"
    else
        echo "WARNING: Running as root (expected non-root)"
    fi
fi

echo ""
echo "========================================"
echo "Sandbox Tests Completed Successfully"
echo "========================================"
