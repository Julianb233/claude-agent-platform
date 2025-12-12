# Claude AI Agent Platform

A complete AI agent platform powered by Claude API that replicates the Manus 1.5 tech stack with full functionality including agent loop, tool framework, code execution, sandbox environment, and web interface.

## 🚀 Features

- **Agent Loop System**: Iterative task completion with planning, execution, and observation cycles
- **Tool Framework**: Extensible function calling system with 15+ built-in tools
- **Sandbox Execution**: Isolated code execution environment for Python, Node.js, and shell commands
- **File Management**: Complete file operations with multimodal understanding
- **Web Browser Automation**: Headless browser control for web scraping and automation
- **Search Integration**: Multi-source search (web, images, APIs, news, research papers)
- **Database Operations**: Full CRUD with PostgreSQL/SQLite support
- **User Authentication**: OAuth integration and session management
- **Real-time Updates**: WebSocket support for live agent status
- **Web Interface**: Modern React dashboard for monitoring and interaction

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 22.x with TypeScript
- **Framework**: Express.js with async/await patterns
- **API Integration**: Claude API (Anthropic SDK)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT + OAuth 2.0
- **WebSockets**: Socket.io for real-time communication
- **Process Management**: Child processes for sandbox isolation

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Routing**: React Router v6
- **UI Components**: Shadcn/ui + Radix UI
- **Code Editor**: Monaco Editor (VS Code editor)
- **Markdown**: React Markdown with syntax highlighting

### Sandbox Environment
- **Isolation**: Docker containers with resource limits
- **Languages**: Python 3.11, Node.js 22, Bash
- **Package Managers**: pip, npm, pnpm
- **File System**: Virtual filesystem with quota management
- **Security**: Restricted network access, read-only system files

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2 for production
- **Logging**: Winston + Morgan
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
claude-agent-platform/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── api/            # REST API routes
│   │   ├── agent/          # Agent loop implementation
│   │   ├── tools/          # Tool framework and implementations
│   │   ├── sandbox/        # Sandbox execution engine
│   │   ├── claude/         # Claude API integration
│   │   ├── db/             # Database models and migrations
│   │   ├── auth/           # Authentication middleware
│   │   └── websocket/      # WebSocket handlers
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client
│   │   ├── store/          # State management
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── sandbox/                # Sandbox Docker configuration
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # System architecture
│   ├── API.md              # API documentation
│   ├── TOOLS.md            # Tool framework guide
│   └── DEPLOYMENT.md       # Deployment guide
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🛠️ Installation

### Prerequisites

- Node.js 22.x or higher
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Claude API key from Anthropic

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Julianb233/claude-agent-platform.git
   cd claude-agent-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Claude API key
   ```

3. **Start with Docker Compose** (Recommended)
   ```bash
   docker-compose up -d
   ```

4. **Or run locally**
   ```bash
   # Backend
   cd backend
   npm install
   npm run dev

   # Frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs

## 🔧 Configuration

### Environment Variables

```env
# Claude API
CLAUDE_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/claude_agent
DB_POOL_SIZE=20

# Authentication
JWT_SECRET=your_jwt_secret_here
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret

# Server
PORT=3000
NODE_ENV=development

# Sandbox
SANDBOX_TIMEOUT=300000
SANDBOX_MEMORY_LIMIT=512m
SANDBOX_CPU_LIMIT=1

# Frontend
VITE_API_URL=http://localhost:3000
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📚 Core Concepts

### Agent Loop

The agent loop is the heart of the platform, implementing an iterative cycle:

1. **Analyze Context**: Understand user intent and current state
2. **Plan**: Create or update task plan with phases
3. **Think**: Reason about next action
4. **Select Tool**: Choose appropriate tool for function calling
5. **Execute**: Run the tool in sandbox environment
6. **Observe**: Receive and process results
7. **Iterate**: Repeat until task completion

### Tool Framework

Tools are modular functions that extend agent capabilities:

- **Shell**: Execute shell commands in sandbox
- **File**: Read, write, edit files with multimodal support
- **Browser**: Automate web browsing and scraping
- **Search**: Multi-source information retrieval
- **Database**: CRUD operations on structured data
- **Generate**: AI-powered content generation
- **Schedule**: Task scheduling and automation

### Sandbox Security

- Isolated Docker containers per execution
- Resource limits (CPU, memory, disk)
- Network restrictions
- Read-only system files
- Automatic cleanup after timeout

## 🚢 Deployment

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Manus 1.5 platform architecture
- Powered by Anthropic's Claude API
- Built with modern web technologies

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ by the community**
