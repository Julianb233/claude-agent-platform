/**
 * Core type definitions for the Claude Agent Platform
 */

export interface AgentConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  maxIterations: number;
  maxErrors: number;
}

export interface TaskPlan {
  goal: string;
  phases: Phase[];
  currentPhaseId: number;
}

export interface Phase {
  id: number;
  title: string;
  capabilities: Capabilities;
}

export interface Capabilities {
  technical_writing?: boolean;
  creative_writing?: boolean;
  data_analysis?: boolean;
  deep_research?: boolean;
  image_processing?: boolean;
  media_generation?: boolean;
  parallel_processing?: boolean;
  web_development?: boolean;
  slides_content_writing?: boolean;
  slides_generation?: boolean;
}

export type MessageType = 'info' | 'ask' | 'result';

export interface Message {
  type: MessageType;
  text: string;
  attachments?: string[];
}

export type ToolAction = 'update' | 'advance' | 'exec' | 'wait' | 'send' | 'kill' | 'view' | 'read' | 'write' | 'append' | 'edit' | 'glob' | 'grep';

export interface ToolInput {
  action: ToolAction;
  [key: string]: any;
}

export interface ToolResult {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  output?: string;
  exitCode?: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: any;
}

export interface AgentExecution {
  id: string;
  userId?: string;
  task: string;
  status: 'running' | 'completed' | 'failed';
  plan?: TaskPlan;
  iterations: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
  result?: string;
  conversationHistory: ConversationMessage[];
}

export interface SandboxSession {
  id: string;
  containerId?: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  lastUsed: Date;
}

export interface WebSocketMessage {
  type: 'status' | 'iteration' | 'tool_use' | 'result' | 'error';
  data: any;
  timestamp: Date;
}
