# UplyTech Central API

**Enterprise-grade unified API platform** that connects and manages all UplyTech products and services.

All requests from the Website, Software, EcoSys Discord Bot, Browser Home Page, GameStatsFetcher, FlashTrix, Radio, SawStats Discord Bot, and UplyOS are routed through this central API.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Modules](#modules)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Docker Deployment](#docker-deployment)
- [API Reference](#api-reference)
- [OAuth Providers](#oauth-providers)
- [WebSocket](#websocket)
- [Economy System](#economy-system)
- [AI Brain](#ai-brain)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

```
                    +-----------+
                    |  Traefik  |  (Reverse Proxy / TLS / Rate Limiting)
                    +-----+-----+
                          |
                    +-----v-----+
                    | Express   |  (Node.js / TypeScript)
                    | REST API  |
                    +-----+-----+
                          |
          +---------------+---------------+
          |               |               |
    +-----v-----+  +-----v-----+  +------v-----+
    |   MySQL   |  |   Redis   |  |  WebSocket |
    |  (Prisma) |  |  (Cache)  |  |    (ws)    |
    +-----+-----+  +-----------+  +------------+
          |
    +-----v-----+
    | 90 Models |
    | 52 Modules|
    +-----------+
```

Every module follows the **Service → Controller → Router** pattern with full separation of concerns. The system is fully event-driven using `EventEmitter2` for cross-module communication.

---

## Tech Stack

| Component          | Technology                                    |
| ------------------ | --------------------------------------------- |
| **Runtime**        | Node.js + TypeScript (strict mode)            |
| **Framework**      | Express.js                                    |
| **Database**       | MySQL 8.0                                     |
| **ORM**            | Prisma 5                                      |
| **Cache**          | Redis 7                                       |
| **Auth**           | JWT + OAuth2 + Passkeys (WebAuthn) + TOTP 2FA |
| **Payments**       | Stripe                                        |
| **Email**          | Nodemailer (SMTP)                             |
| **Validation**     | Zod                                           |
| **WebSocket**      | ws                                            |
| **Logging**        | Winston                                       |
| **Security**       | Helmet, CORS, Argon2, Rate Limiting, CSRF     |
| **Deployment**     | Docker + Docker Compose + Traefik             |
| **Event System**   | EventEmitter2                                 |
| **NLP**            | natural (for AI Brain)                        |

---

## Features

### Authentication & Security
- JWT access + refresh tokens with automatic rotation
- OAuth2 with **13 providers**: Google, GitHub, Discord, Twitter/X, Facebook, Apple, Microsoft, Twitch, Spotify, LinkedIn, GitLab, Slack, Steam
- Passkey / WebAuthn support
- TOTP-based two-factor authentication
- API key management with scoped permissions
- Argon2 password hashing
- Rate limiting (configurable per-route)
- Helmet security headers
- CORS with configurable origins
- CSRF protection
- XSS / SQL injection prevention
- Full audit logging of all sensitive operations

### Real-Time
- WebSocket server for live events
- All REST endpoints mirrored as real-time events
- Chat rooms with typing indicators and read receipts
- Live notification delivery

### Economy System
- Virtual currency management (deposits, withdrawals, transfers)
- Daily bonuses, rewards, and shop purchases
- Transaction history with filtering
- Currency leaderboards
- Designed for Discord bots and game integrations
- Not connected to real money (separate from Stripe payments)

### AI Brain
- Self-learning system with no third-party LLMs
- Pattern matching and fuzzy search
- Persistent memory and knowledge base
- Trainable via conversation and explicit training data
- Personality system

### Streaming
- Multi-platform streaming (Twitch, YouTube, Kick, TikTok)
- OBS integration via API
- Stream session management
- Account linking per platform

### Financial System
- Stripe payment processing with webhook handling
- Invoice generation with automatic numbering
- Tax calculation and record keeping
- Financial reports and accounting entries
- Revenue tracking and statistics

---

## Modules

The API consists of **52 fully implemented modules**, each with its own Service, Controller, and Router:

| Module            | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| **auth**          | JWT, OAuth (13 providers), Passkeys, 2FA, API keys, sessions  |
| **users**         | Profiles, search, ban/suspend, avatar, status, account delete  |
| **roles**         | Role CRUD, assign/remove users, system roles, priority         |
| **permissions**   | Resource/action-based permissions, bulk assign, permission check|
| **teams**         | Team management, members, roles (Owner/Admin/Mod/Member)       |
| **groups**        | Group management, public/private, join/leave/kick              |
| **apartments**    | Apartment management with resident tracking                    |
| **areas**         | Area/zone management                                           |
| **blog**          | Posts with categories, featured posts, publish/draft/archive   |
| **comments**      | Nested comments on any resource type                           |
| **reactions**     | Emoji reactions on any resource type                           |
| **forum**         | Categories, posts, replies with author tracking                |
| **wiki**          | Spaces, pages, revision history, revert functionality          |
| **docs**          | Documentation projects and pages                               |
| **tickets**       | Support/bug/security tickets with messages, assign, escalate   |
| **chat**          | Rooms, messages, members, typing indicators, encryption        |
| **friends**       | Friend requests (send/accept/reject), friend list, blocking    |
| **notifications** | In-app notifications, mark read, bulk send, unread count       |
| **alerts**        | System-wide alerts with severity levels                        |
| **broadcasts**    | Broadcast messages to all or targeted users                    |
| **email**         | Incoming/outgoing email, templates, read tracking              |
| **products**      | Product catalog with categories, pricing, stock management     |
| **licenses**      | License key generation, validation, activation, revocation     |
| **subscriptions** | Subscription plans and user subscription management            |
| **payments**      | Stripe integration, payment intents, refunds, webhooks         |
| **invoices**      | Invoice generation, status tracking, payment linking           |
| **tax**           | Tax rate management and tax record keeping                     |
| **finance**       | Financial reports and revenue analysis                         |
| **accounting**    | Double-entry accounting entries                                |
| **donations**     | Donation tracking and management                               |
| **economy**       | Virtual currency, wallets, transfers, daily bonuses, shops     |
| **games**         | Game registry with stats, rankings, player tracking            |
| **tournaments**   | Tournament brackets, registration, match reporting             |
| **devices**       | Device registration, heartbeat, status monitoring              |
| **analytics**     | Event tracking, dashboards, top events analysis                |
| **metrics**       | System metrics recording and aggregation                       |
| **logs**          | Structured log querying and filtering                          |
| **audit**         | Comprehensive audit trail for all actions                      |
| **scans**         | Content scanning for malicious content                         |
| **storage**       | File/folder management, sharing, cloud storage                 |
| **hosting**       | Docker-based hosting provisioning, start/stop/restart          |
| **streaming**     | Multi-platform live streaming, OBS config                      |
| **downloads**     | Download tracking and management                               |
| **releases**      | Software release management with assets                        |
| **changelog**     | Version changelog entries                                      |
| **features**      | Feature flags and voting                                       |
| **archive**       | Content archiving                                              |
| **services**      | Service registry and ownership                                 |
| **ip**            | IP address management and tracking                             |
| **api-management**| API endpoint registry and documentation                        |
| **whitelists**    | IP/user/domain whitelist management                            |
| **brain**         | Self-learning AI with memory, training, knowledge base         |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **MySQL** 8.0+
- **Redis** 7+
- **npm** >= 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/dev-crorx/uplytech-central-api.git
cd uplytech-central-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### Health Check

```bash
curl http://localhost:3000/health
```

---

## Configuration

All configuration is managed through environment variables. See [`.env.example`](.env.example) for all available options.

### Required Variables

| Variable           | Description                        |
| ------------------ | ---------------------------------- |
| `DATABASE_URL`     | MySQL connection string            |
| `REDIS_URL`        | Redis connection string            |
| `JWT_SECRET`       | Secret for JWT access tokens       |
| `JWT_REFRESH_SECRET` | Secret for JWT refresh tokens    |

### OAuth Configuration

Each OAuth provider requires its own client ID, secret, and callback URL. Configure them in `.env`:

```env
# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/github/callback

# Discord, Twitter, Facebook, Apple, Microsoft, Twitch,
# Spotify, LinkedIn, GitLab, Slack, Steam
# (same pattern for each provider)
```

### Stripe Configuration

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...
```

### Streaming Platforms

```env
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
YOUTUBE_API_KEY=...
KICK_API_KEY=...
```

---

## Docker Deployment

The project includes a production-ready Docker Compose setup with Traefik as reverse proxy.

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f api

# Stop all services
docker compose down
```

### Services

| Service   | Port  | Description                          |
| --------- | ----- | ------------------------------------ |
| **api**   | 3000  | UplyTech Central API                 |
| **mysql** | 3306  | MySQL 8.0 database                   |
| **redis** | 6379  | Redis cache                          |
| **traefik** | 80/443/8080 | Reverse proxy with auto TLS  |

### Traefik Integration

The API is pre-configured with Traefik labels for:
- Automatic HTTPS via Let's Encrypt
- Rate limiting (100 req/s average, 50 burst)
- HTTP → HTTPS redirect
- Domain routing (`api.uplytech.com`)

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication

```
POST   /api/v1/auth/register         - Register new user
POST   /api/v1/auth/login            - Login with email/password
POST   /api/v1/auth/refresh          - Refresh access token
POST   /api/v1/auth/logout           - Logout (invalidate session)
GET    /api/v1/auth/:provider        - OAuth login (google, github, discord, etc.)
GET    /api/v1/auth/:provider/callback - OAuth callback
POST   /api/v1/auth/passkey/register - Register passkey
POST   /api/v1/auth/passkey/login    - Login with passkey
POST   /api/v1/auth/2fa/enable       - Enable TOTP 2FA
POST   /api/v1/auth/2fa/verify       - Verify TOTP code
POST   /api/v1/auth/api-keys         - Create API key
```

### Users

```
GET    /api/v1/users                 - List users (paginated, filterable)
GET    /api/v1/users/me              - Get current user profile
PUT    /api/v1/users/me              - Update profile
GET    /api/v1/users/search          - Search users
GET    /api/v1/users/online          - Get online users
GET    /api/v1/users/stats           - Get user statistics
GET    /api/v1/users/:id             - Get user by ID
POST   /api/v1/users/:id/ban        - Ban user
POST   /api/v1/users/:id/unban      - Unban user
POST   /api/v1/users/:id/suspend    - Suspend user
```

### Economy (Discord Bot / Game Integration)

```
GET    /api/v1/economy/account       - Get wallet/account
POST   /api/v1/economy/deposit       - Deposit currency
POST   /api/v1/economy/withdraw      - Withdraw currency
POST   /api/v1/economy/transfer      - Transfer between users
POST   /api/v1/economy/reward        - Reward a user
POST   /api/v1/economy/deduct        - Deduct from a user
POST   /api/v1/economy/daily-bonus   - Claim daily bonus
POST   /api/v1/economy/shop/purchase - Purchase from shop
GET    /api/v1/economy/transactions  - Transaction history
GET    /api/v1/economy/currencies    - Available currencies
GET    /api/v1/economy/leaderboard   - Currency leaderboard
```

### Payments (Stripe)

```
GET    /api/v1/payments              - List payments
GET    /api/v1/payments/my           - My payments
GET    /api/v1/payments/revenue      - Revenue statistics
POST   /api/v1/payments/intent       - Create payment intent
POST   /api/v1/payments/webhook      - Stripe webhook
GET    /api/v1/payments/:id          - Get payment details
POST   /api/v1/payments/:id/refund   - Refund payment
```

### All Module Endpoints

Every module follows the same RESTful pattern:

```
GET    /api/v1/{module}              - List (paginated)
GET    /api/v1/{module}/:id          - Get by ID
POST   /api/v1/{module}              - Create
PUT    /api/v1/{module}/:id          - Update
DELETE /api/v1/{module}/:id          - Delete
```

Additional domain-specific endpoints vary by module (see individual router files).

### Pagination

All list endpoints support pagination:

```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Format

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

---

## OAuth Providers

The API supports **13 OAuth providers** for authentication and account linking:

| Provider      | Login | Account Linking |
| ------------- | ----- | --------------- |
| Google        | Yes   | Yes             |
| GitHub        | Yes   | Yes             |
| Discord       | Yes   | Yes             |
| Twitter / X   | Yes   | Yes             |
| Facebook      | Yes   | Yes             |
| Apple         | Yes   | Yes             |
| Microsoft     | Yes   | Yes             |
| Twitch        | Yes   | Yes             |
| Spotify       | Yes   | Yes             |
| LinkedIn      | Yes   | Yes             |
| GitLab        | Yes   | Yes             |
| Slack         | Yes   | Yes             |
| Steam         | Yes   | Yes             |

---

## WebSocket

Connect to the WebSocket server at `ws://localhost:3000/ws`.

### Authentication

Send a JWT token after connecting:

```json
{ "type": "auth", "token": "your-jwt-token" }
```

### Events

All REST operations emit real-time events. Subscribe to channels:

```json
{ "type": "subscribe", "channel": "notifications" }
```

Event categories:
- `users.*` - User events (status changes, profile updates)
- `chat.*` - Chat events (new messages, typing)
- `notifications.*` - New notifications
- `economy.*` - Economy transactions
- `tickets.*` - Ticket updates
- `tournaments.*` - Tournament events

---

## Economy System

The economy system provides a complete virtual currency engine designed for Discord bots, games, and other integrations.

### Features
- Multiple currency support
- Wallet management (deposit, withdraw, transfer)
- Transaction history with full audit trail
- Daily bonus system
- Shop purchases
- Leaderboards
- Reward/deduct system for bot commands

### Discord Bot Integration Example

```typescript
// Fetch user balance
const res = await fetch('https://api.uplytech.com/api/v1/economy/account?userId=USER_ID', {
  headers: { 'Authorization': 'Bearer API_KEY' }
});

// Give daily bonus
await fetch('https://api.uplytech.com/api/v1/economy/daily-bonus', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'USER_ID' })
});

// Transfer between users
await fetch('https://api.uplytech.com/api/v1/economy/transfer', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fromUserId: 'USER_A', toUserId: 'USER_B', amount: 100, currency: 'UPLY_COIN' })
});
```

---

## AI Brain

The integrated AI brain is a self-learning system that uses **no third-party LLMs or external AI services**.

### Capabilities
- Natural language understanding via pattern matching
- Fuzzy search for knowledge retrieval
- Persistent memory across conversations
- Trainable through conversation and explicit data
- Personality configuration
- Knowledge base management

### Endpoints

```
POST   /api/v1/brain/chat            - Chat with the AI
POST   /api/v1/brain/train           - Train with new data
GET    /api/v1/brain/knowledge       - Browse knowledge base
POST   /api/v1/brain/knowledge       - Add knowledge entry
GET    /api/v1/brain/conversations   - Conversation history
PUT    /api/v1/brain/personality     - Configure personality
GET    /api/v1/brain/stats           - Brain statistics
```

---

## Project Structure

```
uplytech-central-api/
├── prisma/
│   └── schema.prisma          # Database schema (90 models)
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── core/
│   │   ├── config/            # Environment configuration
│   │   ├── database/          # Prisma client
│   │   ├── errors/            # Custom error classes
│   │   ├── events/            # EventEmitter2 event bus
│   │   ├── logger/            # Winston logger
│   │   ├── middleware/        # Auth, audit, rate limit, validation
│   │   ├── security/          # Encryption, hashing utilities
│   │   ├── types/             # Shared TypeScript types
│   │   ├── utils/             # Pagination, helpers
│   │   └── websocket/         # WebSocket server
│   └── modules/
│       ├── auth/              # Authentication (JWT, OAuth, Passkeys, 2FA)
│       │   ├── controller/
│       │   ├── service/
│       │   ├── router/
│       │   └── oauth/         # OAuth provider configurations
│       ├── users/
│       │   ├── controller/
│       │   ├── service/
│       │   └── router/
│       ├── economy/           # Virtual economy system
│       ├── payments/          # Stripe payments
│       ├── brain/             # AI brain
│       ├── streaming/         # Multi-platform streaming
│       └── ... (48 more modules)
├── docker-compose.yml         # Production Docker setup
├── Dockerfile                 # Multi-stage Docker build
├── .env.example               # Environment variables template
├── tsconfig.json              # TypeScript configuration
├── .eslintrc.json             # ESLint configuration
└── package.json
```

---

## Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production server
npm run lint             # Run ESLint
npm run lint:fix          # Auto-fix ESLint issues
npm run format           # Format code with Prettier
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage
```

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

---

## License

Proprietary - UplyTech. All rights reserved.
