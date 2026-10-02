import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { publicData } from "@/lib/public";
import { currentUser } from "@/lib/auth";
import { PageHeading, Banner, Badge, Empty, Notice } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/action-form";
import { db } from "@/lib/db";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "sessions",
      "departments",
      "applications",
      "rules",
      "restricted-items",
      "shop",
      "about",
      "staff",
      "appeals",
      "reports",
      "login",
      "403",
    ].includes(section)
  )
    notFound();
  const data = await publicData();
  const { community } = data;
  if (section === "login")
    return (
      <section className="panel login-card">
        <img
          src={community.logo}
          alt="Florida State Roleplay"
          width="80"
          height="80"
        />
        <h1>Your Florida starts here.</h1>
        <p>
          Sign in to apply, join sessions, and manage your community profile.
        </p>
        <a className="button" href="/api/auth/discord">
          Continue with Discord
        </a>
        <small className="inline-label">
          Your Discord identity is used to create your community account.
        </small>
      </section>
    );
  if (section === "403")
    return (
      <Empty title="You do not have access to this area">
        Your current community role does not include the required permission.
      </Empty>
    );
  if (section === "about")
    return (
      <>
        <PageHeading
          eyebrow="THE SUNSHINE STATE"
          title={`This is ${community.name}.`}
          description={community.description}
        />
        <Banner name="dashboard" />
        <div className="prose">
          <h2>One community. Countless stories.</h2>
          <p>
            Florida State Roleplay brings a Florida-inspired experience to
            Emergency Response: Liberty County. Whether you patrol the highways,
            answer a medical call, or build a civilian story, every member has a
            part to play.
          </p>
          <p>
            Explore our departments, read the regulations, and join Discord to
            meet the community before your next session.
          </p>
          <div className="actions-inline">
            <a
              className="button"
              href={community.discordInvite}
              target="_blank"
              rel="noreferrer"
            >
              Join Discord
            </a>
            <a
              className="button secondary"
              href={community.robloxGroupUrl}
              target="_blank"
              rel="noreferrer"
            >
              Roblox group
            </a>
          </div>
        </div>
      </>
    );
  if (section === "departments")
    return (
      <>
        <PageHeading
          title="Serve your community."
          description="Find the department that fits your next chapter."
        />
        <Banner name="departments" />
        <div className="content-grid">
          {data.departments.map((d) => (
            <article className="content-card" key={d.id}>
              <Badge>{d.abbreviation}</Badge>
              <h2>{d.name}</h2>
              <p>{d.description}</p>
              <Link className="button secondary" href={`/departments/${d.id}`}>
                Explore department
              </Link>
            </article>
          ))}
        </div>
        {!data.departments.length && <Empty />}
      </>
    );
  if (section === "sessions")
    return (
      <>
        <PageHeading
          title="See you on the streets."
          description={community.schedule}
        />
        <Banner name="sessions" />
        <Notice>
          Session times are displayed in {community.timezone}. Attendance
          check-in records your participation on the platform.
        </Notice>
        <div className="stack">
          {data.sessions.map((s) => (
            <article key={s.id} className="panel">
              <div className="section-top">
                <h2>{s.title}</h2>
                <Badge>{s.status.replaceAll("_", " ")}</Badge>
              </div>
              <p style={{ margin: "14px 0" }}>
                {s.startsAt.toLocaleString("en-US", {
                  timeZone: community.timezone,
                })}{" "}
                · Host: {s.host.username}
              </p>
              <div className="session-metrics">
                <div>
                  <span>Players</span>
                  <strong>
                    {s.playerCount} / {s.maxPlayers}
                  </strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{s.priorityStatus}</strong>
                </div>
                <div>
                  <span>Peacetime</span>
                  <strong>{s.peacetime ? "On" : "Off"}</strong>
                </div>
              </div>
              {s.notes && <p style={{ marginTop: 16 }}>{s.notes}</p>}
              {["ACTIVE", "FULL"].includes(s.status) && (
                <div className="actions-inline" style={{ marginTop: 20 }}>
                  {s.serverUrl && (
                    <a
                      className="button"
                      href={s.serverUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join server
                    </a>
                  )}
                  <ActionButton
                    action="sessions/attendance"
                    data={{ sessionId: s.id, action: "JOIN" }}
                  >
                    Check in
                  </ActionButton>
                  <ActionButton
                    action="sessions/attendance"
                    data={{ sessionId: s.id, action: "LEAVE" }}
                  >
                    Check out
                  </ActionButton>
                  <Link className="button secondary" href="/dashboard/priority">
                    Request priority
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
        {!data.sessions.length && (
          <Empty title="No sessions scheduled">
            Join Discord for the next announcement.
          </Empty>
        )}
      </>
    );
  if (section === "applications")
    return (
      <>
        <PageHeading
          title="Make your next move."
          description="Join a department or help lead the community."
        />
        <div className="content-grid">
          {data.applications.map((a) => (
            <article className="content-card" key={a.id}>
              <Badge>{a.kind}</Badge>
              <h2>{a.title}</h2>
              <p>{a.description}</p>
              <span className="inline-label">
                {a.questions.length} questions · {a.minimumAccountDays} day
                minimum Discord account age
              </span>
              <Link className="button" href={`/applications/${a.id}`}>
                Start application
              </Link>
            </article>
          ))}
        </div>
        {!data.applications.length && (
          <Empty title="Applications are currently closed">
            New opportunities will be listed here.
          </Empty>
        )}
      </>
    );
  if (section === "rules")
    return (
      <>
        <PageHeading
          title="Great roleplay starts with respect."
          description="Know the rules before your next session."
        />
        <Banner name="rules" />
        <div className="tabs">
          <Link href="/rules">Community regulations</Link>
          <Link href="/restricted-items">Restricted items</Link>
        </div>
        <div className="stack">
          {data.rules.map((r) => (
            <details className="rule" key={r.id}>
              <summary>
                {r.title} <span className="inline-label">· {r.category}</span>
              </summary>
              <p>{r.description}</p>
              {r.examples && <p>Examples: {r.examples}</p>}
              {r.punishment && <p>Guidance: {r.punishment}</p>}
            </details>
          ))}
        </div>
        {!data.rules.length && <Empty />}
      </>
    );
  if (section === "restricted-items")
    return (
      <>
        <PageHeading
          title="Restricted items"
          description="Check your eligibility before using a restricted vehicle or weapon."
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Required role / approval</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.restrictions.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.requiredRole}</td>
                  <td>{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  if (section === "shop")
    return (
      <>
        <PageHeading
          title="A little support. A bigger community."
          description="Memberships, community apparel, and more."
        />
        <Banner name="shop" />
        <Notice>
          Purchases take place on Roblox. Open a community support ticket after
          purchase to redeem your item. Check the current benefits and community
          purchase terms before buying.
        </Notice>
        <div className="tabs">
          {[...new Set(data.products.map((p) => p.category))].map((c) => (
            <a key={c} href={`#${encodeURIComponent(c)}`}>
              {c}
            </a>
          ))}
        </div>
        {[...new Set(data.products.map((p) => p.category))].map((c) => (
          <section id={encodeURIComponent(c)} key={c}>
            <div className="section-heading">
              <h2>{c}</h2>
            </div>
            <div className="content-grid">
              {data.products
                .filter((p) => p.category === c)
                .map((p) => (
                  <article className="content-card" key={p.id}>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <strong>{p.price}</strong>
                    <a
                      className="button secondary"
                      href={p.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Roblox
                    </a>
                  </article>
                ))}
            </div>
          </section>
        ))}
        {!data.products.length && <Empty title="The shop is being prepared" />}
      </>
    );
  if (section === "staff") {
    const staff = process.env.DATABASE_URL
      ? await db.user.findMany({
          where: {
            roles: {
              some: {
                role: { permissions: { hasSome: ["*", "createModeration"] } },
              },
            },
          },
          select: {
            id: true,
            username: true,
            avatar: true,
            roles: { include: { role: { select: { name: true } } } },
          },
        })
      : [];
    return (
      <>
        <PageHeading
          title="Meet the team."
          description="The people helping keep Florida fair, welcoming, and running smoothly."
        />
        <div className="content-grid">
          {staff.map((s) => (
            <article className="content-card" key={s.id}>
              {s.avatar && (
                <img
                  src={s.avatar}
                  alt=""
                  width="48"
                  height="48"
                  style={{ borderRadius: 12 }}
                />
              )}
              <h2>{s.username}</h2>
              <p>{s.roles.map((r) => r.role.name).join(" · ")}</p>
            </article>
          ))}
        </div>
        {!staff.length && <Empty title="Staff directory" />}
      </>
    );
  }
  const user = await currentUser();
  if (!user) redirect("/login");
  if (section === "reports")
    return (
      <>
        <PageHeading
          title="Let us know."
          description="Report a player, staff concern, rule violation, or bug."
          action={
            <Link className="button secondary" href="/dashboard/reports">
              My reports
            </Link>
          }
        />
        <section className="panel">
          <ActionForm
            action="reports/action"
            hidden={{ action: "CREATE" }}
            label="Submit report"
            fields={[
              {
                name: "reportedUser",
                label: "Reported user or affected feature",
                required: true,
              },
              {
                name: "category",
                label: "Category",
                type: "select",
                required: true,
                options: ["PLAYER", "STAFF", "RULE", "BUG"].map((v) => ({
                  value: v,
                  label: v,
                })),
              },
              {
                name: "description",
                label: "What happened?",
                type: "textarea",
                required: true,
              },
              { name: "evidence", label: "Evidence links", type: "list" },
            ]}
          />
        </section>
      </>
    );
  const cases = await db.moderation.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true, number: true, type: true },
  });
  return (
    <>
      <PageHeading
        title="Everyone deserves to be heard."
        description="Request a review of a moderation decision."
        action={
          <Link className="button secondary" href="/dashboard/appeals">
            My appeals
          </Link>
        }
      />
      {cases.length ? (
        <section className="panel">
          <ActionForm
            action="appeals/create"
            label="Submit appeal"
            fields={[
              {
                name: "moderationId",
                label: "Moderation case",
                type: "select",
                required: true,
                options: cases.map((c) => ({
                  value: c.id,
                  label: `${community.abbreviation}-${String(c.number).padStart(6, "0")} · ${c.type}`,
                })),
              },
              {
                name: "reason",
                label: "Why are you appealing?",
                type: "textarea",
                required: true,
              },
              {
                name: "account",
                label: "What happened from your perspective?",
                type: "textarea",
                required: true,
              },
              {
                name: "improvements",
                label: "What will you do differently?",
                type: "textarea",
                required: true,
              },
              { name: "evidence", label: "Evidence links", type: "list" },
            ]}
          />
        </section>
      ) : (
        <Empty title="No active moderations">
          There are no active cases on your account to appeal.
        </Empty>
      )}
    </>
  );
}
