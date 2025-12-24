# Docker Infrastructure

This directory contains Docker configurations for the Claude Agent Platform.

## Structure

```
docker/
├── sandbox/              # Isolated code execution environment
│   ├── Dockerfile       # Sandbox image definition
│   ├── entrypoint.sh    # Execution entrypoint with timeout
│   ├── limits.conf      # Resource limit configuration
│   ├── cleanup.sh       # Container and resource cleanup
│   ├── health-check.sh  # Health monitoring script
│   └── docker-compose.yml # Multi-container orchestration
├── build-sandbox.sh     # Build script for sandbox image
├── test-sandbox.sh      # Comprehensive test suite
└── README.md           # This file
```

## Quick Start

### Build Sandbox Image

```bash
bash docker/build-sandbox.sh
```

### Test Sandbox

```bash
bash docker/test-sandbox.sh
```

### Start with Docker Compose

```bash
cd docker/sandbox
docker-compose up -d
```

## Documentation

- **[Sandbox Integration Guide](../docs/SANDBOX_INTEGRATION.md)** - Comprehensive usage and API documentation
- **[Dockerfile](sandbox/Dockerfile)** - Container image definition with security hardening
- **[Entrypoint Script](sandbox/entrypoint.sh)** - Execution environment setup and timeout handling

## Components

### Sandbox Manager Service

Location: `backend/src/services/sandbox-manager.ts`

Provides:
- Session management (create, destroy, list)
- Command execution with resource limits
- File operations (read, write, delete, list)
- Health monitoring
- Automatic cleanup
- Event emission

### Resource Limits

- **Memory**: 512MB
- **CPU**: 1 core
- **Disk**: 1GB
- **Timeout**: 5 minutes
- **Processes**: 20 max

### Security Features

- Non-root user execution (UID 1000)
- Network isolation (no networking)
- Read-only root filesystem
- No capability grants
- Core dumps disabled
- Temporary filesystem with noexec/nosuid

## Usage Example

```typescript
import { SandboxManager } from './services/sandbox-manager';

const manager = new SandboxManager();
const sessionId = await manager.createSession();

const result = await manager.executeCommand(
  sessionId,
  'python3 -c "print(\"Hello\")"'
);

console.log(result.stdout); // Hello
await manager.destroySession(sessionId);
```

## Monitoring

```bash
# View running containers
docker ps | grep sandbox

# Check container stats
docker stats <container-id>

# View cleanup logs
tail -f docker/sandbox/cleanup.log
```

## Troubleshooting

```bash
# Test image build
docker build -t claude-agent-sandbox:latest docker/sandbox/

# Run interactive shell
docker run -it --rm claude-agent-sandbox:latest

# Inspect container
docker exec <container-id> ps aux

# Check resource limits
docker inspect <container-id> | grep -A 20 HostConfig
```

## Performance

- Image size: ~1.2GB
- Startup time: ~1-2 seconds per container
- Memory overhead: ~50MB per container
- Timeout enforcement: 5-minute default

## Cleanup

Automatic cleanup runs every 60 seconds for:
- Containers inactive >30 minutes
- Dangling images
- Unused volumes
- Temporary files

Manual cleanup:
```bash
bash docker/sandbox/cleanup.sh
```

## Integration

The sandbox is integrated with the agent execution pipeline:
1. Agent creates session via SandboxManager
2. Executes code with resource constraints
3. Captures output and metrics
4. Cleans up on completion

## See Also

- [Backend Services](../backend/src/services/)
- [Type Definitions](../backend/src/types/sandbox.types.ts)
- [Integration Documentation](../docs/SANDBOX_INTEGRATION.md)
