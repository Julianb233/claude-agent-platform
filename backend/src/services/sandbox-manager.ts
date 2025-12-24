import { EventEmitter } from 'events';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface SandboxSession {
  sessionId: string;
  containerId: string;
  createdAt: Date;
  lastActivityAt: Date;
  memoryLimit: string;
  cpuLimit: string;
  diskLimit: string;
  timeoutMs: number;
  isActive: boolean;
}

interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
  recursive?: boolean;
}

/**
 * SandboxManager - Manages isolated Docker sandbox environments for agent code execution
 * 
 * Features:
 * - Session lifecycle management (create, destroy)
 * - Resource-limited code execution
 * - File operations within sandbox
 * - Health monitoring and automatic cleanup
 * - Timeout enforcement (5 minutes default)
 */
export class SandboxManager extends EventEmitter {
  private sessions: Map<string, SandboxSession> = new Map();
  private dockerImageName: string = 'claude-agent-sandbox:latest';
  private baseMemoryLimit: string = '512m';
  private baseCpuLimit: string = '1';
  private baseTimeoutMs: number = 5 * 60 * 1000; // 5 minutes
  private diskLimitGb: number = 1;
  private cleanupIntervalMs: number = 60 * 1000; // 1 minute
  private maxSessionAge: number = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeCleanupTask();
  }

  /**
   * Initialize periodic cleanup of inactive sessions
   */
  private initializeCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.cleanupIntervalMs);
  }

  /**
   * Destroy manager and clean up resources
   */
  public async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clean up all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      try {
        await this.destroySession(sessionId);
      } catch (error) {
        this.emit('error', { sessionId, error });
      }
    }
  }

  /**
   * Create a new sandbox session
   * @returns Session ID for future operations
   */
  public async createSession(): Promise<string> {
    const sessionId = this.generateSessionId();
    const containerId = await this.createContainer();

    const session: SandboxSession = {
      sessionId,
      containerId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      memoryLimit: this.baseMemoryLimit,
      cpuLimit: this.baseCpuLimit,
      diskLimit: `${this.diskLimitGb}gb`,
      timeoutMs: this.baseTimeoutMs,
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId, containerId });

    return sessionId;
  }

  /**
   * Destroy a sandbox session and clean up container
   */
  public async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Stop and remove container
      await this.stopContainer(session.containerId);
      await this.removeContainer(session.containerId);

      session.isActive = false;
      this.sessions.delete(sessionId);
      this.emit('session:destroyed', { sessionId });
    } catch (error) {
      this.emit('error', { sessionId, operation: 'destroy', error });
      throw error;
    }
  }

  /**
   * Execute a command in the sandbox with timeout enforcement
   */
  public async executeCommand(
    sessionId: string,
    command: string,
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<ExecutionResult> {
    const session = this.validateSession(sessionId);
    session.lastActivityAt = new Date();

    const startTime = Date.now();
    const timeout = session.timeoutMs;

    try {
      const { stdout, stderr } = await this.executeInContainer(
        session.containerId,
        command,
        timeout,
        options
      );

      const durationMs = Date.now() - startTime;
      const result: ExecutionResult = {
        exitCode: 0,
        stdout,
        stderr,
        durationMs,
        timedOut: false,
      };

      this.emit('execution:completed', { sessionId, result });
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const timedOut = error.killed === true || error.code === 'ETIMEDOUT';

      const result: ExecutionResult = {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || 'Unknown error',
        durationMs,
        timedOut,
      };

      this.emit('execution:error', { sessionId, error: result });
      return result;
    }
  }

  /**
   * Perform file operations within sandbox
   */
  public async fileOperation(
    sessionId: string,
    operation: FileOperation
  ): Promise<string | Buffer | string[] | null> {
    const session = this.validateSession(sessionId);
    session.lastActivityAt = new Date();

    const sandboxPath = `/sandbox${operation.path}`;

    try {
      switch (operation.type) {
        case 'read':
          return await this.readFileInContainer(session.containerId, sandboxPath);
        case 'write':
          if (!operation.content) {
            throw new Error('Content required for write operation');
          }
          await this.writeFileInContainer(
            session.containerId,
            sandboxPath,
            operation.content
          );
          return null;
        case 'delete':
          await this.deleteFileInContainer(
            session.containerId,
            sandboxPath,
            operation.recursive
          );
          return null;
        case 'list':
          return await this.listFilesInContainer(session.containerId, sandboxPath);
        default:
          throw new Error(`Unknown operation: ${(operation as any).type}`);
      }
    } catch (error) {
      this.emit('file-operation:error', { sessionId, operation, error });
      throw error;
    }
  }

  /**
   * Get sandbox session health status
   */
  public async getSessionHealth(sessionId: string): Promise<Record<string, any>> {
    const session = this.validateSession(sessionId);

    try {
      const { stdout } = await execAsync(
        `docker stats ${session.containerId} --no-stream --format "{{json .}}"`
      );

      const stats = JSON.parse(stdout);

      return {
        sessionId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        memoryUsage: stats.MemUsage || 'N/A',
        cpuUsage: stats.CPUPercentage || 'N/A',
        containerStatus: stats.State || 'running',
      };
    } catch (error) {
      return {
        sessionId,
        isActive: session.isActive,
        error: 'Failed to retrieve health status',
      };
    }
  }

  /**
   * Update session resource limits
   */
  public async updateSessionLimits(
    sessionId: string,
    limits: { memoryLimit?: string; cpuLimit?: string; timeoutMs?: number }
  ): Promise<void> {
    const session = this.validateSession(sessionId);

    if (limits.memoryLimit) {
      session.memoryLimit = limits.memoryLimit;
    }
    if (limits.cpuLimit) {
      session.cpuLimit = limits.cpuLimit;
    }
    if (limits.timeoutMs) {
      session.timeoutMs = limits.timeoutMs;
    }

    // Update container memory limit
    if (limits.memoryLimit) {
      try {
        await execAsync(
          `docker update --memory ${limits.memoryLimit} ${session.containerId}`
        );
      } catch (error) {
        throw new Error(`Failed to update memory limit: ${error}`);
      }
    }

    this.emit('session:limits-updated', { sessionId, limits });
  }

  /**
   * Get all active sessions
   */
  public listSessions(): SandboxSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  // Private helper methods

  private validateSession(sessionId: string): SandboxSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (!session.isActive) {
      throw new Error(`Session is not active: ${sessionId}`);
    }
    return session;
  }

  private generateSessionId(): string {
    return `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createContainer(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker run -d --memory ${this.baseMemoryLimit} ` +
          `--cpus ${this.baseCpuLimit} ` +
          `--network none ` +
          `--read-only ` +
          `--tmpfs /tmp:size=1gb,noexec,nosuid ` +
          `--tmpfs /sandbox:size=1gb,noexec,nosuid ` +
          `${this.dockerImageName}`
      );
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to create container: ${error}`);
    }
  }

  private async stopContainer(containerId: string): Promise<void> {
    try {
      await execAsync(`docker stop -t 5 ${containerId}`);
    } catch (error) {
      // Container might already be stopped
      console.warn(`Failed to stop container: ${error}`);
    }
  }

  private async removeContainer(containerId: string): Promise<void> {
    try {
      await execAsync(`docker rm -f ${containerId}`);
    } catch (error) {
      throw new Error(`Failed to remove container: ${error}`);
    }
  }

  private async executeInContainer(
    containerId: string,
    command: string,
    timeout: number,
    options: { cwd?: string; env?: Record<string, string> }
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const execCmd = `docker exec ${containerId} bash -c '${command.replace(/'/g, "'\\''")}' `;
      const timer = setTimeout(
        () => {
          reject(new Error('Execution timeout exceeded'));
        },
        timeout
      );

      exec(execCmd, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error) {
          reject({ ...error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  private async readFileInContainer(containerId: string, filePath: string): Promise<string> {
    const { stdout } = await execAsync(`docker exec ${containerId} cat "${filePath}"`);
    return stdout;
  }

  private async writeFileInContainer(
    containerId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const escapedContent = content.replace(/'/g, "'\\''")
    await execAsync(`docker exec ${containerId} bash -c 'cat > "${filePath}" << \'EOF\'\n${escapedContent}\nEOF'`);
  }

  private async deleteFileInContainer(
    containerId: string,
    filePath: string,
    recursive?: boolean
  ): Promise<void> {
    const rmFlags = recursive ? '-rf' : '-f';
    await execAsync(`docker exec ${containerId} rm ${rmFlags} "${filePath}"`);
  }

  private async listFilesInContainer(containerId: string, dirPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`docker exec ${containerId} find "${dirPath}" -type f`);
      return stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\/sandbox/, ''));
    } catch {
      return [];
    }
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToClean: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.lastActivityAt.getTime();
      if (sessionAge > this.maxSessionAge) {
        sessionsToClean.push(sessionId);
      }
    }

    for (const sessionId of sessionsToClean) {
      try {
        await this.destroySession(sessionId);
        this.emit('session:cleanup', { sessionId });
      } catch (error) {
        this.emit('error', { sessionId, operation: 'cleanup', error });
      }
    }
  }
}

export default SandboxManager;
