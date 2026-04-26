# Documentation Standards

<!-- [CHANGE] This is a generic template - customize for your project -->

## Documentation Requirements ⭐

**Rule: Code without documentation is incomplete**

### Required Documentation

| Document | Location | Purpose | Update Frequency |
|----------|----------|---------|------------------|
| **README.md** | Root | Project overview, quick start | Every major change |
| **ARCHITECTURE.md** | docs/ | System design, components | When architecture changes |
| **API_SPEC.md** | docs/ | API endpoints, contracts | When API changes |
| **DB_SCHEMA.md** | docs/ | Database schema, relationships | When schema changes |
| **DEPLOYMENT.md** | docs/ | Deployment guide, infrastructure | When deployment changes |
| **PRD.md** | docs/ | Product requirements | When features change |
| **index.html** | docs/ | **Comprehensive HTML documentation** | After any doc update |

---

## HTML Documentation Generation ⭐

**CRITICAL:** Generate comprehensive HTML documentation showing all architecture

### Purpose

- Single-page view of entire system
- ER diagrams, architecture diagrams, API docs in one place
- Shareable with stakeholders
- Version-controlled documentation

### docs/index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Your Project Name] - Technical Documentation</title>
    <style>
        /* [CHANGE] Customize styling */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
        }
        nav {
            background: white;
            padding: 15px;
            position: sticky;
            top: 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 100;
        }
        nav ul {
            list-style: none;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
        }
        nav a {
            padding: 8px 16px;
            text-decoration: none;
            color: #667eea;
            font-weight: 500;
        }
        nav a:hover { background: #f0f0f0; border-radius: 4px; }
        section {
            background: white;
            margin: 20px 0;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { font-size: 3em; margin-bottom: 10px; }
        h2 {
            color: #667eea;
            margin: 30px 0 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        h3 { color: #764ba2; margin: 20px 0 10px; }
        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #f8f8f8; font-weight: 600; }
        .diagram {
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 5px;
            text-align: center;
        }
        .mermaid { background: white; padding: 20px; border-radius: 5px; }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: 500;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            background: white;
            margin-top: 40px;
        }
    </style>
    <!-- Mermaid for diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>
</head>
<body>
    <header>
        <div class="container">
            <h1>📚 [Your Project Name]</h1>
            <p style="font-size: 1.2em; opacity: 0.9;">Technical Documentation</p>
            <p style="opacity: 0.8;">Version 1.0 | Last Updated: [CHANGE] YYYY-MM-DD</p>
        </div>
    </header>

    <nav>
        <ul>
            <li><a href="#overview">Overview</a></li>
            <li><a href="#architecture">Architecture</a></li>
            <li><a href="#database">Database</a></li>
            <li><a href="#api">API</a></li>
            <li><a href="#deployment">Deployment</a></li>
            <li><a href="#security">Security</a></li>
        </ul>
    </nav>

    <div class="container">
        <!-- OVERVIEW SECTION -->
        <section id="overview">
            <h2>📋 Project Overview</h2>
            <p>[CHANGE] Brief description of your project</p>

            <h3>Tech Stack</h3>
            <table>
                <thead>
                    <tr>
                        <th>Layer</th>
                        <th>Technology</th>
                        <th>Version</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Frontend</td><td>[CHANGE] React/Next.js/Vue</td><td>[CHANGE] 18.x</td></tr>
                    <tr><td>Backend</td><td>[CHANGE] Node.js/Python/Java</td><td>[CHANGE] 20.x</td></tr>
                    <tr><td>Database</td><td>[CHANGE] PostgreSQL/MySQL</td><td>[CHANGE] 16.x</td></tr>
                    <tr><td>Cache</td><td>[CHANGE] Redis</td><td>[CHANGE] 7.x</td></tr>
                    <tr><td>Cloud</td><td>[CHANGE] AWS/GCP/Azure</td><td>-</td></tr>
                </tbody>
            </table>

            <h3>User Roles</h3>
            <table>
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Permissions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="badge badge-success">Admin</span></td>
                        <td>Full system access</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-info">User</span></td>
                        <td>Standard user access</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- ARCHITECTURE SECTION -->
        <section id="architecture">
            <h2>🏗️ Architecture</h2>

            <div class="diagram">
                <h3>System Architecture</h3>
                <div class="mermaid">
graph TB
    Client[Client Browser/Mobile]
    LB[Load Balancer]
    API[API Server]
    DB[(Database)]
    Cache[(Redis Cache)]
    Queue[Job Queue]
    Worker[Background Workers]

    Client -->|HTTPS| LB
    LB --> API
    API --> DB
    API --> Cache
    API --> Queue
    Queue --> Worker
    Worker --> DB
    Worker --> Cache

    style Client fill:#e1f5ff
    style API fill:#fff4e1
    style DB fill:#e8f5e9
    style Cache fill:#fce4ec
                </div>
            </div>

            <div class="diagram">
                <h3>Layer Architecture</h3>
                <div class="mermaid">
graph TD
    A[Presentation Layer<br/>Controllers/Routes] --> B[Application Layer<br/>Services]
    B --> C[Domain Layer<br/>Business Logic]
    C --> D[Data Access Layer<br/>Repositories]
    D --> E[Infrastructure Layer<br/>Database/Cache/APIs]

    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#e8f5e9
    style D fill:#fff9c4
    style E fill:#ffebee
                </div>
            </div>

            <h3>Key Principles</h3>
            <ul>
                <li>Clean architecture with clear separation of concerns</li>
                <li>Dependency injection for testability</li>
                <li>Stateless application servers</li>
                <li>Async processing for long-running tasks</li>
            </ul>
        </section>

        <!-- DATABASE SECTION -->
        <section id="database">
            <h2>🗄️ Database Schema</h2>

            <div class="diagram">
                <h3>Entity Relationship Diagram</h3>
                <div class="mermaid">
erDiagram
    USERS ||--o{ MEMBERSHIPS : has
    ORGANIZATIONS ||--o{ MEMBERSHIPS : has
    USERS ||--o{ SESSIONS : has
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string name
        timestamp created_at
    }
    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        string plan
        timestamp created_at
    }
    MEMBERSHIPS {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        string role
        timestamp created_at
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
    }
                </div>
            </div>

            <h3>Core Tables</h3>
            <table>
                <thead>
                    <tr>
                        <th>Table</th>
                        <th>Purpose</th>
                        <th>Key Fields</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>users</code></td>
                        <td>User accounts</td>
                        <td>email, password_hash, name</td>
                    </tr>
                    <tr>
                        <td><code>organizations</code></td>
                        <td>Multi-tenant isolation</td>
                        <td>name, slug, plan</td>
                    </tr>
                    <tr>
                        <td><code>memberships</code></td>
                        <td>User-org relationships</td>
                        <td>user_id, organization_id, role</td>
                    </tr>
                    <tr>
                        <td><code>sessions</code></td>
                        <td>Authentication sessions</td>
                        <td>user_id, token_hash, expires_at</td>
                    </tr>
                </tbody>
            </table>

            <h3>Indexing Strategy</h3>
            <ul>
                <li>All foreign keys indexed</li>
                <li>Frequently queried columns indexed</li>
                <li>Multi-tenant: <code>(organization_id, ...)</code> composite indexes</li>
            </ul>
        </section>

        <!-- API SECTION -->
        <section id="api">
            <h2>🔌 API Endpoints</h2>

            <h3>Base URL</h3>
            <pre><code>Production: https://api.example.com/v1
Staging:    https://staging-api.example.com/v1
Local:      http://localhost:8000/v1</code></pre>

            <h3>Authentication</h3>
            <pre><code>Authorization: Bearer &lt;jwt_token&gt;</code></pre>

            <h3>Core Endpoints</h3>
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                        <th>Auth Required</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="badge badge-info">POST</span></td>
                        <td><code>/auth/login</code></td>
                        <td>User login</td>
                        <td>No</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-info">POST</span></td>
                        <td><code>/auth/register</code></td>
                        <td>User registration</td>
                        <td>No</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-success">GET</span></td>
                        <td><code>/users/me</code></td>
                        <td>Get current user</td>
                        <td>Yes</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-success">GET</span></td>
                        <td><code>/organizations</code></td>
                        <td>List organizations</td>
                        <td>Yes</td>
                    </tr>
                </tbody>
            </table>

            <h3>Response Format</h3>
            <pre><code>{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}</code></pre>

            <h3>Error Format</h3>
            <pre><code>{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}</code></pre>
        </section>

        <!-- DEPLOYMENT SECTION -->
        <section id="deployment">
            <h2>🚀 Deployment</h2>

            <div class="diagram">
                <h3>Deployment Pipeline</h3>
                <div class="mermaid">
graph LR
    A[Git Push] --> B[CI Build]
    B --> C{Tests Pass?}
    C -->|Yes| D[Build Docker Image]
    C -->|No| E[Fail]
    D --> F[Push to Registry]
    F --> G[Deploy to Staging]
    G --> H{Staging OK?}
    H -->|Yes| I[Deploy to Production]
    H -->|No| J[Rollback]

    style A fill:#e3f2fd
    style D fill:#fff9c4
    style I fill:#e8f5e9
    style E fill:#ffebee
    style J fill:#ffebee
                </div>
            </div>

            <h3>Environments</h3>
            <table>
                <thead>
                    <tr>
                        <th>Environment</th>
                        <th>Purpose</th>
                        <th>URL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Local</td>
                        <td>Development</td>
                        <td>localhost:3000</td>
                    </tr>
                    <tr>
                        <td>Staging</td>
                        <td>Pre-production testing</td>
                        <td>staging.example.com</td>
                    </tr>
                    <tr>
                        <td>Production</td>
                        <td>Live application</td>
                        <td>example.com</td>
                    </tr>
                </tbody>
            </table>

            <h3>Infrastructure</h3>
            <ul>
                <li><strong>Cloud Provider:</strong> [CHANGE] AWS/GCP/Azure</li>
                <li><strong>Container Orchestration:</strong> [CHANGE] ECS/Kubernetes</li>
                <li><strong>Database:</strong> Managed [CHANGE] RDS/CloudSQL</li>
                <li><strong>Cache:</strong> Managed [CHANGE] ElastiCache/Memorystore</li>
                <li><strong>CDN:</strong> [CHANGE] CloudFront/Cloud CDN</li>
            </ul>
        </section>

        <!-- SECURITY SECTION -->
        <section id="security">
            <h2>🔒 Security</h2>

            <h3>Authentication</h3>
            <ul>
                <li><strong>Method:</strong> JWT tokens</li>
                <li><strong>Token Lifetime:</strong> Access: 15min, Refresh: 7days</li>
                <li><strong>Password:</strong> Bcrypt hashing</li>
            </ul>

            <h3>Authorization</h3>
            <table>
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Permissions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Admin</td>
                        <td>Full system access</td>
                    </tr>
                    <tr>
                        <td>User</td>
                        <td>Standard user access</td>
                    </tr>
                </tbody>
            </table>

            <h3>Security Measures</h3>
            <ul>
                <li>HTTPS only in production</li>
                <li>Rate limiting on all endpoints</li>
                <li>Input validation and sanitization</li>
                <li>SQL injection prevention (parameterized queries)</li>
                <li>XSS prevention (output encoding)</li>
                <li>CSRF protection</li>
                <li>Secrets in environment variables (never committed)</li>
            </ul>
        </section>

        <!-- FOOTER -->
        <footer>
            <p>Generated with ❤️ by [Your Team Name]</p>
            <p>Last updated: [CHANGE] YYYY-MM-DD | Version: 1.0</p>
            <p><a href="https://github.com/yourorg/yourproject">GitHub Repository</a></p>
        </footer>
    </div>
</body>
</html>
```

---

## Documentation Update Process

### When to Update Docs

**ALWAYS update docs when:**
1. Adding new features
2. Changing API endpoints
3. Modifying database schema
4. Updating deployment process
5. Changing authentication/security

**NEVER:**
- Deploy code without updating docs
- Update docs "later" (do it immediately)
- Leave docs out of sync with code

### Documentation in Pull Requests

```markdown
# PR Template - Documentation Checklist

## Documentation Updates
- [ ] README.md updated (if project-level changes)
- [ ] API_SPEC.md updated (if API changes)
- [ ] DB_SCHEMA.md updated (if schema changes)
- [ ] ARCHITECTURE.md updated (if architecture changes)
- [ ] docs/index.html regenerated
- [ ] Code comments added for complex logic
```

---

## Rules Summary

1. ✅ **Maintain all required docs** - README, ARCHITECTURE, API_SPEC, DB_SCHEMA, DEPLOYMENT, PRD
2. ✅ **Generate HTML documentation** - docs/index.html with diagrams
3. ✅ **Update docs with code** - never deploy without doc updates
4. ✅ **Include diagrams** - ER diagrams, architecture diagrams, flow charts
5. ✅ **Use Mermaid** - for version-controlled, maintainable diagrams
6. ✅ **Document APIs** - all endpoints, request/response formats
7. ✅ **Document database** - all tables, relationships, indexes
8. ✅ **Document deployment** - environments, process, infrastructure
9. ✅ **Keep in sync** - code and docs must match
10. ✅ **Make shareable** - HTML docs shareable with stakeholders

**Result:** Comprehensive, always up-to-date documentation that team and stakeholders can rely on.
