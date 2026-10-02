import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser, actorFromUser } from "@/lib/auth";
import { can } from "@/lib/policy";
import { defaultCommunity } from "@/lib/public";
import { PageHeading, Notice } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { AdminEditor, ApplicationBuilder } from "@/components/admin-editor";
const sections = [
  "general",
  "departments",
  "rules",
  "restrictions",
  "products",
  "memberships",
  "roles",
  "applications",
  "economy",
  "announcements",
  "integrations",
  "security",
];
export default async function Admin({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const actor = await actorFromUser(user);
  if (!can(actor, "manageCommunitySettings")) redirect("/403");
  const tab = (await params).tab?.[0] ?? "general";
  if (!sections.includes(tab)) notFound();
  const heading = (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Make Florida your own."
        description="Manage your community's content, roles, and operations."
      />
      <nav className="tabs">
        {sections.map((s) => (
          <Link
            className={tab === s ? "active" : ""}
            key={s}
            href={`/admin/${s}`}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </nav>
    </>
  );
  if (tab === "general") {
    const c =
      (await db.community.findUnique({ where: { id: "community" } })) ??
      defaultCommunity;
    return (
      <>
        {heading}
        <section className="panel">
          <ActionForm
            action="settings/save"
            fields={[
              {
                name: "name",
                label: "Community name",
                value: c.name,
                required: true,
              },
              {
                name: "abbreviation",
                label: "Abbreviation",
                value: c.abbreviation,
                required: true,
              },
              {
                name: "description",
                label: "Description",
                value: c.description,
                required: true,
                type: "textarea",
              },
              {
                name: "accent",
                label: "Accent color (hex)",
                value: c.accent,
                required: true,
              },
              { name: "logo", label: "Logo asset path", value: c.logo },
              { name: "banner", label: "Banner asset path", value: c.banner },
              {
                name: "discordInvite",
                label: "Discord invite",
                value: c.discordInvite,
                required: true,
              },
              {
                name: "robloxGroupUrl",
                label: "Roblox group URL",
                value: c.robloxGroupUrl,
                required: true,
              },
              {
                name: "serverUrl",
                label: "ER:LC server URL",
                value: c.serverUrl ?? "",
              },
              {
                name: "schedule",
                label: "Session schedule",
                value: c.schedule,
                required: true,
              },
              {
                name: "timezone",
                label: "IANA time zone",
                value: c.timezone,
                required: true,
              },
            ]}
          />
        </section>
      </>
    );
  }
  if (tab === "applications")
    return (
      <>
        {heading}
        <section className="panel">
          <ApplicationBuilder
            departments={await db.department.findMany({
              select: { id: true, name: true },
            })}
          />
        </section>
      </>
    );
  if (tab === "economy")
    return (
      <>
        {heading}
        <Notice>
          Changes use an immutable ledger. Correct mistakes with a compensating
          transaction.
        </Notice>
        <section className="panel">
          <ActionForm
            action="economy/transaction"
            fields={[
              { name: "userId", label: "Member ID", required: true },
              {
                name: "amount",
                label: "Amount (negative to debit)",
                type: "number",
                required: true,
              },
              {
                name: "type",
                label: "Transaction type",
                type: "select",
                required: true,
                options: [
                  "SESSION_REWARD",
                  "STAFF_REWARD",
                  "PURCHASE",
                  "ADMIN_ADJUSTMENT",
                  "MEMBERSHIP_REWARD",
                  "EVENT_REWARD",
                ].map((value) => ({ value, label: value })),
              },
              {
                name: "reason",
                label: "Reason",
                type: "textarea",
                required: true,
              },
            ]}
          />
        </section>
      </>
    );
  if (tab === "integrations")
    return (
      <>
        {heading}
        <div className="content-grid">
          {[
            [
              "Discord sign-in",
              Boolean(
                process.env.DISCORD_CLIENT_ID &&
                  process.env.DISCORD_CLIENT_SECRET,
              ),
            ],
            [
              "Roblox verification",
              Boolean(
                process.env.ROBLOX_CLIENT_ID &&
                  process.env.ROBLOX_CLIENT_SECRET,
              ),
            ],
            [
              "Discord bot",
              Boolean(
                process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID,
              ),
            ],
          ].map(([name, ready]) => (
            <section className="content-card" key={String(name)}>
              <h2>{name}</h2>
              <p>
                {ready
                  ? "Credentials configured. Verify connectivity with the provider."
                  : "Credentials required in the deployment environment."}
              </p>
            </section>
          ))}
        </div>
        <Notice>
          Keep credentials in the deployment environment. Discord role mappings
          are managed under Roles and Memberships. The bot worker sends queued
          announcements and synchronizes mapped roles.
        </Notice>
      </>
    );
  if (tab === "security")
    return (
      <>
        {heading}
        <div className="content-grid two">
          <section className="content-card">
            <h2>Account access</h2>
            <p>
              Sign-in uses verified Discord identities. Roblox links use Roblox
              OAuth with PKCE. Permissions are checked for every operation.
            </p>
            <Link className="button secondary" href="/admin/roles">
              Manage roles
            </Link>
          </section>
          <section className="content-card">
            <h2>Audit history</h2>
            <p>
              Audit, appeal review, application review, and economy history are
              protected from updates and deletion by database triggers.
            </p>
            <Link className="button secondary" href="/staff-panel/logs">
              View audit log
            </Link>
          </section>
        </div>
      </>
    );
  const titleField = { name: "name", label: "Name" };
  const descriptionField = {
    name: "description",
    label: "Description",
    type: "textarea" as const,
  };
  let records: unknown[] = [];
  let fields: React.ComponentProps<typeof AdminEditor>["fields"] = [];
  switch (tab) {
    case "departments":
      records = await db.department.findMany();
      fields = [
        titleField,
        { name: "abbreviation", label: "Abbreviation" },
        descriptionField,
        { name: "discordInvite", label: "Discord invite" },
        { name: "handbook", label: "Handbook", type: "textarea" },
        { name: "callsignFormat", label: "Callsign format (### for 100–999)" },
        {
          name: "activityRequirements",
          label: "Activity requirements",
          type: "textarea",
        },
        {
          name: "applicationsOpen",
          label: "Applications open",
          type: "checkbox",
        },
      ];
      break;
    case "rules":
      records = await db.rule.findMany({ orderBy: { position: "asc" } });
      fields = [
        { name: "title", label: "Title" },
        descriptionField,
        { name: "category", label: "Category" },
        { name: "examples", label: "Examples", type: "textarea" },
        { name: "punishment", label: "Punishment guidance", type: "textarea" },
        { name: "position", label: "Display order", type: "number" },
      ];
      break;
    case "restrictions":
      records = await db.restrictedItem.findMany();
      fields = [
        titleField,
        { name: "category", label: "Category (Vehicles / Weapons / Other)" },
        { name: "restriction", label: "Restriction level" },
        { name: "requiredRole", label: "Required role / approval" },
        { name: "notes", label: "Notes", type: "textarea" },
      ];
      break;
    case "products":
      records = await db.shopProduct.findMany();
      fields = [
        titleField,
        descriptionField,
        { name: "category", label: "Category" },
        { name: "price", label: "Displayed price" },
        { name: "purchaseUrl", label: "Purchase URL (HTTPS)" },
        { name: "available", label: "Available", type: "checkbox" },
        { name: "position", label: "Display order", type: "number" },
      ];
      break;
    case "memberships":
      records = await db.membership.findMany();
      fields = [
        titleField,
        { name: "benefits", label: "Benefits (one per line)", type: "list" },
        { name: "discordRoleId", label: "Discord role ID" },
        { name: "position", label: "Display order", type: "number" },
      ];
      break;
    case "roles":
      if (!can(actor, "managePermissions")) redirect("/403");
      records = await db.role.findMany();
      fields = [
        titleField,
        {
          name: "permissions",
          label: "Permissions (one per line)",
          type: "list",
        },
        { name: "discordRoleId", label: "Discord role ID" },
        { name: "position", label: "Position", type: "number" },
      ];
      break;
    case "announcements":
      records = await db.announcement.findMany({
        orderBy: { createdAt: "desc" },
      });
      fields = [
        { name: "title", label: "Title" },
        { name: "body", label: "Announcement", type: "textarea" },
        { name: "category", label: "Category" },
        { name: "pinned", label: "Pinned", type: "checkbox" },
      ];
      break;
  }
  const serialRecords = JSON.parse(JSON.stringify(records));
  return (
    <>
      {heading}
      <AdminEditor resource={tab} records={serialRecords} fields={fields} />
      {tab === "roles" && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Assign / remove a member role</h2>
          <ActionForm
            action="roles/assign"
            fields={[
              { name: "userId", label: "Member ID", required: true },
              {
                name: "roleId",
                label: "Role",
                type: "select",
                required: true,
                options: (await db.role.findMany()).map((r) => ({
                  value: r.id,
                  label: r.name,
                })),
              },
              { name: "remove", label: "Remove this role", type: "checkbox" },
            ]}
          />
        </section>
      )}
      {tab === "memberships" && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 20 }}>Grant verified purchase benefits</h2>
          <ActionForm
            action="membership/assign"
            fields={[
              { name: "userId", label: "Member ID", required: true },
              {
                name: "membershipId",
                label: "Membership",
                type: "select",
                required: true,
                options: (await db.membership.findMany()).map((m) => ({
                  value: m.id,
                  label: m.name,
                })),
              },
              {
                name: "expiresAt",
                label: "Expiration (optional)",
                type: "datetime-local",
              },
            ]}
          />
        </section>
      )}
    </>
  );
}
