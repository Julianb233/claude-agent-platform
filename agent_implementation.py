#!/usr/bin/env python3
"""
Manus-style AI Agent Implementation using Claude API
Complete agent loop with tool execution framework
"""

import os
import json
import anthropic
from typing import Dict, List, Any, Optional
from datetime import datetime
import subprocess
import docker


class ManusAgent:
    """
    Main agent class implementing the Manus 1.5 architecture
    """
    
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"
        self.max_tokens = 8192
        self.conversation_history = []
        self.current_plan = None
        self.error_count = 0
        self.max_errors = 3
        
        # Initialize Docker client for sandbox
        self.docker_client = docker.from_env()
        
    def get_system_prompt(self) -> str:
        """
        Return the complete Manus system prompt
        """
        return """You are Manus, an autonomous general AI agent capable of completing complex tasks through iterative tool use and strategic planning.

You operate in a sandboxed virtual machine environment with internet access, allowing you to:
* Leverage a clean, isolated workspace that prevents interference and enforces security
* Access shell, text editor, media viewer, web browser, and other software via dedicated tools
* Invoke tools via function calling to complete user-assigned tasks
* Install additional software and dependencies via shell commands
* Accomplish open-ended objectives through step-by-step iteration

<agent_loop>
You are operating in an *agent loop*, iteratively completing tasks through these steps:
1. Analyze context: Understand the user's intent and current state
2. Think: Reason about whether to update the plan, advance the phase, or take a specific action
3. Select tool: Choose the next tool for function calling
4. Execute action: The selected tool will be executed in the sandbox environment
5. Receive observation: The action result will be appended to the context
6. Iterate loop: Repeat until the task is fully completed
7. Deliver outcome: Send results to the user via message tool
</agent_loop>

<tool_use>
- MUST respond with function calling (tool use); direct text responses are forbidden
- MUST follow instructions in tool descriptions for proper usage
- MUST respond with exactly one tool call per response; parallel calling is forbidden
- NEVER mention specific tool names in user-facing messages
</tool_use>

<planning>
- Create task plan using `plan` tool with `update` action at task start
- Break complex tasks into sequential phases
- Phase count scales with complexity: simple (2-3), typical (4-6), complex (10+)
- Each phase should be high-level unit of work, not implementation detail
- Always include final delivery phase
- Use `advance` action when phase is complete
- Update plan when requirements change
- Never skip phases
</planning>

<communication>
- Use `message` tool for all user communication
- `info` type: Non-blocking progress updates
- `ask` type: Request user input (blocks execution)
- `result` type: Deliver final results (ends task)
- Keep messages professional and concise
- Use Markdown formatting
- Attach all deliverable files
</communication>

<execution>
- Execute exactly one tool per iteration
- Wait for tool results before next action
- Learn from errors and adapt strategies
- Max 3 retry attempts before escalating to user
- Save important findings to files immediately
- Test code before delivery
- Clean up temporary resources
</execution>

<format>
- Use GitHub-flavored Markdown
- Write in professional, academic style
- Use complete paragraphs, not excessive bullets
- Use **bold** for emphasis
- Use blockquotes for citations
- Use tables for structured data
- Use inline hyperlinks
- Avoid emojis
</format>

<error_handling>
- Diagnose issues using error messages and context
- Attempt fixes with alternative methods
- Never repeat the same failed action
- After 3 failures, explain to user and request guidance
</error_handling>

The current date is {current_date}.
The default working language is English.
""".format(current_date=datetime.now().strftime("%b %d, %Y"))

    def get_tools(self) -> List[Dict[str, Any]]:
        """
        Define all available tools for function calling
        """
        return [
            {
                "name": "plan",
                "description": "Create, update, and advance the structured task plan",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["update", "advance"],
                            "description": "The action to perform"
                        },
                        "goal": {
                            "type": "string",
                            "description": "The overall goal of the task"
                        },
                        "current_phase_id": {
                            "type": "integer",
                            "description": "ID of the current phase"
                        },
                        "next_phase_id": {
                            "type": "integer",
                            "description": "ID of the next phase (for advance action)"
                        },
                        "phases": {
                            "type": "array",
                            "description": "List of phases",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "integer"},
                                    "title": {"type": "string"},
                                    "capabilities": {"type": "object"}
                                }
                            }
                        }
                    },
                    "required": ["action", "current_phase_id"]
                }
            },
            {
                "name": "message",
                "description": "Send messages to interact with the user",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["info", "ask", "result"],
                            "description": "The type of message"
                        },
                        "text": {
                            "type": "string",
                            "description": "The message text"
                        },
                        "attachments": {
                            "type": "array",
                            "description": "List of file paths to attach",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["type", "text"]
                }
            },
            {
                "name": "shell",
                "description": "Execute shell commands in sandbox environment",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["exec", "view"],
                            "description": "The action to perform"
                        },
                        "command": {
                            "type": "string",
                            "description": "The shell command to execute"
                        },
                        "session": {
                            "type": "string",
                            "description": "Session identifier"
                        },
                        "timeout": {
                            "type": "integer",
                            "description": "Timeout in seconds",
                            "default": 30
                        }
                    },
                    "required": ["action", "session"]
                }
            },
            {
                "name": "file",
                "description": "Perform operations on files",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["read", "write", "append", "edit"],
                            "description": "The action to perform"
                        },
                        "path": {
                            "type": "string",
                            "description": "Absolute file path"
                        },
                        "text": {
                            "type": "string",
                            "description": "Content to write or append"
                        },
                        "edits": {
                            "type": "array",
                            "description": "List of edits to make",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "find": {"type": "string"},
                                    "replace": {"type": "string"}
                                }
                            }
                        }
                    },
                    "required": ["action", "path"]
                }
            }
        ]
    
    def execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> str:
        """
        Execute a tool and return the result
        """
        try:
            if tool_name == "plan":
                return self.execute_plan(tool_input)
            elif tool_name == "message":
                return self.execute_message(tool_input)
            elif tool_name == "shell":
                return self.execute_shell(tool_input)
            elif tool_name == "file":
                return self.execute_file(tool_input)
            else:
                return f"Error: Unknown tool '{tool_name}'"
        except Exception as e:
            self.error_count += 1
            return f"Error executing {tool_name}: {str(e)}"
    
    def execute_plan(self, params: Dict[str, Any]) -> str:
        """
        Handle task planning
        """
        action = params.get("action")
        
        if action == "update":
            self.current_plan = {
                "goal": params.get("goal"),
                "phases": params.get("phases", []),
                "current_phase_id": params.get("current_phase_id")
            }
            return json.dumps({
                "status": "success",
                "message": "Task plan updated",
                "plan": self.current_plan
            })
        
        elif action == "advance":
            if self.current_plan:
                self.current_plan["current_phase_id"] = params.get("next_phase_id")
                return json.dumps({
                    "status": "success",
                    "message": "Advanced to next phase",
                    "current_phase_id": self.current_plan["current_phase_id"]
                })
            return json.dumps({"status": "error", "message": "No active plan"})
        
        return json.dumps({"status": "error", "message": "Invalid action"})
    
    def execute_message(self, params: Dict[str, Any]) -> str:
        """
        Handle user messages
        """
        msg_type = params.get("type")
        text = params.get("text")
        attachments = params.get("attachments", [])
        
        print(f"\n[{msg_type.upper()}] {text}")
        
        if attachments:
            print(f"Attachments: {', '.join(attachments)}")
        
        if msg_type == "ask":
            # Get user input
            user_input = input("\nYour response: ")
            return json.dumps({"status": "success", "user_response": user_input})
        
        return json.dumps({"status": "success", "message": "Message sent"})
    
    def execute_shell(self, params: Dict[str, Any]) -> str:
        """
        Execute shell commands in Docker sandbox
        """
        action = params.get("action")
        
        if action == "exec":
            command = params.get("command")
            timeout = params.get("timeout", 30)
            
            try:
                # Run in Docker container
                container = self.docker_client.containers.run(
                    "ubuntu:22.04",
                    command=f"bash -c '{command}'",
                    detach=False,
                    remove=True,
                    mem_limit="512m",
                    cpu_quota=100000,
                    network_mode="bridge"
                )
                
                output = container.decode() if isinstance(container, bytes) else str(container)
                
                return json.dumps({
                    "status": "success",
                    "output": output,
                    "exit_code": 0
                })
            
            except docker.errors.ContainerError as e:
                return json.dumps({
                    "status": "error",
                    "output": e.stderr.decode(),
                    "exit_code": e.exit_status
                })
            
            except Exception as e:
                return json.dumps({
                    "status": "error",
                    "message": str(e)
                })
        
        return json.dumps({"status": "error", "message": "Invalid action"})
    
    def execute_file(self, params: Dict[str, Any]) -> str:
        """
        Handle file operations
        """
        action = params.get("action")
        path = params.get("path")
        
        try:
            if action == "read":
                with open(path, "r") as f:
                    content = f.read()
                return json.dumps({
                    "status": "success",
                    "content": content,
                    "path": path
                })
            
            elif action == "write":
                text = params.get("text", "")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w") as f:
                    f.write(text)
                return json.dumps({
                    "status": "success",
                    "message": f"File written: {path}"
                })
            
            elif action == "append":
                text = params.get("text", "")
                with open(path, "a") as f:
                    f.write(text)
                return json.dumps({
                    "status": "success",
                    "message": f"Content appended to: {path}"
                })
            
            elif action == "edit":
                edits = params.get("edits", [])
                with open(path, "r") as f:
                    content = f.read()
                
                for edit in edits:
                    content = content.replace(edit["find"], edit["replace"])
                
                with open(path, "w") as f:
                    f.write(content)
                
                return json.dumps({
                    "status": "success",
                    "message": f"File edited: {path}"
                })
            
            return json.dumps({"status": "error", "message": "Invalid action"})
        
        except Exception as e:
            return json.dumps({
                "status": "error",
                "message": str(e)
            })
    
    def run(self, user_message: str, max_iterations: int = 50) -> str:
        """
        Main agent loop
        """
        # Initialize conversation
        self.conversation_history = [
            {"role": "user", "content": user_message}
        ]
        
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"\n{'='*60}")
            print(f"Iteration {iteration}")
            print(f"{'='*60}")
            
            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=self.get_system_prompt(),
                tools=self.get_tools(),
                messages=self.conversation_history
            )
            
            print(f"\nStop Reason: {response.stop_reason}")
            
            # Check if task is complete
            if response.stop_reason == "end_turn":
                print("\nTask completed (no tool use)")
                break
            
            # Process tool use
            if response.stop_reason == "tool_use":
                # Find tool use block
                tool_use = None
                for block in response.content:
                    if block.type == "tool_use":
                        tool_use = block
                        break
                
                if not tool_use:
                    print("No tool use found in response")
                    break
                
                print(f"\nTool: {tool_use.name}")
                print(f"Input: {json.dumps(tool_use.input, indent=2)}")
                
                # Execute tool
                result = self.execute_tool(tool_use.name, tool_use.input)
                print(f"\nResult: {result}")
                
                # Add to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": response.content
                })
                
                self.conversation_history.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_use.id,
                            "content": result
                        }
                    ]
                })
                
                # Check if this was a result message (task complete)
                if tool_use.name == "message" and tool_use.input.get("type") == "result":
                    print("\n✓ Task completed successfully!")
                    return tool_use.input.get("text")
                
                # Check error count
                if self.error_count >= self.max_errors:
                    print(f"\n✗ Max errors ({self.max_errors}) reached. Stopping.")
                    break
            
            else:
                print(f"\nUnexpected stop reason: {response.stop_reason}")
                break
        
        if iteration >= max_iterations:
            print(f"\n✗ Max iterations ({max_iterations}) reached. Stopping.")
        
        return "Task incomplete or error occurred"


def main():
    """
    Example usage
    """
    # Get API key from environment
    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        print("Error: CLAUDE_API_KEY environment variable not set")
        return
    
    # Create agent
    agent = ManusAgent(api_key)
    
    # Example tasks
    tasks = [
        "Create a Python script that calculates the first 10 Fibonacci numbers",
        "Write a simple TODO list manager in Python with add, remove, and list functions",
        "Create a markdown document explaining what recursion is with examples"
    ]
    
    # Run a task
    print("="*60)
    print("MANUS AI AGENT - CLAUDE IMPLEMENTATION")
    print("="*60)
    
    task = tasks[0]  # Change index to try different tasks
    print(f"\nTask: {task}\n")
    
    result = agent.run(task)
    
    print("\n" + "="*60)
    print("FINAL RESULT")
    print("="*60)
    print(result)


if __name__ == "__main__":
    main()
