import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
    delete: (key: string) => jar.delete(key),
  }),
}));
import { db } from "../src/lib/db";
import {
  AppError,
  type Actor,
  requirePermission,
  requireDepartment,
  assertOrigin,
  assertTransition,
  sessionTransitions,
} from "../src/lib/policy";
import {
  signState,
  readState,
  createSession as login,
  currentUser,
  digest,
  sessionCookie,
} from "../src/lib/auth";
import {
  createApplication,
  submitApplication,
  reviewApplication,
  createModeration,
  createAppeal,
  reviewAppeal,
  createSession,
  updateSession,
  requestPriority,
  decidePriority,
  economyTransaction,
  reportAction,
  attendance,
} from "../src/lib/services";
import { departmentAction, assignRole } from "../src/lib/admin";
import { cadAction } from "../src/lib/cad";
import { POST } from "../src/app/api/actions/[...action]/route";
import { GET } from "../src/app/api/data/[resource]/route";
const run = randomBytes(6).toString("hex");
let owner: Actor, member: Actor, other: Actor;
beforeAll(async () => {
  const make = async (name: string, permissions: string[]) => {
    const user = await db.user.create({
      data: {
        username: `TEST_${name}_${run}`,
        discordId: String(
          BigInt("100000000000000000") +
            BigInt(`0x${randomBytes(6).toString("hex")}`),
        ),
        economy: { create: {} },
      },
    });
    if (permissions.length) {
      const role = await db.role.create({
        data: { name: `TEST_ROLE_${name}_${run}`, permissions },
      });
      await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
    return {
      id: user.id,
      discordId: user.discordId,
      createdAt: user.createdAt,
      permissions,
      roleIds: [],
      departments: [],
    } satisfies Actor;
  };
  owner = await make("OWNER", ["*"]);
  member = await make("MEMBER", []);
  other = await make("OTHER", []);
});
afterAll(async () => {
  jar.clear();
  await db.$disconnect();
});
describe("authentication and permission boundaries", () => {
  it("rejects missing roles and unauthenticated actors", () => {
    expect(() => requirePermission(null, "manageSessions")).toThrow(AppError);
    expect(() => requirePermission(member, "manageSessions")).toThrow(AppError);
    expect(() => requirePermission(owner, "manageSessions")).not.toThrow();
  });
  it("scopes department permissions to one department", () => {
    const actor = {
      ...member,
      departments: [{ departmentId: "alpha", permissions: ["manageMembers"] }],
    };
    expect(() =>
      requireDepartment(actor, "alpha", "manageMembers"),
    ).not.toThrow();
    expect(() => requireDepartment(actor, "beta", "manageMembers")).toThrow();
  });
  it("rejects missing and cross-site origins", () => {
    expect(() => assertOrigin(null, "http://localhost:3000")).toThrow();
    expect(() =>
      assertOrigin("https://attacker.test", "http://localhost:3000"),
    ).toThrow();
  });
  it("signs OAuth state and rejects tampered state", async () => {
    const token = await signState({ provider: "discord", nonce: "nonce" });
    expect((await readState(token)).nonce).toBe("nonce");
    await expect(readState(token.slice(0, -8) + "tampered")).rejects.toThrow();
  });
  it("stores hashed opaque sessions and rejects expired sessions", async () => {
    await login(member.id);
    const raw = jar.get(sessionCookie)!;
    expect(raw).toHaveLength(43);
    expect((await currentUser())?.id).toBe(member.id);
    const stored = await db.authSession.findUniqueOrThrow({
      where: { id: digest(raw) },
    });
    expect(stored.id).not.toBe(raw);
    await db.authSession.update({
      where: { id: stored.id },
      data: { expiresAt: new Date(0) },
    });
    expect(await currentUser()).toBeNull();
    jar.clear();
  });
  it("rejects direct staff API calls by an ordinary authenticated member", async () => {
    await login(member.id);
    for (const action of [
      "moderations/create",
      "sessions/create",
      "applications/review",
      "appeals/review",
      "economy/transaction",
      "admin/roles",
      "settings/save",
    ]) {
      const response = await POST(
        new Request(`http://localhost:3000/api/actions/${action}`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            action === "applications/review" || action === "appeals/review"
              ? { id: "not-owned", status: "ACCEPTED", note: "Test decision" }
              : action === "admin/roles"
                ? { data: { name: "Injected", permissions: ["*"] } }
                : {},
          ),
        }),
        { params: Promise.resolve({ action: action.split("/") }) },
      );
      expect([403, 404]).toContain(response.status);
    }
    for (const resource of [
      "logs",
      "users",
      "moderations",
      "applications",
      "appeals",
      "reports",
      "calls",
      "units",
    ]) {
      const response = await GET(
        new Request(`http://localhost:3000/api/data/${resource}?scope=staff`),
        { params: Promise.resolve({ resource }) },
      );
      expect(response.status).toBe(403);
    }
    jar.clear();
  });
  it("rejects an unauthenticated direct API mutation", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/actions/sessions/create", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
        body: "{}",
      }),
      { params: Promise.resolve({ action: ["sessions", "create"] }) },
    );
    expect(response.status).toBe(401);
  });
});
describe("applications, moderations and appeals", () => {
  it("validates form answers, prevents duplicate submissions, and persists decisions", async () => {
    const form = await createApplication(owner, {
      title: `Test ${run}`,
      description: "Test application",
      questions: [{ label: "Why join?", type: "LONG" }],
    });
    const question = await db.applicationQuestion.findFirstOrThrow({
      where: { applicationId: form.id },
    });
    await expect(
      submitApplication(member, { applicationId: form.id, answers: {} }),
    ).rejects.toThrow();
    const submission = await submitApplication(member, {
      applicationId: form.id,
      answers: { [question.id]: "I want to serve the community." },
    });
    await expect(
      submitApplication(member, {
        applicationId: form.id,
        answers: { [question.id]: "Again" },
      }),
    ).rejects.toThrow();
    await expect(
      reviewApplication(
        { ...member, permissions: ["manageApplications"] },
        { id: submission.id, status: "ACCEPTED", note: "Approve myself" },
      ),
    ).rejects.toThrow();
    const accepted = await reviewApplication(owner, {
      id: submission.id,
      status: "ACCEPTED",
      note: "Welcome aboard.",
    });
    expect(accepted.status).toBe("ACCEPTED");
    expect(
      await db.applicationReview.count({
        where: { submissionId: submission.id },
      }),
    ).toBe(1);
    await expect(
      reviewApplication(owner, {
        id: submission.id,
        status: "DENIED",
        note: "Second decision",
      }),
    ).rejects.toThrow();
  });
  it("enforces permanent-ban permission and temporary-ban expiry", async () => {
    const moderator = { ...owner, permissions: ["createModeration"] };
    await expect(
      createModeration(moderator, {
        userId: member.id,
        type: "PERMANENT_BAN",
        reason: "Test",
      }),
    ).rejects.toThrow();
    await expect(
      createModeration(owner, {
        userId: member.id,
        type: "TEMPORARY_BAN",
        reason: "Test",
      }),
    ).rejects.toThrow();
  });
  it("protects appeal ownership, preserves history, and revokes accepted cases", async () => {
    const record = await createModeration(owner, {
      userId: member.id,
      type: "WARNING",
      reason: "Test rule violation",
      internalNotes: "PRIVATE INTERNAL NOTE",
    });
    const input = {
      moderationId: record.id,
      reason: "Please review",
      account: "This is what occurred",
      improvements: "I will follow the rules",
    };
    await expect(createAppeal(other, input)).rejects.toThrow();
    const appeal = await createAppeal(member, input);
    await expect(createAppeal(member, input)).rejects.toThrow();
    await reviewAppeal(owner, {
      id: appeal.id,
      status: "ACCEPTED",
      note: "Record corrected.",
    });
    expect(
      (await db.moderation.findUniqueOrThrow({ where: { id: record.id } }))
        .status,
    ).toBe("REVOKED");
    await expect(
      db.appealAction.deleteMany({ where: { appealId: appeal.id } }),
    ).rejects.toThrow();
    await login(member.id);
    const response = await GET(
      new Request("http://localhost:3000/api/data/moderations"),
      { params: Promise.resolve({ resource: "moderations" }) },
    );
    expect(await response.text()).not.toContain("PRIVATE INTERNAL NOTE");
    jar.clear();
  });
});
describe("economy integrity", () => {
  it("credits once for an idempotency key and rejects conflicting reuse", async () => {
    const data = {
      userId: member.id,
      amount: 500,
      type: "STAFF_REWARD",
      reason: "Test reward",
      idempotencyKey: `reward-${run}-unique-key`,
    };
    const first = await economyTransaction(owner, data);
    const again = await economyTransaction(owner, data);
    expect(again.id).toBe(first.id);
    expect(
      (
        await db.economyAccount.findUniqueOrThrow({
          where: { userId: member.id },
        })
      ).balance,
    ).toBe(500n);
    await expect(
      economyTransaction(owner, { ...data, amount: 501 }),
    ).rejects.toThrow();
  });
  it("prevents overdrafts and disallows member-issued currency", async () => {
    const data = {
      userId: member.id,
      amount: -600,
      type: "PURCHASE",
      reason: "Test overdraft",
      idempotencyKey: `debit-${run}-unique-key`,
    };
    await expect(economyTransaction(owner, data)).rejects.toThrow();
    await expect(
      economyTransaction(member, { ...data, amount: 10000 }),
    ).rejects.toThrow();
    expect(
      (
        await db.economyAccount.findUniqueOrThrow({
          where: { userId: member.id },
        })
      ).balance,
    ).toBe(500n);
  });
  it("blocks direct negative balances and immutable ledger edits", async () => {
    await expect(
      db.economyAccount.update({
        where: { userId: member.id },
        data: { balance: -1 },
      }),
    ).rejects.toThrow();
    const record = await db.economyTransaction.findFirstOrThrow({
      where: { account: { userId: member.id } },
    });
    await expect(
      db.economyTransaction.update({
        where: { id: record.id },
        data: { amount: 99999 },
      }),
    ).rejects.toThrow();
  });
});
describe("sessions, priority and reports", () => {
  it("enforces session transitions", () => {
    expect(() =>
      assertTransition("ENDED", "ACTIVE", sessionTransitions),
    ).toThrow();
  });
  it("tracks attendance, prevents conflicting priorities, and honors peacetime", async () => {
    const session = await createSession(owner, {
      title: `Test session ${run}`,
      startsAt: new Date().toISOString(),
    });
    await updateSession(owner, { id: session.id, status: "ACTIVE" });
    const entry = await attendance(member, {
      sessionId: session.id,
      action: "JOIN",
    });
    expect(
      (await attendance(member, { sessionId: session.id, action: "JOIN" })).id,
    ).toBe(entry.id);
    const input = {
      sessionId: session.id,
      type: "Bank robbery",
      participants: ["TEST_PLAYER"],
      description: "Fictional test scene",
      duration: 15,
    };
    const first = await requestPriority(member, input),
      second = await requestPriority(other, input);
    const decisions = await Promise.allSettled([
      decidePriority(owner, { id: first.id, status: "ACTIVE" }),
      decidePriority(owner, { id: second.id, status: "ACTIVE" }),
    ]);
    expect(decisions.filter((d) => d.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.priorityRequest.count({
        where: { sessionId: session.id, status: "ACTIVE" },
      }),
    ).toBe(1);
    await updateSession(owner, { id: session.id, peacetime: true });
    await expect(requestPriority(member, input)).rejects.toThrow();
    await updateSession(owner, { id: session.id, status: "ENDED" });
    expect(
      (
        await db.sessionAttendance.findUniqueOrThrow({
          where: { id: entry.id },
        })
      ).leftAt,
    ).not.toBeNull();
  });
  it("allows only one reviewer to claim a report", async () => {
    const report = await reportAction(member, {
      action: "CREATE",
      reportedUser: "TEST_SUBJECT",
      category: "PLAYER",
      description: "Test report",
    });
    const staff2 = { ...other, permissions: ["manageReports"] };
    const claims = await Promise.allSettled([
      reportAction(owner, {
        action: "UPDATE",
        id: report.id,
        status: "CLAIMED",
      }),
      reportAction(staff2, {
        action: "UPDATE",
        id: report.id,
        status: "CLAIMED",
      }),
    ]);
    expect(claims.filter((c) => c.status === "fulfilled")).toHaveLength(1);
  });
});
describe("department and CAD boundaries", () => {
  it("validates rank department and duplicate callsigns", async () => {
    const a = await db.department.create({
      data: {
        name: `Dept A ${run}`,
        abbreviation: `A${run}`,
        description: "Test",
        callsignFormat: "1A-###",
      },
    });
    const b = await db.department.create({
      data: {
        name: `Dept B ${run}`,
        abbreviation: `B${run}`,
        description: "Test",
      },
    });
    const rank = await db.departmentRank.create({
      data: {
        departmentId: b.id,
        name: "Officer",
        position: 1,
        permissions: [],
      },
    });
    await expect(
      departmentAction(owner, {
        action: "MEMBER",
        departmentId: a.id,
        userId: member.id,
        rankId: rank.id,
      }),
    ).rejects.toThrow();
    await expect(
      departmentAction(owner, {
        action: "MEMBER",
        departmentId: a.id,
        userId: member.id,
        callsign: "1A-001",
      }),
    ).rejects.toThrow();
    await departmentAction(owner, {
      action: "MEMBER",
      departmentId: a.id,
      userId: member.id,
      callsign: "1A-123",
    });
    await expect(
      departmentAction(owner, {
        action: "MEMBER",
        departmentId: a.id,
        userId: other.id,
        callsign: "1A-123",
      }),
    ).rejects.toThrow();
  });
  it("prevents editing another member's character records and issuing citations", async () => {
    const character = await cadAction(member, "character", {
      firstName: "Test",
      lastName: "Character",
      birthDate: "2000-01-01",
      gender: "Unspecified",
      address: "Fictional address",
      phone: "555-0100",
      occupation: "Test",
    });
    await expect(
      cadAction(other, "vehicle", {
        characterId: character.id,
        plate: "TEST123",
        model: "Test sedan",
        color: "Blue",
      }),
    ).rejects.toThrow();
    await expect(
      cadAction(member, "citation", {
        characterId: character.id,
        type: "CITATION",
        reason: "Test",
      }),
    ).rejects.toThrow();
  });
  it("prevents permission escalation through role assignment", async () => {
    const role = await db.role.create({
      data: { name: `POWER_${run}`, permissions: ["permanentBan"] },
    });
    await expect(
      assignRole(
        { ...member, permissions: ["manageStaff", "managePermissions"] },
        { userId: member.id, roleId: role.id },
      ),
    ).rejects.toThrow();
  });
  it("prevents audit history deletion", async () => {
    const log = await db.auditLog.findFirstOrThrow({
      where: { actorId: owner.id },
    });
    await expect(
      db.auditLog.delete({ where: { id: log.id } }),
    ).rejects.toThrow();
  });
});
