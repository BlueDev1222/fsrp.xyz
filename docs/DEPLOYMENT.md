# Deployment

## Render preview from GitHub

The root `render.yaml` connects `main` to a free Node web service and free PostgreSQL database in Virginia. Open https://dashboard.render.com/blueprint/new?repo=https://github.com/BlueDev1222/fsrp.xyz and apply it in the intended workspace. Subsequent successful GitHub checks trigger deployments. Generated secrets stay in Render. Migrations and the idempotent seed run before the web server starts; this startup strategy is for the single-instance preview only.

Visitors can browse without an account. Application submission still uses Discord authentication. In the web service's Environment settings, add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` from your Discord application and allow `https://fsrp.xyz/api/auth/discord/callback` as a redirect. Add the optional Roblox and bot variables from `.env.example` only when enabling those integrations. Never commit credentials.

After the Render service is healthy, open its Custom Domains settings and use the exact DNS target shown there to replace the GitHub Pages record for `fsrp.xyz` in Cloudflare. Follow Render's domain verification instructions and verify HTTPS before testing login. Pushing to GitHub alone does not change DNS or deploy this Blueprint.

This is a preview configuration, not permanent production hosting: free PostgreSQL expires after 30 days and has no backups; free web services sleep when idle. Upgrade the database and configure backups before collecting real applications. This Blueprint does not create a paid maintenance worker or Discord bot. For full operations, add a supervised worker using `npm ci --include=dev && npm run db:generate` to build and `npm run worker` to start, with the same database URL. Configure the optional bot separately. See https://render.com/docs/free for current limits.

## Node.js host

Use Node 24, a UTF-8 PostgreSQL database, HTTPS at a trusted reverse proxy, and a process manager. Set `APP_URL` to the canonical HTTPS origin. Do not expose PostgreSQL to the public internet.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Run `npm run worker` as a separate supervised process. Run `npm run bot` only when Discord credentials and guild permissions are configured. Keep a single bot instance initially. Store secrets in the host's secret manager. `NEXT_PUBLIC_` variables must never contain secrets.

Initialize with `/setup`, sign in with Discord, then use `npm run bootstrap` to grant ownership. There is no insecure development-admin shortcut.

## Docker Compose

Copy `.env.example` to `.env`. Add `POSTGRES_PASSWORD` with a random hexadecimal password. For the compose services, set `DATABASE_URL=postgresql://fsrp:<password>@db:5432/fsrp`. Set all provider variables and the canonical `APP_URL`.

```sh
docker compose up -d db
docker compose build
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app worker
# Optional, after credentials are configured:
docker compose --profile discord up -d bot
```

Web traffic binds to loopback port 3000; route an HTTPS reverse proxy to it. The database has no published port. The image runs as the non-root `node` user. The `.dockerignore` excludes `.env`, local output and test databases.

## Release procedure

1. Back up the database and verify the backup is readable.
2. Test migrations against a restored staging database.
3. Run lint, typecheck, integration tests and production build.
4. Apply migrations once using a privileged migration account; run the web and workers with a less-privileged runtime account.
5. Restart processes and verify `/api/health`, login, a member submission, a staff review and the worker logs.
6. Verify the canonical OAuth redirects and HTTPS cookie behavior on the deployed origin.

Do not rely on rolling back SQL migrations automatically. Prefer a forward fix; if necessary restore the tested backup during a maintenance window.

## Backups

Use daily encrypted `pg_dump -Fc` backups plus your provider's point-in-time recovery where available. Keep backups outside the database host. Restore into a separate database regularly and verify account, application, economy and audit counts. Use environment variables or a protected `.pgpass` file for credentials; do not embed passwords in logged commands. Retain evidence URLs according to community policy and restrict access to moderation records.

## Security checklist

- [ ] Unique random `SESSION_SECRET` and one-time `SETUP_TOKEN`; setup closed after completion.
- [ ] Correct HTTPS `APP_URL`; exact OAuth redirect allowlists.
- [ ] Remove bootstrap and setup secrets after use.
- [ ] Separate migration and runtime database roles; runtime role cannot alter schema or disable triggers.
- [ ] PostgreSQL TLS and network restrictions configured.
- [ ] Bot gets only necessary channel/role permissions, with managed roles below the bot.
- [ ] Audit log access limited to authorized roles.
- [ ] External provider flows tested using a member and a staff account.
- [ ] Maintenance worker supervised; failed outbox jobs monitored.
- [ ] Dependency audit reviewed, backups tested and rate-limit volume monitored.
- [ ] Read `STATUS.md`, accept or complete remaining scope before launch.

Database triggers protect history from normal application operations; the database owner remains capable of altering schema. The application does not claim cryptographic tamper-proof storage.
