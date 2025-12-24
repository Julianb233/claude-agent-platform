#!/bin/bash
#
# Build Sandbox Docker Image
# Creates the isolated execution environment for agents
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${1:-claude-agent-sandbox}"
IMAGE_TAG="${2:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building Docker sandbox image: ${FULL_IMAGE}"
echo "Build context: ${SCRIPT_DIR}/sandbox"

# Build the image
docker build \
    --tag "${FULL_IMAGE}" \
    --label "sandbox=true" \
    --label "created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "version=${IMAGE_TAG}" \
    --progress=plain \
    "${SCRIPT_DIR}/sandbox"

echo "Image built successfully: ${FULL_IMAGE}"

# Display image information
echo ""
echo "Image Information:"
docker image inspect "${FULL_IMAGE}" --format='Name: {{.RepoTags}}' | head -1
docker image inspect "${FULL_IMAGE}" --format='Size: {{.Size}} bytes'
docker image inspect "${FULL_IMAGE}" --format='Created: {{.Created}}'

echo ""
echo "Next steps:"
echo "1. Test the image: docker run -it --rm ${FULL_IMAGE}"
echo "2. Push to registry: docker tag ${FULL_IMAGE} <registry>/${FULL_IMAGE} && docker push <registry>/${FULL_IMAGE}"
echo "3. Deploy with Docker Compose: docker-compose -f ${SCRIPT_DIR}/sandbox/docker-compose.yml up"
