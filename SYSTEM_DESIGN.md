# view0x - System Design Document

## 📋 Table of Contents
- [Executive Overview](#executive-overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Security Architecture](#security-architecture)
- [Scalability & Performance](#scalability--performance)
- [Deployment Architecture](#deployment-architecture)
- [Monitoring & Observability](#monitoring--observability)

## 🎯 Executive Overview

### System Purpose
view0x is a cloud-native SaaS platform for automated smart contract security analysis, providing developers with comprehensive vulnerability detection, gas optimization suggestions, and code quality assessments.

### Key Requirements
- **Performance**: Analyze contracts in < 30 seconds
- **Scalability**: Handle 1000+ concurrent analyses
- **Reliability**: 99.9% uptime with fault tolerance
- **Security**: Enterprise-grade data protection
- **Usability**: Intuitive UI for both beginners and experts

### Technology Stack
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
Backend:   Node.js + Express.js + TypeScript + Bull Queue
Analysis:  Python (Slither) + Node.js (Solhint)
Database:  PostgreSQL + Redis
Deploy:    Docker + Kubernetes/Railway + Cloudflare
```

## 🏛️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Web Client    │  Mobile Client  │   VS Code Ext   │    API    │
│   (React SPA)   │   (Future)      │   (Future)      │   Docs    │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                │
                    ┌───────────────────────┐
                    │    CDN + WAF          │
                    │   (Cloudflare)        │
                    └───────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  API Gateway    │   Auth Service  │  WebSocket      │   File    │
│  (Rate Limit)   │   (JWT + OAuth) │   Service       │  Service  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       BUSINESS LAYER                            │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Analysis      │   Report        │   Notification  │   User    │
│  Orchestrator   │   Generator     │    Service      │  Service  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        WORKER LAYER                             │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Slither       │    Solhint      │    MythX        │   Custom  │
│   Workers       │    Workers      │   Workers       │  Workers  │
│  (Python)       │   (Node.js)     │  (API Call)     │(Node.js)  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   PostgreSQL    │     Redis       │   File Storage  │  Metrics  │
│  (Primary DB)   │ (Cache + Queue) │  (Contract Code)│    DB     │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Service Mesh Architecture
```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Cloudflare)  │
                    └─────────────────┘
                            │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Rate Limiter) │
                    └─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼───────┐   ┌──────▼───────┐
│ Auth Service │   │ Analysis Service│   │ User Service │
│ (Stateless)  │   │   (Stateless)   │   │ (Stateless)  │
└──────────────┘   └────────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │ Message Queue │
                    │    (Redis)    │
                    └───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼───────┐   ┌──────▼───────┐
│Slither Worker│   │Solhint Worker  │   │Report Worker │
│  (Python)    │   │   (Node.js)    │   │  (Node.js)   │
└──────────────┘   └────────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   PostgreSQL  │
                    │   (Database)  │
                    └───────────────┘
```

## 🔧 Component Design

### Frontend Architecture
```
src/
├── components/
│   ├── ui/                     # Reusable UI components (shadcn/ui)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── layout/                 # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── analysis/               # Analysis-specific components
│   │   ├── ContractUploader.tsx
│   │   ├── AnalysisProgress.tsx
│   │   ├── VulnerabilityList.tsx
│   │   ├── ReportViewer.tsx
│   │   └── CodeHighlighter.tsx
│   ├── dashboard/              # Dashboard components
│   │   ├── AnalysisHistory.tsx
│   │   ├── UsageMetrics.tsx
│   │   └── TeamManagement.tsx
│   └── auth/                   # Authentication components
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       └── PasswordReset.tsx
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts
│   ├── useAnalysis.ts
│   ├── useWebSocket.ts
│   └── useLocalStorage.ts
├── services/                   # API and external services
│   ├── api.ts
│   ├── websocket.ts
│   ├── auth.ts
│   └── storage.ts
├── stores/                     # State management (Zustand)
│   ├── authStore.ts
│   ├── analysisStore.ts
│   └── uiStore.ts
├── utils/                      # Utility functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
└── types/                      # TypeScript type definitions
    ├── api.ts
    ├── analysis.ts
    └── user.ts
```

### Backend Architecture
```
src/
├── api/                        # API route handlers
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   └── refresh.ts
│   ├── analysis/
│   │   ├── create.ts
│   │   ├── status.ts
│   │   ├── result.ts
│   │   └── history.ts
│   ├── users/
│   │   ├── profile.ts
│   │   ├── settings.ts
│   │   └── usage.ts
│   └── admin/
│       ├── users.ts
│       └── analytics.ts
├── services/                   # Business logic services
│   ├── AnalysisOrchestrator.ts
│   ├── SlitherService.ts
│   ├── SolhintService.ts
│   ├── ReportGenerator.ts
│   ├── NotificationService.ts
│   └── FileService.ts
├── workers/                    # Background job processors
│   ├── analysisWorker.ts
│   ├── reportWorker.ts
│   └── cleanupWorker.ts
├── models/                     # Database models (Sequelize/Prisma)
│   ├── User.ts
│   ├── Analysis.ts
│   ├── Contract.ts
│   ├── Vulnerability.ts
│   └── Report.ts
├── middleware/                 # Express middleware
│   ├── auth.ts
│   ├── rateLimit.ts
│   ├── validation.ts
│   ├── logging.ts
│   └── errorHandler.ts
├── utils/                      # Utility functions
│   ├── database.ts
│   ├── redis.ts
│   ├── logger.ts
│   ├── encryption.ts
│   └── validators.ts
├── config/                     # Configuration files
│   ├── database.ts
│   ├── redis.ts
│   ├── jwt.ts
│   └── environment.ts
└── types/                      # TypeScript interfaces
    ├── analysis.ts
    ├── user.ts
    └── api.ts
```

### Analysis Worker Architecture
```
python/
├── analyzers/
│   ├── slither_analyzer.py     # Slither integration
│   ├── mythx_analyzer.py       # MythX integration
│   └── custom_analyzer.py      # Custom rules
├── utils/
│   ├── file_handler.py
│   ├── result_parser.py
│   └── error_handler.py
├── models/
│   ├── vulnerability.py
│   ├── contract.py
│   └── report.py
└── main.py                     # Worker entry point
```

## 🔄 Data Flow

### Analysis Request Flow
```
1. User uploads contract
   ↓
2. Frontend validates file
   ↓
3. API Gateway authenticates request
   ↓
4. Analysis service creates job
   ↓
5. Job added to Redis queue
   ↓
6. Worker picks up job
   ↓
7. Worker runs Slither analysis
   ↓
8. Worker runs Solhint analysis
   ↓
9. Results aggregated and stored
   ↓
10. WebSocket notifies frontend
    ↓
11. Frontend displays results
```

### Real-time Communication Flow
```
┌─────────────┐    WebSocket    ┌──────────────┐
│   Frontend  │◄──────────────►│   Backend    │
│             │                │              │
│ • Progress  │                │ • Job Status │
│ • Results   │                │ • Errors     │
│ • Errors    │                │ • Completion │
└─────────────┘                └──────────────┘
                                       │
                               ┌──────▼────────┐
                               │ Redis PubSub  │
                               │               │
                               │ • Job Updates │
                               │ • Broadcasts  │
                               └───────────────┘
```

### Caching Strategy
```
┌─────────────────┐
│   Request       │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │   Redis   │◄── Cache Hit (Return immediately)
    │   Cache   │
    └─────┬─────┘
          │ Cache Miss
    ┌─────▼─────┐
    │  Worker   │── Process analysis
    │   Pool    │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Database  │── Store results
    │  Storage  │── Update cache
    └───────────┘
```

## 🗄️ Database Design

### Entity Relationship Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      Users      │     │    Analyses     │     │ Vulnerabilities │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID) PK    │────▶│ id (UUID) PK    │────▶│ id (UUID) PK    │
│ email           │     │ user_id FK      │     │ analysis_id FK  │
│ password_hash   │     │ contract_code   │     │ type            │
│ name            │     │ contract_name   │     │ severity        │
│ api_key         │     │ status          │     │ title           │
│ plan            │     │ options         │     │ description     │
│ created_at      │     │ result          │     │ location        │
│ updated_at      │     │ error_message   │     │ recommendation  │
└─────────────────┘     │ created_at      │     │ created_at      │
                        │ completed_at    │     └─────────────────┘
┌─────────────────┐     └─────────────────┘     
│     Teams       │             │               ┌─────────────────┐
├─────────────────┤             │               │    Reports      │
│ id (UUID) PK    │             │               ├─────────────────┤
│ name            │             └──────────────▶│ id (UUID) PK    │
│ owner_id FK     │                             │ analysis_id FK  │
│ plan            │                             │ format          │
│ created_at      │                             │ content         │
└─────────────────┘                             │ file_url        │
         │                                      │ created_at      │
         │                                      └─────────────────┘
┌─────────────────┐
│  Team_Members   │
├─────────────────┤
│ id (UUID) PK    │
│ team_id FK      │
│ user_id FK      │
│ role            │
│ joined_at       │
└─────────────────┘
```

### Table Schemas

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE DEFAULT gen_random_uuid(),
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    usage_limit INTEGER DEFAULT 10,
    usage_count INTEGER DEFAULT 0,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_users_plan ON users(plan);
```

#### Analyses Table
```sql
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contract_code TEXT NOT NULL,
    contract_name VARCHAR(255),
    file_count INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    options JSONB DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created ON analyses(created_at);
CREATE INDEX idx_analyses_expires ON analyses(expires_at);
```

#### Vulnerabilities Table
```sql
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location JSONB, -- {start: number, end: number, line: number, column: number}
    recommendation TEXT,
    source VARCHAR(50) DEFAULT 'slither' -- slither, solhint, mythx, custom
);

CREATE INDEX idx_vulnerabilities_analysis ON vulnerabilities(analysis_id);
CREATE INDEX idx_vulnerabilities_type ON vulnerabilities(type);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
```

#### Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'json', 'html', 'csv')),
    content BYTEA, -- For small reports
    file_url VARCHAR(500), -- For large reports stored externally
    file_size INTEGER,
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_reports_analysis ON reports(analysis_id);
CREATE INDEX idx_reports_expires ON reports(expires_at);
```

### Data Retention Policy
```sql
-- Auto-delete expired analyses
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS void AS $$
BEGIN
    -- Delete expired analyses (cascades to vulnerabilities and reports)
    DELETE FROM analyses WHERE expires_at < NOW();
    
    -- Delete expired reports
    DELETE FROM reports WHERE expires_at < NOW();
    
    -- Reset usage counts monthly
    UPDATE users 
    SET usage_count = 0 
    WHERE DATE_TRUNC('month', updated_at) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job
SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');
```

## 🔌 API Design

### RESTful API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/register           # User registration
POST   /api/auth/login              # User login
POST   /api/auth/refresh            # Refresh JWT token
POST   /api/auth/logout             # User logout
POST   /api/auth/forgot-password    # Password reset request
POST   /api/auth/reset-password     # Password reset confirmation
GET    /api/auth/me                 # Get current user info
```

#### Analysis Endpoints
```
POST   /api/analysis                # Create new analysis
GET    /api/analysis/:id            # Get analysis result
GET    /api/analysis/:id/status     # Get analysis status
DELETE /api/analysis/:id            # Delete analysis
GET    /api/analysis                # Get user's analyses (paginated)
POST   /api/analysis/:id/report     # Generate report in specific format
GET    /api/analysis/:id/share      # Get shareable link
```

#### User Management Endpoints
```
GET    /api/users/profile           # Get user profile
PUT    /api/users/profile           # Update user profile
GET    /api/users/usage             # Get usage statistics
GET    /api/users/api-key           # Get/regenerate API key
POST   /api/users/api-key/regenerate # Regenerate API key
```

#### Admin Endpoints
```
GET    /api/admin/users             # List all users (admin only)
GET    /api/admin/analytics         # System analytics
GET    /api/admin/health            # System health check
```

### API Response Formats

#### Standard Response Structure
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

#### Analysis Request/Response
```typescript
// POST /api/analysis
interface AnalysisRequest {
  contractCode: string;
  contractName?: string;
  options?: {
    includeGasOptimization?: boolean;
    includeCodeQuality?: boolean;
    severityFilter?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  };
}

interface AnalysisResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number; // seconds
  result?: AnalysisResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface AnalysisResult {
  summary: {
    totalVulnerabilities: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    gasOptimizations: number;
    codeQualityIssues: number;
    overallScore: number; // 0-100
  };
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  codeQuality: CodeQualityIssue[];
  metadata: {
    analysisTime: number;
    toolsUsed: string[];
    contractStats: {
      lines: number;
      functions: number;
      complexity: number;
    };
  };
}
```

### WebSocket Events
```typescript
// Client to Server
interface ClientEvents {
  'subscribe-analysis': { analysisId: string };
  'unsubscribe-analysis': { analysisId: string };
}

// Server to Client
interface ServerEvents {
  'analysis-progress': {
    analysisId: string;
    status: string;
    progress: number; // 0-100
    currentStep: string;
  };
  'analysis-completed': {
    analysisId: string;
    result: AnalysisResult;
  };
  'analysis-failed': {
    analysisId: string;
    error: string;
  };
}
```

### Rate Limiting
```typescript
const rateLimitConfig = {
  free: {
    requests: 100, // per hour
    analyses: 10,  // per month
    concurrent: 1  // simultaneous analyses
  },
  pro: {
    requests: 1000,
    analyses: -1,  // unlimited
    concurrent: 3
  },
  enterprise: {
    requests: 10000,
    analyses: -1,
    concurrent: 10
  }
};
```

## 🔒 Security Architecture

### Authentication & Authorization
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JWT Token     │    │   API Key       │    │   OAuth2        │
│                 │    │                 │    │                 │
│ • Short-lived   │    │ • Long-lived    │    │ • GitHub        │
│ • Stateless     │    │ • Rate limited  │    │ • Google        │
│ • Auto-refresh  │    │ • Revokable     │    │ • Future        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Permission Model     │
                    │                         │
                    │ • Role-based (RBAC)     │
                    │ • Resource-based        │
                    │ • Attribute-based       │
                    └─────────────────────────┘
```

### Security Layers

#### 1. Infrastructure Security
```yaml
# Cloudflare WAF Rules
waf_rules:
  - rule: "Block suspicious requests"
    action: "block"
    conditions:
      - "cf.threat_score > 50"
      - "http.request.uri contains 'admin' and not cf.authenticated"
  
  - rule: "Rate limit API"
    action: "rate_limit"
    threshold: "100 requests per minute per IP"
    
  - rule: "Block common attacks"
    action: "block"
    conditions:
      - "http.request.body contains 'script'"
      - "http.request.uri contains '../'"
```

#### 2. Application Security
```typescript
// Input validation and sanitization
const contractSchema = z.object({
  contractCode: z.string()
    .min(1, "Contract code is required")
    .max(100000, "Contract too large")
    .refine(code => !code.includes('<script>'), "Invalid characters"),
  contractName: z.string()
    .optional()
    .transform(name => name?.replace(/[<>]/g, ''))
});

// SQL injection prevention
const getAnalyses = async (userId: string, page: number) => {
  return await db.analyses.findMany({
    where: { userId }, // Parameterized query
    skip: (page - 1) * 20,
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
};
```

#### 3. Data Protection
```typescript
// Encryption at rest
const encryptSensitiveData = (data: string): string => {
  const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
};

// Secure headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

### Container Security
```dockerfile
# Multi-stage build for minimal attack surface
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app .
USER nextjs
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

## ⚡ Scalability & Performance

### Horizontal Scaling Architecture
```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (Auto-scaling) │
                    └─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼───────┐   ┌──────▼───────┐
│API Instance 1│   │API Instance 2  │   │API Instance N│
│              │   │                │   │              │
│ • Stateless  │   │ • Stateless    │   │ • Stateless  │
│ • Auto-scale │   │ • Auto-scale   │   │ • Auto-scale │
└──────────────┘   └────────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Redis Cluster│
                    │  (Shared State)│
                    └───────────────┘
```

### Performance Optimization

#### 1. Caching Strategy
```typescript
interface CacheStrategy {
  // L1: In-memory cache (Node.js process)
  l1: {
    type: 'memory';
    ttl: 60; // 1 minute
    maxSize: 100; // 100 analyses
  };
  
  // L2: Redis cache (shared)
  l2: {
    type: 'redis';
    ttl: 3600; // 1 hour
    maxSize: 10000;
  };
  
  // L3: Database with indexes
  l3: {
    type: 'postgres';
    indexes: ['contract_hash', 'user_id', 'created_at'];
  };
}
```

#### 2. Database Optimization
```sql
-- Partitioning for large datasets
CREATE TABLE analyses_2024 PARTITION OF analyses
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Read replicas for analytics
CREATE PUBLICATION analytics_replication FOR TABLE analyses, vulnerabilities;

-- Materialized views for dashboards
CREATE MATERIALIZED VIEW user_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_analyses,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_analyses,
    AVG(processing_time_ms) as avg_processing_time
FROM analyses
GROUP BY user_id;
```

#### 3. Worker Pool Management
```typescript
class WorkerPoolManager {
  private pools: Map<string, WorkerPool> = new Map();
  
  constructor() {
    this.pools.set('slither', new WorkerPool({
      minWorkers: 2,
      maxWorkers: 10,
      scaleUpThreshold: 5,    // Queue size
      scaleDownTimeout: 300,   // 5 minutes
    }));
    
    this.pools.set('solhint', new WorkerPool({
      minWorkers: 1,
      maxWorkers: 5,
      scaleUpThreshold: 3,
      scaleDownTimeout: 600,
    }));
  }
  
  async scaleWorkers() {
    for (const [type, pool] of this.pools) {
      const queueSize = await this.getQueueSize(type);
      
      if (queueSize > pool.config.scaleUpThreshold) {
        await pool.scaleUp();
      } else if (queueSize === 0) {