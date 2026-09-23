# Outbox Labs — Production Email Outreach Scheduler

A production-oriented, full-stack email outreach and scheduling platform built as a hiring assignment. Features real Google OAuth, BullMQ delayed job scheduling (zero cron), distributed atomic rate limiting with Redis Lua scripts, Elasticsearch full-text search, Ethereal SMTP delivery, encrypted Slack OAuth notifications, and a clean React + Tailwind CSS dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│              React + Tailwind CSS Dashboard                   │
│         (Vite, React Router, Axios + HTTP-only sessions)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + Session Cookie
┌──────────────────────────▼──────────────────────────────────┐
│                    Express.js API Server                      │
│  (TypeScript, Helmet, CORS, express-session + RedisStore)    │
└────┬──────────┬──────────┬────────────┬──────────────────────┘
     │          │          │            │
     ▼          ▼          ▼            ▼
PostgreSQL   Redis 7    Elastic-    External APIs
(Prisma ORM) (BullMQ   search 8    (Google OAuth,
Source of    Queue +   (Search     Slack OAuth)
Truth        RateLimit  Index)
             + Session
             Store)
             │
             ▼
┌─────────────────────────┐
│   BullMQ Worker Process  │
│ (Concurrent job processor│
│  with atomic DB claim,   │
│  Redis Lua rate limits,  │
│  Ethereal SMTP, ES index)│
└─────────────────────────┘
```

### Source-of-Truth Assignment

| Component | Role |
|---|---|
| **PostgreSQL** | Primary source of truth — users, senders, campaigns, emails, leases, Slack tokens |
| **Redis / BullMQ** | Asynchronous scheduling, delayed jobs, distributed rate limiting, session store |
| **Elasticsearch** | Full-text search index over scheduled and sent emails |
| **Ethereal Email** | SMTP transport for test email delivery with preview URLs |
| **Slack API** | Rate-limit alert notifications via real Slack API |
| **Bull Board** | BullMQ queue observability dashboard at `/admin/queues` |

---

## Technology Stack

**Backend:** TypeScript, Node.js, Express.js, BullMQ, ioredis, Prisma ORM (PostgreSQL), `@elastic/elasticsearch`, Nodemailer (Ethereal), `google-auth-library`, `@slack/web-api`, Pino logger, Zod validation, Helmet, connect-redis, multer

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS 3, React Router v6, Axios, Lucide React icons

**Infrastructure:** Docker Compose (PostgreSQL 15, Redis 7 with AOF persistence, Elasticsearch 8.11)

---

## Folder Structure

```
d:/Projects/email/
├── docker-compose.yml          # PostgreSQL, Redis, Elasticsearch
├── .env.example                # Environment template
├── package.json                # Monorepo npm workspaces
├── README.md
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # All models with indexes and lease fields
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts          # Zod-validated environment config
│   │   │   └── logger.ts       # Pino structured logger
│   │   ├── controllers/        # HTTP handlers (auth, campaign, email, sender, slack)
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # auth, error, validation, bullboard
│   │   ├── services/           # Business logic (auth, campaign, email, sender, rate-limiter, reconciliation)
│   │   ├── queues/
│   │   │   ├── redis.client.ts # ioredis + Lua scripts
│   │   │   └── email.queue.ts  # BullMQ Queue
│   │   ├── workers/
│   │   │   └── email.worker.ts # BullMQ Worker with atomic claim and dual-write protection
│   │   ├── integrations/
│   │   │   ├── google/         # Google OAuth2 service
│   │   │   ├── slack/          # Slack OAuth + encrypted token + notifications
│   │   │   ├── ethereal/       # Nodemailer SMTP service
│   │   │   └── elasticsearch/  # ES client, indexer, search service
│   │   ├── utils/
│   │   │   ├── crypto.ts       # AES-256-GCM encryption/decryption
│   │   │   ├── csv-parser.ts   # CSV and text lead parsing
│   │   │   ├── email-validator.ts
│   │   │   └── idempotency.ts  # Deterministic keys and Message-IDs
│   │   ├── app.ts              # Express application
│   │   └── server.ts           # Bootstrap + reconciliation + graceful shutdown
│   └── tests/                  # Vitest unit tests
│
└── frontend/
    └── src/
        ├── api/                # Axios API clients
        ├── components/         # Reusable React components
        ├── context/            # AuthContext
        ├── hooks/              # useDebounce
        ├── pages/              # LoginPage, ScheduledPage, SentPage, ComposeModal
        ├── types/              # TypeScript interfaces
        └── App.tsx             # Router and route guards
```

---

## Prerequisites

- **Node.js** v20+ (LTS)
- **Docker Desktop** with Docker Compose v2
- **Google Cloud** project with OAuth 2.0 credentials
- **Slack app** at api.slack.com (optional — app runs without it)

---

## Installation

```bash
git clone <repo>
cd email

# Install all workspace dependencies
npm install
```

---

## Docker Setup

Start the infrastructure services (PostgreSQL, Redis, Elasticsearch):

```bash
docker compose up -d
```

Verify services are healthy:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

Remove volumes (reset all data):

```bash
docker compose down -v
```

---

## Environment Variables

Copy the example and fill in your credentials:

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection URL | ✅ |
| `ELASTICSEARCH_URL` | Elasticsearch URL | ✅ |
| `SESSION_SECRET` | Min 32-char random string for sessions | ✅ |
| `SLACK_TOKEN_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback (must match Console) | ✅ |
| `SLACK_CLIENT_ID` | Slack App Client ID | Optional |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | Optional |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URI | Optional |
| `WORKER_CONCURRENCY` | BullMQ worker parallel jobs (default: 10) | Optional |
| `MIN_EMAIL_DELAY_MS` | Min delay between sender sends in ms (default: 2000) | Optional |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly send limit per sender (default: 200) | Optional |
| `PROCESSING_LEASE_MS` | Worker crash recovery lease timeout in ms (default: 300000) | Optional |
| `ETHEREAL_HOST` | Ethereal SMTP host | Optional |
| `ETHEREAL_USER` | Ethereal username (auto-generated if blank) | Optional |
| `ETHEREAL_PASSWORD` | Ethereal password | Optional |
| `BULL_BOARD_USER` | Bull Board HTTP Basic Auth user | Optional |
| `BULL_BOARD_PASSWORD` | Bull Board HTTP Basic Auth password | Optional |

Generate a secure encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project → **APIs & Services** → **Credentials**
3. **Create OAuth 2.0 Client ID** (type: Web application)
4. Add **Authorized redirect URIs**: `http://localhost:5000/api/auth/google/callback`
5. Copy `Client ID` and `Client Secret` into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. Enable the **People API** in Google Cloud Console

> Without Google credentials, the login page shows a clear configuration error explaining the required variables. There is **no mock or fake login path** — real Google OAuth only.

---

## Ethereal Email Setup

Ethereal Email is a free SMTP testing service.

**Option A — Auto-generate (recommended for quick start):**
Leave `ETHEREAL_USER` and `ETHEREAL_PASSWORD` blank. On first email send, the worker automatically creates a test Ethereal account and logs the credentials.

**Option B — Manual account:**
1. Visit [https://ethereal.email](https://ethereal.email)
2. Click **Create Ethereal Account**
3. Copy the SMTP credentials into `backend/.env`

After emails are sent, Ethereal preview URLs are stored in the database and shown directly in the dashboard under each email row's "View in Ethereal" button.

---

## Slack OAuth Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Under **OAuth & Permissions**, add the redirect URL: `http://localhost:5000/api/slack/callback`
3. Add OAuth Scopes: `chat:write`, `chat:write.public`, `channels:read`, `incoming-webhook`
4. Under **Basic Information**, copy **Client ID** and **Client Secret** to `backend/.env`

Slack is fully optional. Without it, rate-limit alerts are logged server-side but the email scheduling system continues normally.

---

## Database Migration

```bash
# Apply the Prisma schema and create tables
npm run db:migrate

# Or directly:
cd backend && npx prisma migrate dev --name init
```

---

## Running the Application

### Start Backend API Server
```bash
npm run dev:backend
# or: cd backend && npx tsx watch src/server.ts
```

### Start Background Worker (in a separate terminal)
```bash
npm run dev:worker
# or: cd backend && npx tsx watch src/workers/email.worker.ts
```

### Start Frontend
```bash
npm run dev:frontend
# or: cd frontend && npx vite
```

### Start Everything (API + Frontend concurrently)
```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Bull Board Queue Dashboard | http://localhost:5000/admin/queues |

---

## Bull Board

Access the BullMQ queue monitoring dashboard at:

```
http://localhost:5000/admin/queues
```

Authentication options:
- **Session Auth**: If you're logged into the dashboard, your session automatically grants access
- **HTTP Basic Auth**: Use `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` from `.env`

The dashboard shows: waiting, delayed, active, completed, and failed jobs in real time.

---

## Scheduling Architecture

**No cron is used anywhere in this system.**

All email delivery is driven by **BullMQ delayed jobs** stored in Redis sorted sets:

1. User schedules a campaign via the compose UI
2. Backend saves the campaign and all `Email` records in PostgreSQL
3. Backend enqueues a `BullMQ` delayed job for each email with a deterministic `jobId: email:<id>`
4. Jobs are delayed using `scheduledAt - now` milliseconds of delay
5. When the delay expires, the worker picks up the job
6. Worker atomically claims the email using a raw SQL UPDATE with a processing lease
7. Worker checks distributed hourly rate limit via atomic Redis Lua script
8. If rate limit not exceeded, worker enforces minimum sender delay via atomic Redis Lua
9. Worker records send intent (`sendAttemptedAt`, `clientMessageId`) before dispatching SMTP
10. Worker sends via Ethereal and updates the email to `SENT` in PostgreSQL
11. Worker indexes the update in Elasticsearch

---

## Worker Concurrency Configuration

```
WORKER_CONCURRENCY=10  # Number of jobs processed in parallel
```

The BullMQ worker processes up to `WORKER_CONCURRENCY` emails simultaneously. Idempotency and atomic DB claims ensure safe parallel execution.

---

## Minimum Email Delay Configuration

```
MIN_EMAIL_DELAY_MS=2000  # 2 seconds between sends from the same sender
```

Enforced via an **atomic Redis Lua script** (`reserveSenderSlot`). This is distributed-safe: if two workers race to send from the same sender simultaneously, only one proceeds immediately; the other is given a calculated delay and waits that duration before sending. No two emails from the same sender can be sent closer together than `MIN_EMAIL_DELAY_MS`.

---

## Hourly Rate-Limit Implementation

```
MAX_EMAILS_PER_HOUR_PER_SENDER=200
```

**Redis key**: `email-rate:{senderId}:{YYYYMMDDHH}` (UTC hour window)

**Atomic check-and-increment Lua script** runs in a single Redis transaction. The script:
1. Reads the current count
2. If at or above limit, returns 0 (denied) — does **not** increment
3. If below limit, atomically increments and returns 1 (allowed)

This ensures the configured limit is **never exceeded** even with hundreds of concurrent workers, because the check and increment are a single atomic Redis operation.

**When the limit is reached:**
1. Email status is updated to `RATE_LIMITED` in PostgreSQL
2. `scheduledAt` is updated to the start of the next UTC hour window
3. BullMQ job is rescheduled with the new delay
4. A deduplication lock (`slack-rate-limit-notified:{senderId}:{hourWindow}`) ensures only one Slack notification is sent per sender per hour window

---

## Distributed Rate-Limit Strategy

Both the minimum delay and hourly limit use atomic Redis Lua scripts, making them safe across:
- Multiple Node.js worker processes
- Horizontal worker scaling
- Concurrent job processing
- Worker restarts during processing

PostgreSQL is the recovery ground truth for all state; Redis handles low-latency, race-condition-free coordination.

---

## Restart / Persistence Strategy

**PostgreSQL persistence:** All email records, statuses, and processing leases survive any restart.

**Redis persistence:** BullMQ uses Redis sorted sets for delayed jobs. With `appendonly yes` in Redis config (enabled in `docker-compose.yml`), delayed jobs survive Redis restarts.

**On server/worker startup**, `reconciliationService.reconcile()` runs **once** (not on a cron):
1. Finds `PROCESSING` emails whose lease has expired (worker crashed mid-job) — resets them to `SCHEDULED` or marks as `FAILED` if a send was already attempted (dual-write protection)
2. Finds `SCHEDULED` and `RATE_LIMITED` emails whose BullMQ job is missing from Redis — idempotently re-enqueues them with the correct remaining delay

`SENT` emails are **never** re-enqueued during reconciliation.

---

## Idempotency & SMTP Dual-Write Strategy

This is a fundamental challenge: SMTP is not transactionally coupled with PostgreSQL.

**Strategy implemented (strongest practical approach):**

1. **Atomic DB claim with lease**: Before processing, the worker executes a raw SQL `UPDATE` that only succeeds if `status IN ('SCHEDULED', 'RATE_LIMITED')` **or** `status = 'PROCESSING' AND processingLeaseExpiresAt < NOW()`. This is a single atomic transaction — multiple concurrent workers cannot both claim the same email.

2. **Deterministic BullMQ job IDs**: `jobId: email:<uuid>`. BullMQ silently drops duplicate job submissions for the same ID, preventing duplicate queue entries.

3. **Pre-SMTP intent record**: Before calling `transporter.sendMail()`, the worker records `sendAttemptedAt` and a deterministic RFC 5322 `clientMessageId` (derived from `idempotencyKey`) in PostgreSQL. This creates a pre-send record.

4. **Post-SMTP status update**: After successful send, worker updates status to `SENT`. All subsequent claim attempts see `SENT` and immediately return without sending.

5. **Crash recovery with dual-write awareness**: If a worker crashes after `sendAttemptedAt` is written but before the `SENT` update: on reconciliation, these emails are detected by `sendAttemptedAt != null && attempts > 1 && status = 'PROCESSING'` with expired lease, and are marked `FAILED` with reason `"Worker crashed during SMTP dispatch; delivery status ambiguous"` — **they are not blindly resent**.

**Unavoidable limitation**: If the worker sends the email via Ethereal and then the process dies before writing `SENT` to PostgreSQL, the email may already have been delivered to the SMTP server but the database does not reflect this. This is the fundamental at-least-once vs. exactly-once boundary at the external SMTP transport. The system provides the strongest practical duplicate-prevention at the database and queue layer, but cannot guarantee exactly-once delivery at the SMTP level without SMTP provider support for idempotent message acceptance (which Ethereal does not offer). The deterministic `clientMessageId` is included in the email's `Message-ID` header as a best-effort deduplication hint to the receiving SMTP server.

---

## Elasticsearch Indexing / Search Strategy

- On campaign creation, each `Email` document is indexed into the `emails` Elasticsearch index
- On status changes (`SENT`, `FAILED`, `RATE_LIMITED`), the document is updated via `esClient.update()`
- Search queries use `multi_match` with fuzzy matching across `recipient`, `subject`, `body`, `senderEmail`
- All queries are **scoped to `userId`** to prevent cross-user data exposure
- If Elasticsearch is unavailable, the system **gracefully degrades** to PostgreSQL `LIKE` queries — scheduling and sending continue normally, only search quality degrades

---

## Slack Rate-Limit Notification Behavior

- Triggered atomically: when `checkAndIncrementHourlyLimit` returns "denied", the worker attempts `SETNX slack-rate-limit-notified:{senderId}:{hourWindow} 1 EX 3600`
- If lock acquired: fires real Slack `chat.postMessage` with details
- If lock not acquired: silently skips (another worker already notified)
- One notification per sender per UTC hour, guaranteed across all workers
- If Slack is not connected: notification skipped, scheduling continues
- Slack tokens are stored **encrypted at rest** with AES-256-GCM

---

## 1000+ Email Load Behavior

Example: 1000 emails scheduled for 10:00 AM, `WORKER_CONCURRENCY=10`, `MAX_EMAILS_PER_HOUR_PER_SENDER=200`, `MIN_EMAIL_DELAY_MS=2000`:

1. 1000 BullMQ delayed jobs created with staggered `scheduledAt` times (2 seconds apart by default)
2. At 10:00 AM, jobs become eligible; worker picks up 10 at a time (concurrency=10)
3. Each job atomically claims the email, checks the hourly limit
4. After 200 emails sent, remaining jobs are atomically rescheduled to 11:00 AM
5. Slack notification fires once (deduplication lock)
6. Worker continues processing other emails or sits idle until 11:00 AM
7. At 11:00 AM, next 200 emails process, and so on
8. All 1000 emails are eventually delivered across hourly windows
9. No emails are lost; PostgreSQL is the ground truth at all times

---

## API Overview

```
GET  /api/auth/google          → Redirect to Google OAuth
GET  /api/auth/google/callback → Handle OAuth callback
GET  /api/auth/me              → Current user info + OAuth config status
POST /api/auth/logout          → Clear session

GET  /api/senders              → List user's configured senders
POST /api/senders              → Create new sender with SMTP credentials

POST /api/campaigns/preview-leads → Parse CSV/text, return valid email list
POST /api/campaigns               → Create campaign + schedule BullMQ delayed jobs
GET  /api/campaigns/:id           → Get campaign details

GET  /api/emails/scheduled     → Paginated list of pending emails
GET  /api/emails/sent          → Paginated list of sent/failed emails
GET  /api/emails/search?q=...  → Elasticsearch full-text search

GET  /api/slack/status         → Slack connection status
GET  /api/slack/connect        → Start Slack OAuth flow
GET  /api/slack/callback       → Handle Slack OAuth callback
POST /api/slack/disconnect     → Disconnect Slack

GET  /api/health               → Health check

GET  /admin/queues             → Bull Board dashboard (authenticated)
```

---

## Testing

```bash
# Run all backend unit tests
npm run test

# Or from backend directory
cd backend && npx vitest run
```

**Test coverage:**
- `email-validator.test.ts` — RFC email validation, deduplication
- `csv-parser.test.ts` — CSV header detection, plain text, mixed formats
- `crypto.test.ts` — AES-256-GCM encrypt/decrypt, tamper detection
- `idempotency.test.ts` — Deterministic key generation, Message-ID, BullMQ jobId
- `rate-limiter.test.ts` — UTC hour window calculation, next-window rollover

---

## Known Limitations / Trade-offs

1. **SMTP at-least-once**: As documented above, exactly-once SMTP delivery is not achievable without provider-level idempotency support. The system implements the strongest practical approach but acknowledges this boundary.

2. **Elasticsearch eventually consistent**: Email status updates in ES are asynchronous. Search results may lag the database by a few hundred milliseconds. The system degrades gracefully to PostgreSQL search when ES is unavailable.

3. **Sender SMTP passwords stored as plaintext**: SMTP passwords in the `Sender` table are not currently encrypted. In production, these should use the same AES-256-GCM scheme as Slack tokens. This is documented as a known gap.

4. **No horizontal API server scaling**: The session store uses Redis (stateless-ready), but the startup reconciliation runs on every server instance. For horizontal scaling, reconciliation would need leader election or a distributed lock.

5. **Bull Board not rate-limited**: The Bull Board dashboard is protected by session auth and HTTP Basic auth, but does not currently enforce rate limiting on the admin endpoint.
