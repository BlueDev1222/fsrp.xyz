import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { PageHeading, Badge, Empty } from "@/components/ui";
import { ApplicationForm } from "@/components/application-form";
export default async function Detail({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  if (!process.env.DATABASE_URL)
    return <Empty title="The community database is not configured" />;
  if (section === "applications") {
    if (!(await currentUser())) redirect("/login");
    const form = await db.application.findUnique({
      where: { id },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (!form || form.status !== "OPEN") notFound();
    return (
      <>
        <PageHeading title={form.title} description={form.description} />
        <section className="panel">
          <ApplicationForm applicationId={form.id} questions={form.questions} />
        </section>
      </>
    );
  }
  if (section === "departments") {
    const department = await db.department.findUnique({
      where: { id },
      include: {
        ranks: { orderBy: { position: "asc" } },
        divisions: true,
        members: {
          where: { status: "ACTIVE" },
          include: { user: { select: { username: true } }, rank: true },
        },
        applications: { where: { status: "OPEN" } },
      },
    });
    if (!department) notFound();
    return (
      <>
        <PageHeading
          eyebrow={department.abbreviation}
          title={department.name}
          description={department.description}
        />
        <div className="content-grid two">
          <div className="stack">
            <section className="content-card">
              <h2>Department information</h2>
              <p>{department.handbook}</p>
              {department.activityRequirements && (
                <p>Activity requirements: {department.activityRequirements}</p>
              )}
              <p>Callsign format: {department.callsignFormat}</p>
              {department.discordInvite && (
                <a
                  className="button"
                  href={department.discordInvite}
                  target="_blank"
                  rel="noreferrer"
                >
                  Join department Discord
                </a>
              )}
            </section>
            <section className="content-card">
              <h2>Divisions</h2>
              {department.divisions.length ? (
                department.divisions.map((d) => (
                  <div key={d.id}>
                    <h3>{d.name}</h3>
                    <p>{d.description}</p>
                  </div>
                ))
              ) : (
                <p>Contact department leadership about current divisions.</p>
              )}
            </section>
            <section className="content-card">
              <h2>Applications</h2>
              {department.applications.map((a) => (
                <Link
                  className="button secondary"
                  key={a.id}
                  href={`/applications/${a.id}`}
                >
                  {a.title}
                </Link>
              ))}
              {!department.applications.length && (
                <p>Applications are currently closed.</p>
              )}
            </section>
          </div>
          <section className="panel">
            <h2>Department roster</h2>
            {department.members.map((m) => (
              <div className="announcement" key={m.id}>
                <h3>{m.user.username}</h3>
                <p>
                  {m.rank?.name ?? "Member"} {m.callsign && `· ${m.callsign}`}
                </p>
              </div>
            ))}
            {!department.members.length && (
              <p style={{ marginTop: 20 }}>No members have been added yet.</p>
            )}
            <div className="section-heading">
              <h2>Rank structure</h2>
            </div>
            <div className="actions-inline">
              {department.ranks.map((r) => (
                <Badge key={r.id}>{r.name}</Badge>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }
  notFound();
}
