import { z } from "zod";
import { db } from "./db";
import { audit } from "./services";
import { type Actor, ownOrPermission, requirePermission } from "./policy";
import { id, short, text } from "./validation";
const schemas = {
  character: z.object({
    firstName: short,
    lastName: short,
    birthDate: z.iso.date(),
    gender: short,
    address: short,
    phone: short,
    occupation: short,
    notes: z.string().max(10000).default(""),
  }),
  vehicle: z.object({
    characterId: id,
    plate: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9 -]{2,10}$/),
    model: short,
    color: short,
  }),
  license: z.object({
    characterId: id,
    type: short,
    expiresAt: z.iso.datetime(),
  }),
  citation: z.object({
    characterId: id,
    type: z.enum(["WARNING", "CITATION"]),
    reason: text,
    fine: z.number().int().min(0).max(1000000).default(0),
  }),
  arrest: z.object({ characterId: id, charges: text, narrative: text }),
  warrant: z.object({ characterId: id, reason: text }),
  bolo: z.object({ title: short, description: text }),
  call: z.object({
    title: short,
    location: short,
    description: text,
    category: z.enum(["LAW", "FIRE", "MEDICAL"]),
    priority: z.number().int().min(1).max(5).default(3),
  }),
  unit: z.object({
    callsign: short,
    service: z.enum(["LAW", "FIRE", "DISPATCH"]),
    status: short.default("10-8"),
    callId: id.optional(),
  }),
  incident: z.object({
    callId: id.optional(),
    type: z.enum(["LAW", "FIRE", "MEDICAL"]),
    narrative: text,
    patientReport: z.string().max(10000).optional(),
    transportStatus: short.optional(),
  }),
};
export async function cadAction(
  actor: Actor,
  resource: string,
  input: unknown,
) {
  return db.$transaction(async (tx) => {
    let result: { id: string };
    switch (resource) {
      case "character": {
        const data = schemas.character.parse(input);
        result = await tx.cADCharacter.create({
          data: {
            ...data,
            birthDate: new Date(data.birthDate),
            userId: actor.id,
          },
        });
        break;
      }
      case "vehicle": {
        const data = schemas.vehicle.parse(input);
        const character = await tx.cADCharacter.findUniqueOrThrow({
          where: { id: data.characterId },
        });
        ownOrPermission(actor, character.userId, "manageCAD");
        result = await tx.cADVehicle.create({ data });
        break;
      }
      case "license": {
        const data = schemas.license.parse(input);
        const character = await tx.cADCharacter.findUniqueOrThrow({
          where: { id: data.characterId },
        });
        ownOrPermission(actor, character.userId, "manageCAD");
        result = await tx.cADLicense.create({ data });
        break;
      }
      case "citation":
        requirePermission(actor, "cadLaw");
        result = await tx.cADCitation.create({
          data: { ...schemas.citation.parse(input), officerId: actor.id },
        });
        break;
      case "arrest":
        requirePermission(actor, "cadLaw");
        result = await tx.cADArrest.create({
          data: { ...schemas.arrest.parse(input), officerId: actor.id },
        });
        break;
      case "warrant":
        requirePermission(actor, "cadLaw");
        result = await tx.cADWarrant.create({
          data: { ...schemas.warrant.parse(input), officerId: actor.id },
        });
        break;
      case "bolo":
        requirePermission(actor, "cadLaw");
        result = await tx.cADBolo.create({
          data: { ...schemas.bolo.parse(input), officerId: actor.id },
        });
        break;
      case "call":
        requirePermission(actor, "cadDispatch");
        result = await tx.cADCall.create({ data: schemas.call.parse(input) });
        break;
      case "unit": {
        const data = schemas.unit.parse(input);
        requirePermission(
          actor,
          data.service === "LAW"
            ? "cadLaw"
            : data.service === "FIRE"
              ? "cadFire"
              : "cadDispatch",
        );
        result = await tx.cADUnit.upsert({
          where: {
            userId_service: { userId: actor.id, service: data.service },
          },
          create: { ...data, userId: actor.id },
          update: data,
        });
        break;
      }
      case "dispatch": {
        requirePermission(actor, "cadDispatch");
        const data = z
          .object({ unitId: id, callId: id.nullable(), status: short })
          .parse(input);
        result = await tx.cADUnit.update({
          where: { id: data.unitId },
          data: { callId: data.callId, status: data.status },
        });
        break;
      }
      case "close-call": {
        requirePermission(actor, "cadDispatch");
        const data = z.object({ id }).parse(input);
        result = await tx.cADCall.update({
          where: { id: data.id },
          data: { status: "CLOSED" },
        });
        await tx.cADUnit.updateMany({
          where: { callId: data.id },
          data: { callId: null, status: "10-8" },
        });
        break;
      }
      default: {
        const data = schemas.incident.parse(input);
        requirePermission(actor, data.type === "LAW" ? "cadLaw" : "cadFire");
        result = await tx.cADIncident.create({
          data: { ...data, authorId: actor.id },
        });
      }
    }
    await audit(
      tx,
      actor,
      `CAD_${resource.toUpperCase()}`,
      result.id,
      undefined,
      result,
    );
    return result;
  });
}
