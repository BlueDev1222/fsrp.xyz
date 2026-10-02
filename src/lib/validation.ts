import { z } from "zod";
import { safeUrl } from "./policy";
export const id = z.string().min(1).max(100);
export const short = z.string().trim().min(1).max(200);
export const text = z.string().trim().min(1).max(10000);
export const url = z.string().max(2000).refine(safeUrl, "Use an HTTPS URL");
export const evidence = z.array(url).max(10).default([]);
export const moderationInput = z
  .object({
    userId: id,
    type: z.enum([
      "NOTE",
      "WARNING",
      "KICK",
      "TEMPORARY_BAN",
      "PERMANENT_BAN",
      "BLACKLIST",
    ]),
    reason: text,
    evidence,
    expiresAt: z.iso.datetime().optional(),
    internalNotes: z.string().max(10000).default(""),
    sessionId: id.optional(),
  })
  .refine(
    (v) =>
      v.type !== "TEMPORARY_BAN" ||
      (v.expiresAt && new Date(v.expiresAt) > new Date()),
    "Temporary bans need a future expiration",
  );
export const sessionInput = z.object({
  title: short,
  startsAt: z.iso.datetime(),
  serverUrl: url.optional(),
  serverCode: z.string().max(100).optional(),
  maxPlayers: z.number().int().min(1).max(1000).default(40),
  notes: z.string().max(10000).default(""),
});
export const priorityInput = z.object({
  sessionId: id,
  type: short,
  participants: z.array(short).min(1).max(20),
  description: text,
  duration: z.number().int().min(1).max(60),
});
export const applicationQuestion = z.object({
  label: short,
  type: z.enum([
    "SHORT",
    "LONG",
    "CHOICE",
    "CHECKBOX",
    "DROPDOWN",
    "YESNO",
    "NUMBER",
    "DATE",
    "ROBLOX",
    "DISCORD",
  ]),
  options: z.array(short).max(30).default([]),
  required: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
});
export const applicationInput = z.object({
  title: short,
  description: text,
  departmentId: id.optional(),
  kind: z.enum(["STAFF", "DEPARTMENT", "COMMUNITY"]).default("DEPARTMENT"),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).default("OPEN"),
  opensAt: z.iso.datetime().optional(),
  closesAt: z.iso.datetime().optional(),
  requiredRoles: z.array(id).default([]),
  minimumAccountDays: z.number().int().min(0).max(3650).default(0),
  cooldownHours: z.number().int().min(0).max(8760).default(24),
  maximumSubmissions: z.number().int().min(1).max(100).default(3),
  questions: z.array(applicationQuestion).min(1).max(50),
});
export function validateAnswer(
  question: {
    label: string;
    type: string;
    required: boolean;
    options: string[];
  },
  answer: unknown,
) {
  if (
    answer === undefined ||
    answer === "" ||
    (Array.isArray(answer) && !answer.length)
  ) {
    if (question.required) throw new Error(`${question.label} is required.`);
    return "";
  }
  if (question.type === "NUMBER")
    return z.coerce.number().finite().parse(answer);
  if (question.type === "YESNO") return z.enum(["Yes", "No"]).parse(answer);
  if (question.type === "DATE") return z.iso.date().parse(answer);
  if (question.type === "CHECKBOX")
    return z
      .array(z.string().refine((v) => question.options.includes(v)))
      .max(question.options.length)
      .parse(answer);
  if (["CHOICE", "DROPDOWN"].includes(question.type))
    return z
      .string()
      .refine((v) => question.options.includes(v))
      .parse(answer);
  return z
    .string()
    .trim()
    .max(question.type === "LONG" ? 10000 : 200)
    .parse(answer);
}
