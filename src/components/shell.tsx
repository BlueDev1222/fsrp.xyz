import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  FileCheck2,
  Gauge,
  Gavel,
  LifeBuoy,
  Radio,
  ScrollText,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
  Settings,
  Bell,
  Compass,
} from "lucide-react";
import type { ReactNode } from "react";
import { currentUser, actorFromUser } from "@/lib/auth";
import { can } from "@/lib/policy";
import { defaultCommunity } from "@/lib/public";
import { db } from "@/lib/db";
const links = [
  ["Overview", "/", Gauge],
  ["Sessions", "/sessions", CalendarDays],
  ["Departments", "/departments", Building2],
  ["Applications", "/applications", FileCheck2],
  ["Regulations", "/rules", ScrollText],
  ["Community shop", "/shop", ShoppingBag],
  ["Staff team", "/staff", Users],
  ["About Florida", "/about", Compass],
] as const;
export async function Shell({ children }: { children: ReactNode }) {
  const [user, configured] = await Promise.all([
    currentUser(),
    process.env.DATABASE_URL
      ? db.community.findUnique({ where: { id: "community" } })
      : null,
  ]);
  const community = configured ?? defaultCommunity;
  const actor = user ? await actorFromUser(user) : null;
  return (
    <div
      className="app-shell"
      style={{ "--accent": community.accent } as React.CSSProperties}
    >
      <aside className="sidebar">
        <Link className="brand" href="/">
          <img src={community.logo} alt="" width="43" height="43" />
          <span>
            {community.abbreviation}
            <small>FLORIDA STATE ROLEPLAY</small>
          </span>
        </Link>
        <div className="nav-label">COMMUNITY</div>
        <nav aria-label="Community">
          {links.map(([label, href, Icon]) => (
            <Link href={href} key={href}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav aria-label="Workspace">
          <Link href="/dashboard">
            <Gauge size={18} />
            My dashboard
          </Link>
          <Link href="/cad">
            <Radio size={18} />
            CAD / MDT
          </Link>
          <Link href="/dashboard/economy">
            <Wallet size={18} />
            Economy
          </Link>
          <Link href="/appeals">
            <Gavel size={18} />
            Appeals
          </Link>
          <Link href="/reports">
            <LifeBuoy size={18} />
            Support & reports
          </Link>
          {actor && (
            <Link href="/dashboard/notifications">
              <Bell size={18} />
              Notifications
            </Link>
          )}
          {can(actor, "viewStaff") && (
            <Link href="/staff-panel">
              <Shield size={18} />
              Staff workspace
            </Link>
          )}
          {can(actor, "manageCommunitySettings") && (
            <Link href="/admin">
              <Settings size={18} />
              Administration
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="discord-card">
            <strong>A community beyond the game.</strong>
            <p>Find your people in our Discord.</p>
            <a href={community.discordInvite} target="_blank" rel="noreferrer">
              Join the community <ArrowUpRight size={16} />
            </a>
          </div>
          <span className="sidebar-foot">
            {community.abbreviation} · Roleplay like no other.
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="topbar-title">
            Community hub <span>/</span> <b>{community.name}</b>
          </span>
          <div className="topbar-actions">
            <Link href="/rules" className="quiet-link">
              Community handbook
            </Link>
            {user ? (
              <Link className="profile-chip" href="/dashboard">
                {user.avatar ? (
                  <img src={user.avatar} width="28" height="28" alt="" />
                ) : (
                  <span className="avatar">{user.username[0]}</span>
                )}
                {user.username}
              </Link>
            ) : (
              <Link href="/login" className="button small">
                Sign in with Discord
              </Link>
            )}
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>
            © {new Date().getFullYear()} {community.name}
          </span>
          <span>
            Independent community · Not affiliated with Roblox or PRC.
          </span>
        </footer>
      </div>
    </div>
  );
}
