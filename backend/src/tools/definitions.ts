import type Anthropic from '@anthropic-ai/sdk';

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'plan',
    description: 'Create, update, and advance the structured task plan',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update', 'advance'],
          description: 'The action to perform'
        },
        goal: {
          type: 'string',
          description: 'The overall goal of the task (required for update action)'
        },
        current_phase_id: {
          type: 'integer',
          description: 'ID of the current phase'
        },
        next_phase_id: {
          type: 'integer',
          description: 'ID of the next phase (required for advance action)'
        },
        phases: {
          type: 'array',
          description: 'List of phases (required for update action)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              capabilities: { type: 'object' }
            },
            required: ['id', 'title', 'capabilities']
          }
        }
      },
      required: ['action', 'current_phase_id']
    }
  },
  {
    name: 'message',
    description: 'Send messages to interact with the user',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['info', 'ask', 'result'],
          description: 'The type of message'
        },
        text: {
          type: 'string',
          description: 'The message text'
        },
        attachments: {
          type: 'array',
          description: 'List of file paths to attach',
          items: { type: 'string' }
        }
      },
      required: ['type', 'text']
    }
  },
  {
    name: 'shell',
    description: 'Execute shell commands in sandbox environment',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['exec', 'view', 'wait', 'send', 'kill'],
          description: 'The action to perform'
        },
        command: {
          type: 'string',
          description: 'The shell command to execute (required for exec action)'
        },
        session: {
          type: 'string',
          description: 'Session identifier'
        },
        timeout: {
          type: 'integer',
          description: 'Timeout in seconds (default: 30)'
        },
        input: {
          type: 'string',
          description: 'Input to send to process (required for send action)'
        }
      },
      required: ['action', 'session']
    }
  },
  {
    name: 'file',
    description: 'Perform operations on files in the sandbox',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'view', 'write', 'append', 'edit'],
          description: 'The action to perform'
        },
        path: {
          type: 'string',
          description: 'Absolute file path'
        },
        text: {
          type: 'string',
          description: 'Content to write or append'
        },
        range: {
          type: 'array',
          description: 'Line or page range [start, end]',
          items: { type: 'integer' }
        },
        edits: {
          type: 'array',
          description: 'List of edits to make',
          items: {
            type: 'object',
            properties: {
              find: { type: 'string' },
              replace: { type: 'string' },
              all: { type: 'boolean' }
            },
            required: ['find', 'replace']
          }
        }
      },
      required: ['action', 'path']
    }
  },
  {
    name: 'match',
    description: 'Find files or text using pattern matching',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['glob', 'grep'],
          description: 'The action to perform'
        },
        scope: {
          type: 'string',
          description: 'Glob pattern for file scope'
        },
        regex: {
          type: 'string',
          description: 'Regex pattern to match (required for grep action)'
        },
        leading: {
          type: 'integer',
          description: 'Lines before match (default: 0)'
        },
        trailing: {
          type: 'integer',
          description: 'Lines after match (default: 0)'
        }
      },
      required: ['action', 'scope']
    }
  }
];
