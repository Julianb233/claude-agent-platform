/**
 * Sandbox Types and Interfaces
 * Defines type definitions for Docker sandbox functionality
 */

/**
 * Resource limits for sandbox execution
 */
export interface SandboxResourceLimits {
  /** Memory limit in megabytes (default: 512) */
  memoryMb?: number;
  /** CPU limit in cores (default: 1) */
  cpuCores?: number;
  /** Disk limit in gigabytes (default: 1) */
  diskGb?: number;
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeoutMs?: number;
}

/**
 * Configuration for sandbox execution environment
 */
export interface SandboxConfig {
  /** Unique session identifier */
  sessionId: string;
  /** Docker container ID */
  containerId: string;
  /** Resource limits */
  resourceLimits: SandboxResourceLimits;
  /** Environment variables */
  environment?: Record<string, string>;
  /** Working directory inside sandbox */
  workingDir?: string;
  /** Enable network access */
  networkEnabled?: boolean;
  /** Custom entrypoint */
  entrypoint?: string[];
}

/**
 * Result of command execution in sandbox
 */
export interface ExecutionResult {
  /** Process exit code (0 = success) */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether execution timed out */
  timedOut: boolean;
  /** Timestamp of execution */
  timestamp?: Date;
}

/**
 * File operation in sandbox
 */
export interface SandboxFileOperation {
  /** Type of operation */
  type: 'read' | 'write' | 'delete' | 'list' | 'copy' | 'move';
  /** Source path (relative to /sandbox) */
  path: string;
  /** Destination path (for copy/move operations) */
  destination?: string;
  /** File content (for write operations) */
  content?: string | Buffer;
  /** Whether to operate recursively (for delete/list) */
  recursive?: boolean;
  /** File permissions (octal format, for write operations) */
  permissions?: string;
}

/**
 * Result of file operation
 */
export interface FileOperationResult {
  /** Operation success status */
  success: boolean;
  /** Operation type performed */
  type: string;
  /** Result data */
  data?: string | string[] | Buffer | null;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Sandbox session information
 */
export interface SandboxSession {
  /** Unique session identifier */
  sessionId: string;
  /** Docker container ID */
  containerId: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Whether session is active */
  isActive: boolean;
  /** Resource limits applied */
  resourceLimits: SandboxResourceLimits;
  /** Number of executions in session */
  executionCount?: number;
  /** Total execution time in milliseconds */
  totalExecutionTimeMs?: number;
}

/**
 * Sandbox health status
 */
export interface SandboxHealthStatus {
  /** Session identifier */
  sessionId: string;
  /** Whether container is running */
  isRunning: boolean;
  /** Whether session is active */
  isActive: boolean;
  /** Memory usage in bytes */
  memoryUsageBytes?: number;
  /** Memory limit in bytes */
  memoryLimitBytes?: number;
  /** CPU usage percentage */
  cpuPercentage?: number;
  /** Disk usage in bytes */
  diskUsageBytes?: number;
  /** Container status */
  containerStatus?: string;
  /** Health check result */
  healthCheckResult?: string;
  /** Last health check timestamp */
  lastHealthCheckAt?: Date;
  /** Number of running processes */
  processCount?: number;
}

/**
 * Sandbox metrics and statistics
 */
export interface SandboxMetrics {
  /** Total sessions created */
  totalSessionsCreated: number;
  /** Active sessions */
  activeSessions: number;
  /** Total commands executed */
  totalCommandsExecuted: number;
  /** Total execution time in milliseconds */
  totalExecutionTimeMs: number;
  /** Average execution time in milliseconds */
  averageExecutionTimeMs: number;
  /** Total timeouts */
  totalTimeouts: number;
  /** Total errors */
  totalErrors: number;
  /** Average memory usage in bytes */
  averageMemoryUsageBytes: number;
  /** Peak memory usage in bytes */
  peakMemoryUsageBytes: number;
}

/**
 * Options for sandbox execution
 */
export interface SandboxExecutionOptions {
  /** Working directory inside sandbox */
  workingDir?: string;
  /** Environment variables to set */
  environment?: Record<string, string>;
  /** Inherit parent environment */
  inheritEnv?: boolean;
  /** Shell to use for command execution */
  shell?: string;
  /** Timeout override in milliseconds */
  timeout?: number;
  /** Whether to capture output */
  captureOutput?: boolean;
  /** Maximum output size in bytes */
  maxOutputSize?: number;
}

/**
 * Sandbox event types
 */
export type SandboxEventType =
  | 'session:created'
  | 'session:destroyed'
  | 'session:cleanup'
  | 'session:limits-updated'
  | 'execution:started'
  | 'execution:completed'
  | 'execution:error'
  | 'execution:timeout'
  | 'file-operation:started'
  | 'file-operation:completed'
  | 'file-operation:error'
  | 'health:check'
  | 'error';

/**
 * Sandbox event data
 */
export interface SandboxEvent {
  /** Event type */
  type: SandboxEventType;
  /** Session identifier */
  sessionId?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data?: Record<string, any>;
  /** Error information if applicable */
  error?: Error | string;
}

/**
 * Sandbox manager configuration
 */
export interface SandboxManagerConfig {
  /** Docker image name */
  imageName: string;
  /** Default memory limit in MB */
  defaultMemoryMb: number;
  /** Default CPU limit in cores */
  defaultCpuCores: number;
  /** Default timeout in milliseconds */
  defaultTimeoutMs: number;
  /** Default disk limit in GB */
  defaultDiskGb: number;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
  /** Maximum session age in milliseconds */
  maxSessionAgeMs: number;
  /** Enable automatic cleanup */
  autoCleanup: boolean;
  /** Maximum concurrent sessions */
  maxConcurrentSessions: number;
  /** Docker socket path */
  dockerSocketPath?: string;
}

/**
 * Error types for sandbox operations
 */
export class SandboxError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class SessionNotFoundError extends SandboxError {
  constructor(sessionId: string) {
    super('SESSION_NOT_FOUND', `Session not found: ${sessionId}`);
  }
}

export class ExecutionTimeoutError extends SandboxError {
  constructor(sessionId: string, timeoutMs: number) {
    super('EXECUTION_TIMEOUT', `Execution timeout after ${timeoutMs}ms`, { sessionId, timeoutMs });
  }
}

export class ResourceLimitExceededError extends SandboxError {
  constructor(resource: string, limit: number, current: number) {
    super('RESOURCE_LIMIT_EXCEEDED', `${resource} limit exceeded: ${current} > ${limit}`, {
      resource,
      limit,
      current,
    });
  }
}
