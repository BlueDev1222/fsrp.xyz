import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicData } from "@/lib/public";
import { PageHeading, Banner, Badge, Empty } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/action-form";
import { DataTable } from "@/components/data-table";
const tabs = [
  "overview",
  "profile",
  "applications",
  "departments",
  "moderations",
  "appeals",
  "reports",
  "attendance",
  "priority",
  "economy",
  "membership",
  "notifications",
  "settings",
];
const columns: Record<string, { key: string; label: string }[]> = {
  applications: [
    { key: "application.title", label: "Application" },
    { key: "status", label: "Status" },
    { key: "decision", label: "Decision" },
  ],
  moderations: [
    { key: "number", label: "Case" },
    { key: "type", label: "Type" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
  ],
  appeals: [
    { key: "moderation.number", label: "Case" },
    { key: "status", label: "Status" },
    { key: "decision", label: "Decision" },
  ],
  reports: [
    { key: "reportedUser", label: "Subject" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
  ],
  attendance: [
    { key: "session.title", label: "Session" },
    { key: "joinedAt", label: "Check-in" },
    { key: "minutes", label: "Minutes" },
  ],
  priority: [
    { key: "type", label: "Scene" },
    { key: "status", label: "Status" },
    { key: "duration", label: "Minutes" },
  ],
  economy: [
    { key: "amount", label: "Amount" },
    { key: "type", label: "Type" },
    { key: "reason", label: "Reason" },
    { key: "createdAt", label: "Date" },
  ],
};
export default async function Dashboard({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const tab = (await params).tab?.[0] ?? "overview";
  if (!tabs.includes(tab)) notFound();
  const [economy, memberships] = await Promise.all([
    db.economyAccount.findUnique({ where: { userId: user.id } }),
    db.userMembership.findMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { membership: true },
    }),
  ]);
  const header = (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title={
          tab === "overview" ? `Welcome back, ${user.username}.` : `My ${tab}`
        }
        description="Your place in the Florida community."
      />
      <nav className="tabs" aria-label="Member dashboard">
        {tabs.map((t) => (
          <Link
            className={tab === t ? "active" : ""}
            href={t === "overview" ? "/dashboard" : `/dashboard/${t}`}
            key={t}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </nav>
    </>
  );
  if (tab === "overview") {
    const data = await publicData();
    const session = data.sessions.find((s) =>
      ["ACTIVE", "FULL"].includes(s.status),
    );
    const pending = await db.applicationSubmission.count({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] },
      },
    });
    return (
      <>
        {header}
        <Banner name="dashboard" />
        <div className="stats-grid">
          {[
            ["Economy balance", Number(economy?.balance ?? 0).toLocaleString()],
            ["Pending applications", pending],
            ["Departments", user.departments.length],
            ["Membership", memberships[0]?.membership.name ?? "Member"],
          ].map(([title, value]) => (
            <div className="stat" key={title}>
              <div>
                <span>{title}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
        <div className="content-grid two">
          <section className="content-card">
            <Badge>{session ? session.status : "OFFLINE"}</Badge>
            <h2>{session?.title ?? "No active session"}</h2>
            <p>
              {session
                ? `Priority: ${session.priorityStatus} · Peacetime: ${session.peacetime ? "On" : "Off"}`
                : data.community.schedule}
            </p>
            <Link className="button" href="/sessions">
              View sessions
            </Link>
          </section>
          <section className="content-card">
            <h2>Your community identity</h2>
            <p>
              Discord: {user.username}
              <br />
              Roblox: {user.robloxUsername ?? "Not linked"}
              <br />
              Roles:{" "}
              {user.roles.map((r) => r.role.name).join(", ") ||
                "Community member"}
            </p>
            <Link className="button secondary" href="/dashboard/profile">
              Manage profile
            </Link>
          </section>
        </div>
      </>
    );
  }
  if (tab === "profile")
    return (
      <>
        {header}
        <section className="content-card">
          <h2>{user.username}</h2>
          <p>
            Discord ID: {user.discordId}
            <br />
            Joined: {user.createdAt.toLocaleDateString()}
            <br />
            Roblox: {user.robloxUsername ?? "Not linked"}{" "}
            {user.robloxId && `(${user.robloxId})`}
          </p>
          <a href="/api/auth/roblox" className="button">
            {user.robloxId
              ? "Update Roblox link"
              : "Verify your Roblox account"}
          </a>
          <p>
            Roblox linking verifies account ownership through Roblox
            authorization.
          </p>
        </section>
      </>
    );
  if (tab === "departments")
    return (
      <>
        {header}
        <div className="content-grid">
          {user.departments.map((d) => (
            <section className="content-card" key={d.id}>
              <Badge>{d.status}</Badge>
              <h2>{d.department.name}</h2>
              <p>
                {d.rank?.name ?? "Member"} · {d.callsign ?? "No callsign"}
              </p>
              <Link
                href={`/departments/${d.departmentId}`}
                className="button secondary"
              >
                Department hub
              </Link>
            </section>
          ))}
        </div>
        {!user.departments.length && (
          <Empty title="Your next chapter is waiting">
            <Link href="/applications">Explore department applications.</Link>
          </Empty>
        )}
      </>
    );
  if (tab === "membership")
    return (
      <>
        {header}
        <div className="content-grid">
          {memberships.map((m) => (
            <section className="content-card" key={m.id}>
              <h2>{m.membership.name}</h2>
              <ul>
                {m.membership.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p>
                {m.expiresAt
                  ? `Expires ${m.expiresAt.toLocaleDateString()}`
                  : "No expiration"}
              </p>
            </section>
          ))}
        </div>
        {!memberships.length && (
          <Empty title="No active membership">
            <Link href="/shop">Explore supporter memberships.</Link>
          </Empty>
        )}
      </>
    );
  if (tab === "notifications") {
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return (
      <>
        {header}
        <div className="stack">
          {notifications.map((n) => (
            <article className="content-card" key={n.id}>
              <Badge>{n.readAt ? "READ" : "UNREAD"}</Badge>
              <h2>{n.title}</h2>
              <p>{n.body}</p>
              <div className="actions-inline">
                <Link className="button secondary" href={n.href}>
                  Open
                </Link>
                {!n.readAt && (
                  <ActionButton action="notifications/read" data={{ id: n.id }}>
                    Mark as read
                  </ActionButton>
                )}
              </div>
            </article>
          ))}
        </div>
        {!notifications.length && <Empty title="You're all caught up" />}
      </>
    );
  }
  if (tab === "settings")
    return (
      <>
        {header}
        <section className="panel">
          <h2 style={{ marginBottom: 20 }}>Notification preferences</h2>
          <ActionForm
            action="settings/preferences"
            fields={[
              {
                name: "announcements",
                label: "Community announcements",
                type: "checkbox",
                value:
                  (user.notificationPreferences as Record<string, boolean>)
                    .announcements ?? true,
              },
              {
                name: "sessions",
                label: "Session announcements",
                type: "checkbox",
                value:
                  (user.notificationPreferences as Record<string, boolean>)
                    .sessions ?? true,
              },
            ]}
          />
        </section>
      </>
    );
  return (
    <>
      {header}
      {tab === "economy" && (
        <div className="notice">
          Current balance: {Number(economy?.balance ?? 0).toLocaleString()}{" "}
          community currency. This is fictional community currency.
        </div>
      )}
      {tab === "priority" && (
        <section className="panel" style={{ marginBottom: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Request a scene</h2>
          <ActionForm
            action="priority/request"
            label="Request priority"
            fields={[
              {
                name: "sessionId",
                label: "Session",
                type: "select",
                required: true,
                options: (
                  await db.session.findMany({
                    where: { status: { in: ["ACTIVE", "FULL"] } },
                  })
                ).map((s) => ({ value: s.id, label: s.title })),
              },
              { name: "type", label: "Scene type", required: true },
              {
                name: "participants",
                label: "Participants",
                type: "list",
                required: true,
              },
              {
                name: "description",
                label: "Scene description",
                type: "textarea",
                required: true,
              },
              {
                name: "duration",
                label: "Requested minutes (1–60)",
                type: "number",
                required: true,
                value: 15,
              },
            ]}
          />
        </section>
      )}
      <DataTable resource={tab} columns={columns[tab]} />
      {tab === "applications" && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Withdraw an application</h2>
          <ActionForm
            action="applications/withdraw"
            fields={[
              {
                name: "id",
                label: "Application",
                type: "select",
                required: true,
                options: (
                  await db.applicationSubmission.findMany({
                    where: {
                      userId: user.id,
                      status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] },
                    },
                    include: { application: true },
                  })
                ).map((a) => ({ value: a.id, label: a.application.title })),
              },
            ]}
            label="Withdraw application"
          />
        </section>
      )}
    </>
  );
}
