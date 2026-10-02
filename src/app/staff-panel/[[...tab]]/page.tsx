import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser, actorFromUser } from "@/lib/auth";
import { can } from "@/lib/policy";
import { db } from "@/lib/db";
import { PageHeading, Badge } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ActionForm, type Field } from "@/components/action-form";
const sections: Record<
  string,
  {
    label: string;
    permission: string;
    resource?: string;
    columns?: { key: string; label: string }[];
  }
> = {
  overview: { label: "Overview", permission: "viewStaff" },
  moderations: {
    label: "Moderations",
    permission: "viewModerations",
    resource: "moderations",
    columns: [
      { key: "number", label: "Case" },
      { key: "user.username", label: "Member" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
    ],
  },
  users: {
    label: "Players & staff",
    permission: "viewStaff",
    resource: "users",
    columns: [
      { key: "username", label: "Discord" },
      { key: "robloxUsername", label: "Roblox" },
      { key: "lastActiveAt", label: "Last sign-in" },
    ],
  },
  applications: {
    label: "Applications",
    permission: "manageApplications",
    resource: "applications",
    columns: [
      { key: "application.title", label: "Form" },
      { key: "user.username", label: "Applicant" },
      { key: "status", label: "Status" },
    ],
  },
  appeals: {
    label: "Appeals",
    permission: "viewAppeals",
    resource: "appeals",
    columns: [
      { key: "moderation.number", label: "Case" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status" },
    ],
  },
  sessions: { label: "Sessions", permission: "manageSessions" },
  priority: {
    label: "Priority",
    permission: "manageSessions",
    resource: "priority",
    columns: [
      { key: "type", label: "Scene" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
    ],
  },
  reports: {
    label: "Reports",
    permission: "manageReports",
    resource: "reports",
    columns: [
      { key: "reportedUser", label: "Subject" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
    ],
  },
  departments: { label: "Departments", permission: "manageDepartments" },
  activity: { label: "Activity", permission: "viewStaff" },
  logs: {
    label: "Audit logs",
    permission: "viewAuditLogs",
    resource: "logs",
    columns: [
      { key: "actor.username", label: "Actor" },
      { key: "action", label: "Action" },
      { key: "target", label: "Target" },
      { key: "createdAt", label: "Date" },
    ],
  },
};
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default async function StaffPanel({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const actor = await actorFromUser(user);
  const tab = (await params).tab?.[0] ?? "overview";
  const section = sections[tab];
  if (!section) notFound();
  if (!can(actor, section.permission)) redirect("/403");
  let action: string | undefined;
  let fields: Field[] = [];
  let hidden: Record<string, unknown> = {};
  if (tab === "moderations" && can(actor, "createModeration")) {
    action = "moderations/create";
    fields = [
      {
        name: "userId",
        label: "Member ID (from Players & staff → View record)",
        required: true,
      },
      {
        name: "type",
        label: "Action",
        type: "select",
        required: true,
        options: options([
          "NOTE",
          "WARNING",
          "KICK",
          "TEMPORARY_BAN",
          "PERMANENT_BAN",
          "BLACKLIST",
        ]),
      },
      {
        name: "reason",
        label: "Reason shown to the member",
        type: "textarea",
        required: true,
      },
      { name: "evidence", label: "Evidence URLs", type: "list" },
      {
        name: "expiresAt",
        label: "Expiration (required for temporary bans)",
        type: "datetime-local",
      },
      {
        name: "internalNotes",
        label: "Internal staff notes",
        type: "textarea",
      },
    ];
  }
  if (tab === "applications") {
    action = "applications/review";
    fields = [
      {
        name: "id",
        label: "Submission",
        required: true,
        type: "select",
        options: (
          await db.applicationSubmission.findMany({
            where: { status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] } },
            include: { user: true, application: true },
            take: 100,
          })
        ).map((s) => ({
          value: s.id,
          label: `${s.user.username} · ${s.application.title}`,
        })),
      },
      {
        name: "status",
        label: "Decision",
        type: "select",
        required: true,
        options: options(["UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "DENIED"]),
      },
      {
        name: "note",
        label: "Review note (final decisions are visible to the applicant)",
        type: "textarea",
        required: true,
      },
      { name: "score", label: "Score (0–100)", type: "number" },
    ];
  }
  if (tab === "appeals" && can(actor, "manageAppeals")) {
    action = "appeals/review";
    fields = [
      {
        name: "id",
        label: "Appeal",
        required: true,
        type: "select",
        options: (
          await db.appeal.findMany({
            where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
            include: { moderation: true, user: true },
            take: 100,
          })
        ).map((a) => ({
          value: a.id,
          label: `${a.user.username} · case ${a.moderation.number}`,
        })),
      },
      {
        name: "status",
        label: "Decision",
        type: "select",
        required: true,
        options: options(["UNDER_REVIEW", "ACCEPTED", "DENIED"]),
      },
      {
        name: "note",
        label: "Review note (final decisions are visible to the member)",
        type: "textarea",
        required: true,
      },
    ];
  }
  if (tab === "sessions") {
    action = "sessions/create";
    fields = [
      { name: "title", label: "Session title", required: true },
      {
        name: "startsAt",
        label: "Start time (your local time)",
        type: "datetime-local",
        required: true,
      },
      { name: "serverUrl", label: "Server join URL" },
      { name: "serverCode", label: "Server code" },
      {
        name: "maxPlayers",
        label: "Maximum players",
        type: "number",
        value: 40,
        required: true,
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ];
  }
  if (tab === "priority") {
    action = "priority/decide";
    fields = [
      {
        name: "id",
        label: "Priority request",
        type: "select",
        required: true,
        options: (
          await db.priorityRequest.findMany({
            where: { status: { in: ["REQUESTED", "ACTIVE", "CLAIMED"] } },
            include: { user: true },
            take: 100,
          })
        ).map((p) => ({
          value: p.id,
          label: `${p.user.username} · ${p.type}`,
        })),
      },
      {
        name: "status",
        label: "Decision",
        type: "select",
        required: true,
        options: options(["ACTIVE", "DENIED", "ENDED"]),
      },
    ];
  }
  if (tab === "reports") {
    action = "reports/action";
    hidden = { action: "UPDATE" };
    fields = [
      {
        name: "id",
        label: "Report",
        type: "select",
        required: true,
        options: (
          await db.report.findMany({
            where: { status: { notIn: ["RESOLVED", "DISMISSED"] } },
            take: 100,
          })
        ).map((r) => ({
          value: r.id,
          label: `${r.category} · ${r.reportedUser}`,
        })),
      },
      {
        name: "status",
        label: "Action",
        type: "select",
        required: true,
        options: options(["CLAIMED", "INVESTIGATING", "RESOLVED", "DISMISSED"]),
      },
      { name: "resolution", label: "Resolution / response", type: "textarea" },
    ];
  }
  if (tab === "departments") {
    action = "departments/action";
    hidden = { action: "MEMBER" };
    fields = [
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        required: true,
        options: (await db.department.findMany()).map((d) => ({
          value: d.id,
          label: d.name,
        })),
      },
      { name: "userId", label: "Member ID", required: true },
      {
        name: "rankId",
        label: "Rank",
        type: "select",
        options: (
          await db.departmentRank.findMany({ include: { department: true } })
        ).map((r) => ({
          value: r.id,
          label: `${r.department.abbreviation} · ${r.name}`,
        })),
      },
      { name: "callsign", label: "Callsign" },
      {
        name: "status",
        label: "Membership status",
        type: "select",
        required: true,
        options: options(["ACTIVE", "SUSPENDED", "REMOVED"]),
      },
      { name: "strikes", label: "Strikes", type: "number", value: 0 },
    ];
  }
  const sessions =
    tab === "sessions"
      ? await db.session.findMany({ orderBy: { startsAt: "desc" }, take: 50 })
      : [];
  return (
    <>
      <PageHeading
        eyebrow="STAFF WORKSPACE"
        title={section.label}
        description="Community operations, with a record of every decision."
      />
      <nav className="tabs" aria-label="Staff workspace">
        {Object.entries(sections)
          .filter(([, s]) => can(actor, s.permission))
          .map(([key, s]) => (
            <Link
              className={tab === key ? "active" : ""}
              href={key === "overview" ? "/staff-panel" : `/staff-panel/${key}`}
              key={key}
            >
              {s.label}
            </Link>
          ))}
      </nav>
      {tab === "overview" && (
        <div className="content-grid">
          {(
            await Promise.all([
              db.applicationSubmission.count({ where: { status: "PENDING" } }),
              db.appeal.count({ where: { status: "PENDING" } }),
              db.report.count({ where: { status: "OPEN" } }),
              db.session.count({
                where: { status: { in: ["ACTIVE", "FULL"] } },
              }),
            ])
          ).map((n, i) => (
            <section className="content-card" key={i}>
              <span className="inline-label">
                {
                  [
                    "Pending applications",
                    "Pending appeals",
                    "Open reports",
                    "Active sessions",
                  ][i]
                }
              </span>
              <strong className="data-value">{n}</strong>
            </section>
          ))}
        </div>
      )}
      {section.resource && section.columns && (
        <DataTable
          resource={section.resource}
          columns={section.columns}
          staff
        />
      )}
      {action && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>
            {tab === "sessions"
              ? "Schedule a session"
              : tab === "moderations"
                ? "Create moderation"
                : "Take action"}
          </h2>
          <ActionForm action={action} fields={fields} hidden={hidden} />
        </section>
      )}
      {tab === "moderations" && can(actor, "editModeration") && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Revoke a moderation</h2>
          <ActionForm
            action="moderations/revoke"
            fields={[
              { name: "id", label: "Moderation record ID", required: true },
              {
                name: "reason",
                label: "Reason for revocation",
                type: "textarea",
                required: true,
              },
            ]}
          />
        </section>
      )}
      {tab === "sessions" && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Update session</h2>
          <ActionForm
            action="sessions/update"
            fields={[
              {
                name: "id",
                label: "Session",
                type: "select",
                required: true,
                options: sessions.map((s) => ({
                  value: s.id,
                  label: `${s.title} · ${s.status}`,
                })),
              },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: options([
                  "STARTING_SOON",
                  "ACTIVE",
                  "FULL",
                  "ENDED",
                  "CANCELLED",
                ]),
              },
              { name: "playerCount", label: "Player count", type: "number" },
              {
                name: "priorityStatus",
                label: "Priority availability",
                type: "select",
                options: options(["AVAILABLE", "COOLDOWN", "PEACETIME"]),
              },
              {
                name: "peacetime",
                label: "Enable peacetime",
                type: "checkbox",
              },
            ]}
          />
        </section>
      )}
      {tab === "activity" && (
        <div className="stack">
          {(
            await db.auditLog.groupBy({
              by: ["actorId", "action"],
              where: {
                actorId: { not: null },
                createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
              },
              _count: true,
            })
          ).map((a, i) => (
            <div className="panel section-top" key={i}>
              <span>{a.actorId}</span>
              <Badge>{a.action}</Badge>
              <strong>{a._count}</strong>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
