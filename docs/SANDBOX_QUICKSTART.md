# Docker Sandbox Quick Start

## Prerequisites

```bash
docker --version  # 20.10+
docker-compose --version  # 2.0+
sudo systemctl start docker
```

## Build (2 min)

```bash
cd /root/github-repos/claude-agent-platform
bash docker/build-sandbox.sh
docker image ls | grep claude-agent-sandbox
```

## Test (3 min)

```bash
bash docker/test-sandbox.sh claude-agent-sandbox:latest
```

## Run (1 min)

```bash
cd docker/sandbox
docker-compose up -d
docker ps | grep sandbox
```

## Code Example

```typescript
import { SandboxManager } from './services/sandbox-manager';

const manager = new SandboxManager();
const sessionId = await manager.createSession();

const result = await manager.executeCommand(
  sessionId,
  'python3 -c "print(123)"'
);

console.log(result.stdout); // 123
await manager.destroySession(sessionId);
```

## File Operations

```typescript
// Write
await manager.fileOperation(sessionId, {
  type: 'write',
  path: '/file.txt',
  content: 'data'
});

// Read
const content = await manager.fileOperation(sessionId, {
  type: 'read',
  path: '/file.txt'
});

// Delete
await manager.fileOperation(sessionId, {
  type: 'delete',
  path: '/file.txt'
});
```

## Useful Commands

```bash
make -C docker build    # Build image
make -C docker test     # Run tests
make -C docker run      # Start services
make -C docker stop     # Stop services
make -C docker clean    # Cleanup
make -C docker logs     # View logs
make -C docker monitor  # Monitor stats
make -C docker shell    # Interactive shell
```

## Limits

- Memory: 512MB
- CPU: 1 core
- Timeout: 5 min
- Disk: 1GB
- Processes: 20

## More Info

- [Full Integration Guide](./SANDBOX_INTEGRATION.md)
- [Implementation Summary](./SANDBOX_IMPLEMENTATION_SUMMARY.md)
- [Docker README](../docker/README.md)
