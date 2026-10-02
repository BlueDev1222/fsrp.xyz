# Implementation and remaining scope

This repository is a functional initial release. The original brief is retained in `reference/project-brief.md`; it is broader than the current implementation.

## Implemented and locally exercised

- Database schema and versioned migrations, including immutable audit/appeal/application-review/economy records, unique active priorities and nonnegative balances.
- Opaque hashed login sessions and signed OAuth state; Roblox linking with PKCE. Provider behavior is implemented but requires live credential testing.
- Public community pages, supplied branding, all eight department descriptions, game regulations, restricted items and Roblox purchase links.
- Member records, applications, appeals, reports, session attendance, priority requests and economy history.
- Staff moderation, application/appeal decisions, reports, sessions and department member management.
- Administration for community settings, content, product listings, membership benefits, roles and grants.
- Fictional CAD records and service-specific permission checks.
- Bot commands, outbound notice queue and mapped-role synchronization.
- Setup token and verified Discord owner bootstrap.
- 20 PostgreSQL integration tests in the initial verification pass; rerun `npm test` for the current count.

## Remaining product work from the full brief

- Editing/versioning existing application questions, complete opening/closing/eligibility UI, reviewer assignment, department-only reviewer workspace, application scoring requirements and advanced filters.
- Dedicated StaffProfile/StaffRank records, a complete rank hierarchy editor, configurable activity leaderboards and staff reporting beyond audit-action aggregates.
- Department trainings, strikes history, suspensions with end dates, department-specific announcements, rank removal/reordering UI and leadership safeguards for delegated promotions.
- Setup steps for department/rank/permission customization currently describe the seeded defaults and link to administration; they do not provide a full inline editor for every step.
- Automatic membership economy rewards, entitlement enforcement and official purchase verification. Membership fulfillment is manual.
- Roblox group membership/rank/avatar refresh and ER:LC API player counts, command execution, bans and unbans. Session counts are host-managed; platform moderation does not enforce external bans.
- Complete CAD record editing/closing, configurable radio-code editor, live dispatch subscriptions and richer character history. CAD pages use explicit refresh.
- Notification preference enforcement for optional announcements/session notices, all notification event types and membership-expiry role resynchronization.
- Global cross-resource staff search and complete filtering; some tables currently provide basic list/detail/pagination only.
- Optional evidence file uploads: currently HTTPS evidence links are supported.
- Configurable external webhook endpoints/signature verification: no inbound generic webhook endpoint is exposed.
- Advanced administration controls for user disabling, session revocation, media uploads and provider settings beyond environment variables.

## External validation still required

- Discord OAuth redirect/consent with real credentials; bot startup, role hierarchy, send permissions, retry behavior in the target guild.
- Roblox OAuth approval, redirect and account-link flow against the community's real application.
- Docker image build/run on the deployment host (Docker was unavailable in the local build environment).
- Production hosting, DNS, TLS, least-privilege database roles, monitoring, backup restore drill, load testing and an independent security review.

These limitations must be resolved or accepted before calling the entire original brief complete or launching as a production service.
