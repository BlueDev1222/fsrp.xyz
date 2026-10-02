import Link from "next/link";
import {
  Building2,
  CalendarDays,
  FileCheck2,
  Users,
  Shield,
  ArrowUpRight,
  Radio,
  Clock3,
  BookOpen,
  ShoppingBag,
} from "lucide-react";
import { publicData } from "@/lib/public";
import { Badge, Empty } from "@/components/ui";
export default async function Home() {
  const data = await publicData();
  const { community } = data;
  const active = data.sessions.find((s) =>
    ["ACTIVE", "FULL", "STARTING_SOON"].includes(s.status),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>Welcome to Florida.</h1>
          <p>Your community. Your story. Everything you need in one place.</p>
        </div>
        <Badge>ER:LC COMMUNITY</Badge>
      </div>
      <div className="hero-banner">
        <img
          src={community.banner}
          alt="Florida State Roleplay dashboard — Roleplay like no other."
        />
        <div className="hero-bottom">
          <span>
            <span className="tiny-square" /> THE SUNSHINE STATE IS CALLING
          </span>
          <a
            className="button"
            href={community.discordInvite}
            target="_blank"
            rel="noreferrer"
          >
            Join our Discord <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <div className="stats-grid">
        {[
          ["Community members", data.counts.members, Users],
          ["Staff members", data.counts.staff, Shield],
          ["Departments", data.departments.length, Building2],
          ["Sessions hosted", data.counts.sessions, CalendarDays],
        ].map(([label, count, Icon]) => {
          const Symbol = Icon as typeof Users;
          return (
            <div className="stat" key={String(label)}>
              <div className="stat-icon">
                <Symbol size={20} />
              </div>
              <div>
                <span>{String(label)}</span>
                <strong>
                  {data.configured ? Number(count).toLocaleString() : "—"}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
      <div className="home-grid">
        <div>
          <section className="panel live-panel">
            <div className="section-top">
              <h2>
                <Radio size={19} /> On the streets
              </h2>
              <Badge>
                {active ? active.status.replaceAll("_", " ") : "OFFLINE"}
              </Badge>
            </div>
            <div className="session-title">
              <h3>{active?.title ?? "The next story is yours."}</h3>
              <p>
                {active
                  ? `Hosted by ${active.host.username}`
                  : community.schedule}
              </p>
            </div>
            <div className="session-metrics">
              <div>
                <span>Players</span>
                <strong>
                  {active
                    ? `${active.playerCount} / ${active.maxPlayers}`
                    : "— / —"}
                </strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>
                  {active?.priorityStatus.replaceAll("_", " ") ??
                    "No active session"}
                </strong>
              </div>
              <div>
                <span>Peacetime</span>
                <strong>
                  {active ? (active.peacetime ? "Enabled" : "Disabled") : "—"}
                </strong>
              </div>
            </div>
            <div className="panel-bottom">
              <span>
                <Clock3 size={15} />{" "}
                {active
                  ? "Session status managed by the host"
                  : "Watch Discord for the next session"}
              </span>
              <Link className="button secondary" href="/sessions">
                View sessions
              </Link>
            </div>
          </section>
          <section>
            <div className="section-heading">
              <div>
                <h2>Find your place</h2>
                <p>Different uniforms. One community.</p>
              </div>
              <Link href="/departments">
                All departments <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="department-grid">
              {data.departments
                .filter((d) => !["HUB", "GOV"].includes(d.abbreviation))
                .slice(0, 4)
                .map((d, index) => (
                  <Link
                    className={`department-card department-${index}`}
                    href={`/departments/${d.id}`}
                    key={d.id}
                  >
                    <div className="department-icon">
                      <Shield size={24} />
                    </div>
                    <Badge>{d.abbreviation}</Badge>
                    <h3>{d.name}</h3>
                    <p>{d.description}</p>
                    <span className="card-link">
                      Explore department <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
            </div>
            {!data.departments.length && (
              <Empty title="Your community is getting ready">
                Departments will appear after the community database is
                configured and seeded.
              </Empty>
            )}
          </section>
        </div>
        <div className="right-column">
          <section className="panel">
            <div className="section-top">
              <h2>Community board</h2>
              <span className="subtle">LATEST</span>
            </div>
            {data.announcements.length ? (
              data.announcements.slice(0, 3).map((a) => (
                <article className="announcement" key={a.id}>
                  <Badge>{a.category}</Badge>
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                  <time>
                    {a.createdAt.toLocaleDateString("en-US", {
                      timeZone: community.timezone,
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </article>
              ))
            ) : (
              <div className="announcement">
                <Badge>WELCOME</Badge>
                <h3>A better roleplay starts with you.</h3>
                <p>
                  Read the regulations, meet your department, and make your next
                  session a good one.
                </p>
                <Link href="/rules">
                  Read the regulations <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
          </section>
          <section className="apply-card">
            <FileCheck2 size={24} />
            <span className="eyebrow">MAKE A DIFFERENCE</span>
            <h2>
              Step up.
              <br />
              Serve Florida.
            </h2>
            <p>
              Find a department that fits you, or help the community as part of
              our staff team.
            </p>
            <Link href="/applications" className="button">
              Explore applications
            </Link>
          </section>
          <section className="panel quick-links">
            <h2>Good to know</h2>
            <Link href="/rules">
              <BookOpen size={18} />
              <span>
                Community regulations<small>Keep every scene fair.</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/shop">
              <ShoppingBag size={18} />
              <span>
                Support the community<small>Explore the Florida shop.</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <a href={community.robloxGroupUrl} target="_blank" rel="noreferrer">
              <Users size={18} />
              <span>
                Our Roblox group<small>Represent your community.</small>
              </span>
              <ArrowUpRight size={16} />
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
