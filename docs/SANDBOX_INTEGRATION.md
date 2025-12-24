# Docker Sandbox Integration Guide

## Overview

The Claude Agent Platform includes a comprehensive Docker sandbox environment for secure, isolated code execution. This guide explains how to build, configure, and use the sandbox system.

## Architecture

### Components

1. **Dockerfile** (`docker/sandbox/Dockerfile`)
   - Ubuntu 22.04 base image
   - Python 3.11 with pip
   - Node.js 22 LTS with npm
   - Common development tools (git, curl, wget, vim)
   - Non-root user execution (sandboxuser)
   - Health check monitoring

2. **Entrypoint Script** (`docker/sandbox/entrypoint.sh`)
   - Enforces resource limits
   - Implements timeout mechanisms
   - Handles cleanup on exit
   - Logs execution details

3. **Limits Configuration** (`docker/sandbox/limits.conf`)
   - Memory: 512MB max
   - CPU: 1 core
   - File size: 1GB max
   - Process limit: 20 max
   - CPU time: 5 minutes max
   - Core dumps: disabled

4. **Sandbox Manager** (`backend/src/services/sandbox-manager.ts`)
   - Session lifecycle management
   - Command execution with timeouts
   - File operations within sandbox
   - Health monitoring
   - Automatic cleanup

## Building the Sandbox Image

### Prerequisites

- Docker 20.10+
- 4GB available disk space
- Linux kernel 5.0+ (for cgroup v2 support)

### Build Steps

```bash
# Build the sandbox image
cd /root/github-repos/claude-agent-platform-source
bash docker/build-sandbox.sh

# Or build manually
docker build -t claude-agent-sandbox:latest docker/sandbox/

# Verify the image
docker image ls | grep claude-agent-sandbox
```

### Build Output

```
Building Docker sandbox image: claude-agent-sandbox:latest
Image built successfully: claude-agent-sandbox:latest

Image Information:
Name: claude-agent-sandbox:latest
Size: 1.2GB bytes
Created: 2025-12-24T12:00:00Z
```

## Testing the Sandbox

### Run Full Test Suite

```bash
bash docker/test-sandbox.sh claude-agent-sandbox:latest
```

### Manual Testing

```bash
# Create a test container
docker run -it --rm --memory 512m --cpus 1 claude-agent-sandbox:latest

# Inside the container:
python3 --version  # Check Python
node --version     # Check Node.js
whoami            # Verify non-root user
df -h /sandbox    # Check disk space
```

## Using the Sandbox Manager

### TypeScript Integration

```typescript
import { SandboxManager } from './services/sandbox-manager';

// Create manager instance
const sandboxManager = new SandboxManager();

// Create a new sandbox session
const sessionId = await sandboxManager.createSession();
console.log(`Created sandbox session: ${sessionId}`);

// Execute a command
const result = await sandboxManager.executeCommand(
  sessionId,
  'python3 -c "print(\"Hello from sandbox\")"'
);

console.log(`Exit code: ${result.exitCode}`);
console.log(`Output: ${result.stdout}`);
console.log(`Duration: ${result.durationMs}ms`);

// File operations
const fileOp = await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'write',
    path: '/test.txt',
    content: 'Hello, sandbox!'
  }
);

// Get health status
const health = await sandboxManager.getSessionHealth(sessionId);
console.log(`Memory: ${health.memoryUsage}, CPU: ${health.cpuUsage}`);

// Update limits
await sandboxManager.updateSessionLimits(
  sessionId,
  { memoryLimit: '256m', timeoutMs: 120000 }
);

// Destroy session when done
await sandboxManager.destroySession(sessionId);
await sandboxManager.destroy();
```

### Event Handling

```typescript
const sandboxManager = new SandboxManager();

// Listen to events
sandboxManager.on('session:created', (data) => {
  console.log(`Session created: ${data.sessionId}`);
});

sandboxManager.on('execution:completed', (data) => {
  console.log(`Execution completed in ${data.result.durationMs}ms`);
});

sandboxManager.on('execution:error', (data) => {
  console.error(`Execution error:`, data.error);
});

sandboxManager.on('session:cleanup', (data) => {
  console.log(`Session cleaned up: ${data.sessionId}`);
});

sandboxManager.on('error', (data) => {
  console.error(`Manager error:`, data.error);
});
```

## Resource Limits

### Memory Limits

- **Hard limit**: 512MB
- **Soft limit**: 512MB
- **Swap**: Disabled

### CPU Limits

- **Cores**: 1 CPU core
- **Shares**: 1024 (default)
- **CPU time**: 300 seconds (5 minutes)

### Disk Limits

- **Temporary storage** (`/tmp`): 1GB (noexec, nosuid)
- **Working directory** (`/sandbox`): 1GB (noexec, nosuid)
- **File size**: 1GB maximum per file

### Timeout

- **Default**: 5 minutes (300 seconds)
- **Configurable**: Per session
- **Enforcement**: SIGALRM + kill

### Network

- **Default**: Disabled (`--network none`)
- **Isolation**: Complete network isolation
- **DNS**: Not available

## File Operations

### Read File

```typescript
const content = await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'read',
    path: '/output.txt'
  }
);
console.log(content); // string
```

### Write File

```typescript
await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'write',
    path: '/script.py',
    content: 'print("Hello")'
  }
);
```

### Delete File

```typescript
await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'delete',
    path: '/output.txt'
  }
);
```

### List Files

```typescript
const files = await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'list',
    path: '/'
  }
);
console.log(files); // string[]
```

## Cleanup and Maintenance

### Automatic Cleanup

The SandboxManager automatically:
- Removes sessions inactive for 30 minutes
- Cleans up failed containers
- Purges temporary files
- Triggers every 60 seconds

### Manual Cleanup

```bash
# Run cleanup script
bash docker/sandbox/cleanup.sh

# Check cleanup logs
cat docker/sandbox/cleanup.log

# Manual container removal
docker ps -a | grep sandbox
docker rm -f <container-id>

# Prune unused resources
docker system prune -a --volumes
```

### Health Checks

```bash
# Check container health
bash docker/sandbox/health-check.sh <container-id>

# Output: HEALTHY: Memory=45% CPU=12%
#         UNHEALTHY: Memory usage exceeds threshold: 95%
```

## Docker Compose Deployment

### Start Services

```bash
cd docker/sandbox
docker-compose up -d
```

### Environment Variables

```bash
# Set custom sandbox ID
export SANDBOX_ID="production-sandbox-1"
docker-compose up -d
```

### Configuration

Edit `docker/sandbox/docker-compose.yml` to customize:
- Memory limit: `mem_limit: 512m`
- CPU limit: `cpus: 1`
- Network settings
- Volume mounts
- Environment variables

## Monitoring and Logging

### Container Logs

```bash
# View container logs
docker logs <container-id>

# Follow logs in real-time
docker logs -f <container-id>

# View logs from sandbox services
cat docker/sandbox/cleanup.log
```

### Metrics Collection

```typescript
const sessions = sandboxManager.listSessions();
sessions.forEach(session => {
  console.log(`Session: ${session.sessionId}`);
  console.log(`Created: ${session.createdAt}`);
  console.log(`Last activity: ${session.lastActivityAt}`);
  console.log(`Memory limit: ${session.memoryLimit}`);
  console.log(`CPU limit: ${session.cpuLimit}`);
});
```

## Security Considerations

### Network Isolation

- Network access is disabled by default
- All containers run with `--network none`
- No DNS resolution available
- No outbound connections possible

### Filesystem Security

- Read-only root filesystem
- Non-root user execution (UID 1000)
- No capability grants (CAP_DROP ALL)
- Temporary filesystems with noexec,nosuid flags

### Process Limits

- Maximum 20 processes per session
- CPU time limited to 5 minutes
- Memory limited to 512MB
- Core dumps disabled

### Secret Management

```typescript
// Do NOT pass secrets in commands
// Instead, write them to files before execution
await sandboxManager.fileOperation(
  sessionId,
  {
    type: 'write',
    path: '/.env',
    content: 'API_KEY=secret123'
  }
);

// Then source them in execution
const result = await sandboxManager.executeCommand(
  sessionId,
  'source /.env && python3 app.py'
);
```

## Troubleshooting

### Container Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check image exists
docker image ls | grep sandbox

# Rebuild image
docker build -t claude-agent-sandbox:latest docker/sandbox/
```

### Memory Limit Errors

```bash
# Check actual memory usage
docker stats <container-id>

# Reduce process memory footprint
# - Limit threads: PYTHONUNBUFFERED
# - Use lightweight tools
# - Stream large file processing
```

### Timeout Issues

```typescript
// Increase timeout if needed
await sandboxManager.updateSessionLimits(
  sessionId,
  { timeoutMs: 10 * 60 * 1000 } // 10 minutes
);

// Or override per execution
const result = await sandboxManager.executeCommand(
  sessionId,
  'long-running-command'
);
// Check result.timedOut flag
```

### Disk Space Issues

```bash
# Check disk usage
docker system df

# Clean up dangling resources
docker system prune -a --volumes

# Remove old sandbox containers
docker ps -a --filter "label=sandbox=true" | grep Exited
```

## Performance Optimization

### Image Optimization

- Multi-stage builds reduce final size
- Minimal base image (Ubuntu 22.04)
- Cleaned up package caches
- Removed unnecessary documentation

### Execution Performance

```typescript
// Reuse sessions for multiple commands
const sessionId = await sandboxManager.createSession();

// Multiple executions in same session
for (const command of commands) {
  const result = await sandboxManager.executeCommand(sessionId, command);
  process.stdout.write(result.stdout);
}

// Cleanup once
await sandboxManager.destroySession(sessionId);
```

### Container Pooling

```typescript
// Create pool of ready containers
const pool: string[] = [];
for (let i = 0; i < 5; i++) {
  pool.push(await sandboxManager.createSession());
}

// Reuse from pool
const sessionId = pool.shift();
if (sessionId) {
  const result = await sandboxManager.executeCommand(sessionId, 'command');
  pool.push(sessionId); // Return to pool
}
```

## Further Reading

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Resource Limits Documentation](https://docs.docker.com/config/containers/resource_constraints/)
- [Seccomp Profiles](https://docs.docker.com/engine/security/seccomp/)
- [AppArmor Integration](https://docs.docker.com/engine/security/apparmor/)
