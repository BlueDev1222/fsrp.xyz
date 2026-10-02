# Florida State Roleplay

A Next.js / TypeScript community application with PostgreSQL, Prisma, Discord OAuth, Roblox OAuth account linking, staff workflows, and fictional roleplay CAD/MDT. The supplied banners and community documents are included as assets and editable seed content.

## Status

This is a working initial implementation, not a certification that every item in the 47-section brief is production-complete. Database migrations and critical workflow tests run against real PostgreSQL. Discord and Roblox integrations require your credentials and live end-to-end verification before launch.

Implemented: public website; member dashboard; Discord sign-in and secure sessions; Roblox ownership verification; RBAC; departments, ranks and membership actions; application builder/submissions/review; moderation and appeals; sessions/attendance/priority; reports; fictional CAD characters, vehicles, licenses, citations, arrests, warrants, BOLOs, calls, units and incidents; economy ledger; supporter membership grants; external Roblox shop links; content administration; audit history; notifications; setup wizard; Discord slash commands and queued role synchronization.

Remaining scope and operational limits are tracked in [docs/STATUS.md](docs/STATUS.md). Do not treat a passing build as live provider verification.

## Project structure

```text
src/app/                  Next.js routes and API handlers
  api/auth/               Discord OAuth and Roblox linking
  api/actions/            Validated, authorized mutations
  api/data/               Paginated, permission-filtered reads
  api/setup/              One-time setup endpoint
  dashboard/              Member workspace
  staff-panel/            Staff operations
  admin/                  Community administration
  cad/                    Fictional CAD / MDT
src/components/           Shared UI and forms
src/lib/                  Database, policies, validation and services
prisma/schema.prisma      Database schema
prisma/migrations/        PostgreSQL migrations and history guards
prisma/seed.ts            Idempotent initial community seed
bot/index.ts              Discord bot and outbox worker
scripts/bootstrap.ts      Grant ownership to a verified account
scripts/worker.ts         Credential-independent maintenance worker
tests/                    PostgreSQL workflow and permission tests
public/brand/             Supplied logo and banners
reference/                Original reference documents and brief
docs/                     Deployment, security and scope notes
```

## Local installation

Requires Node.js 24, npm, and PostgreSQL 16 or newer with UTF-8 encoding. Docker is optional.

1. Copy `.env.example` to `.env` and configure `DATABASE_URL`. Create a separate database for `TEST_DATABASE_URL`; its name must contain `test`.
2. Install and initialize:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

3. Open `http://localhost:3000`. Run `npm run worker` in another terminal for expiration and housekeeping jobs.
4. Generate independent random secrets for `SESSION_SECRET` and `SETUP_TOKEN` using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Store them only in `.env` or your hosting secret manager.
5. Open `/setup` and finish configuration using `SETUP_TOKEN`. The wizard is disabled after completion. Remove `SETUP_TOKEN` after use.

Without `DATABASE_URL`, public routes render an unconfigured state and no data is fabricated. A database is required for saving records. Without provider credentials, the rest of the application runs, and provider entrypoints return a clear configuration error.

### Environment variables

| Variable                          | Purpose                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                    | Application PostgreSQL URL; use TLS for remote databases               |
| `TEST_DATABASE_URL`               | Separate PostgreSQL test database, never production                    |
| `APP_URL`                         | Exact trusted origin, e.g. `https://fsrp.xyz`; no trailing slash       |
| `SESSION_SECRET`                  | At least 32 random characters for OAuth state signing                  |
| `SETUP_TOKEN`                     | One-time setup secret, at least 32 random characters                   |
| `DISCORD_CLIENT_ID`               | Discord OAuth / bot application ID                                     |
| `DISCORD_CLIENT_SECRET`           | Server-only Discord OAuth secret                                       |
| `DISCORD_BOT_TOKEN`               | Server-only bot token                                                  |
| `DISCORD_GUILD_ID`                | Community guild ID                                                     |
| `DISCORD_NOTIFICATION_CHANNEL_ID` | Channel for queued community notices                                   |
| `ROBLOX_CLIENT_ID`                | Roblox OAuth application ID                                            |
| `ROBLOX_CLIENT_SECRET`            | Server-only Roblox OAuth application secret                            |
| `ROBLOX_GROUP_ID`                 | Community group reference; live group rank fetching is not implemented |
| `BOOTSTRAP_DISCORD_ID`            | Verified owner Discord ID, used only by bootstrap command              |

No real credentials are checked in. There are no default admin passwords, development login bypasses, or publicly claimable owner roles.

## Discord setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add the exact redirect `${APP_URL}/api/auth/discord/callback` under OAuth2. For local development use `http://localhost:3000/api/auth/discord/callback`.
3. Configure the client ID and client secret. Sign-in requests only the `identify` scope.
4. Create the bot and configure its token and guild ID. Invite it with `bot` and `applications.commands` scopes. Grant View Channels, Send Messages, and Manage Roles only where needed. Place its role above the mapped roles. Do not grant Administrator.
5. Configure the notification channel and run `npm run bot`. Commands are registered in the configured guild.
6. Map roles under Administration → Roles / Memberships. The bot only removes roles that are explicitly managed by the platform; unrelated roles remain untouched.

Commands: `/profile`, `/balance`, `/session status`, `/session start`, `/session end`, `/priority status`, `/priority request`, `/moderate`, `/case`, `/appeal`, `/applications`, `/activity`. Replies are private. Staff commands reuse server authorization. Moderation commands record community cases; they do not issue ER:LC or Discord bans.

Queued Discord delivery is at-least-once; a crash after sending but before acknowledging can duplicate a notice. Failed jobs retry with backoff, up to 10 attempts. Monitor `Outbox` for exhausted jobs. No Discord messages are sent during installation or tests.

## Roblox linking

Register an OAuth application in Roblox Creator Hub and add `${APP_URL}/api/auth/roblox/callback` as an allowed redirect. Configure its client ID and secret, then use My dashboard → Profile → Verify your Roblox account. The integration uses authorization code flow with PKCE, `openid profile`, and the stable `sub` identifier from the official userinfo endpoint. It does not accept a typed username as proof of ownership, store Roblox passwords, or scrape private endpoints.

Provider documentation: [Roblox OAuth](https://create.roblox.com/docs/cloud/auth/oauth2-reference).

## Owner bootstrap

1. Configure Discord OAuth and sign in with the intended owner account.
2. Set `BOOTSTRAP_DISCORD_ID` to that account's verified numeric Discord ID.
3. Run `npm run bootstrap` on the server.
4. Remove `BOOTSTRAP_DISCORD_ID` and restart the server. The grant is audited.

Ownership grants `*`. Regular administrators receive explicit permissions. The web UI cannot grant or modify Ownership. The database administrator can always change database state and must be trusted.

## Commands and verification

```sh
npm run dev             # Development server
npm run db:generate     # Generate Prisma client after schema changes
npm run db:migrate      # Apply versioned migrations
npm run db:seed         # Import initial community data (does not overwrite edits)
npm run lint
npm run typecheck
npm test                # Applies migrations to TEST_DATABASE_URL, then integration tests
npm run build
npm start               # Production web process
npm run worker          # Timed priority/moderation expiration and cleanup
npm run bot             # Optional Discord process
```

On Windows, stop running application processes before regenerating the Prisma client: Windows locks its native query-engine DLL while loaded. Build does not regenerate the client; run `db:generate` after installation and schema changes.

Tests create uniquely named `TEST_` records only in the separate test database. They do not delete or reset a production database. Tests cover authentication state/session validation, direct API access, department scope, applications, moderation permissions, appeal ownership/history, economy idempotency/overdrafts, session lifecycle, priority races, report-claim races, CAD ownership and immutable logs.

## Production deployment

This application needs a Node.js server and PostgreSQL. **GitHub Pages cannot run its authentication, database, bot, or server APIs.** Pushing source to GitHub does not deploy the live domain. The original `CNAME` is retained as a domain reference.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker, process layout, migration procedure, backups, and release checks.

The provided shop source contains conflicting membership benefit lists. Seeded product descriptions retain the source's short summaries; membership grants use separately editable benefits. Review and reconcile them before accepting purchases. Purchases happen on Roblox and are fulfilled manually by authorized staff after verification; the app does not collect payment credentials or automatically grant benefits from a client claim.
