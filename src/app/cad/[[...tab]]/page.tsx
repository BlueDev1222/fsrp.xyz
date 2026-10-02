import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, actorFromUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/policy";
import { PageHeading, Notice } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ActionForm, type Field } from "@/components/action-form";
export default async function CAD({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const actor = await actorFromUser(user);
  const tab = (await params).tab?.[0] ?? "civilian";
  if (!["civilian", "law", "dispatch", "fire"].includes(tab)) notFound();
  if (
    tab !== "civilian" &&
    !can(
      actor,
      tab === "law" ? "cadLaw" : tab === "fire" ? "cadFire" : "cadDispatch",
    )
  )
    redirect("/403");
  const tabs = [
    ["civilian", "Civilian"],
    ...(can(actor, "cadLaw") ? [["law", "Law enforcement"]] : []),
    ...(can(actor, "cadDispatch") ? [["dispatch", "Dispatch"]] : []),
    ...(can(actor, "cadFire") ? [["fire", "Fire / EMS"]] : []),
  ];
  const characterOptions = (
    await db.cADCharacter.findMany({
      where: tab === "civilian" ? { userId: actor.id } : {},
      take: 100,
    })
  ).map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }));
  const characterField: Field = {
    name: "characterId",
    label: "Character",
    type: "select",
    required: true,
    options: characterOptions,
  };
  const forms: {
    title: string;
    action: string;
    fields: Field[];
    hidden?: Record<string, unknown>;
  }[] = [];
  if (tab === "civilian")
    forms.push(
      {
        title: "Create a character",
        action: "character",
        fields: [
          { name: "firstName", label: "First name", required: true },
          { name: "lastName", label: "Last name", required: true },
          {
            name: "birthDate",
            label: "Date of birth",
            type: "date",
            required: true,
          },
          { name: "gender", label: "Gender", required: true },
          { name: "address", label: "Roleplay address", required: true },
          { name: "phone", label: "Roleplay phone number", required: true },
          { name: "occupation", label: "Occupation", required: true },
          { name: "notes", label: "Character notes", type: "textarea" },
        ],
      },
      {
        title: "Register a vehicle",
        action: "vehicle",
        fields: [
          characterField,
          { name: "plate", label: "License plate", required: true },
          { name: "model", label: "Vehicle model", required: true },
          { name: "color", label: "Color", required: true },
        ],
      },
      {
        title: "Register a roleplay license",
        action: "license",
        fields: [
          characterField,
          { name: "type", label: "License type", required: true },
          {
            name: "expiresAt",
            label: "Expiration",
            type: "datetime-local",
            required: true,
          },
        ],
      },
    );
  if (tab === "law")
    forms.push(
      {
        title: "Issue a citation or warning",
        action: "citation",
        fields: [
          characterField,
          {
            name: "type",
            label: "Type",
            type: "select",
            options: ["WARNING", "CITATION"].map((v) => ({
              value: v,
              label: v,
            })),
            required: true,
          },
          { name: "reason", label: "Reason", type: "textarea", required: true },
          { name: "fine", label: "Fine", type: "number", value: 0 },
        ],
      },
      {
        title: "Record an arrest",
        action: "arrest",
        fields: [
          characterField,
          {
            name: "charges",
            label: "Charges",
            type: "textarea",
            required: true,
          },
          {
            name: "narrative",
            label: "Narrative",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Create a warrant",
        action: "warrant",
        fields: [
          characterField,
          { name: "reason", label: "Reason", type: "textarea", required: true },
        ],
      },
      {
        title: "Publish a BOLO",
        action: "bolo",
        fields: [
          { name: "title", label: "Subject", required: true },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
          },
        ],
      },
    );
  if (tab === "dispatch")
    forms.push(
      {
        title: "Create a call",
        action: "call",
        fields: [
          { name: "title", label: "Call title", required: true },
          { name: "location", label: "Location", required: true },
          {
            name: "description",
            label: "Call details",
            type: "textarea",
            required: true,
          },
          {
            name: "category",
            label: "Service",
            type: "select",
            required: true,
            options: ["LAW", "FIRE", "MEDICAL"].map((v) => ({
              value: v,
              label: v,
            })),
          },
          {
            name: "priority",
            label: "Priority (1–5)",
            type: "number",
            value: 3,
          },
        ],
      },
      {
        title: "Assign / update a unit",
        action: "dispatch",
        fields: [
          {
            name: "unitId",
            label: "Unit",
            type: "select",
            required: true,
            options: (await db.cADUnit.findMany()).map((u) => ({
              value: u.id,
              label: `${u.callsign} · ${u.service}`,
            })),
          },
          {
            name: "callId",
            label: "Call",
            type: "select",
            required: true,
            options: (
              await db.cADCall.findMany({ where: { status: "OPEN" } })
            ).map((c) => ({ value: c.id, label: c.title })),
          },
          {
            name: "status",
            label: "Unit status",
            required: true,
            value: "En Route",
          },
        ],
      },
      {
        title: "Close a call",
        action: "close-call",
        fields: [
          {
            name: "id",
            label: "Call",
            type: "select",
            required: true,
            options: (
              await db.cADCall.findMany({ where: { status: "OPEN" } })
            ).map((c) => ({ value: c.id, label: c.title })),
          },
        ],
      },
    );
  if (tab !== "civilian")
    forms.push({
      title: "Your unit",
      action: "unit",
      hidden: {
        service: tab === "law" ? "LAW" : tab === "fire" ? "FIRE" : "DISPATCH",
      },
      fields: [
        { name: "callsign", label: "Callsign", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            "10-8",
            "10-6",
            "10-7",
            "Traffic Stop",
            "On Scene",
            "En Route",
          ].map((v) => ({ value: v, label: v })),
        },
      ],
    });
  if (tab === "fire" || tab === "law")
    forms.push({
      title: tab === "fire" ? "Incident / patient report" : "Incident report",
      action: "incident",
      fields: [
        {
          name: "callId",
          label: "Related call",
          type: "select",
          options: (
            await db.cADCall.findMany({ where: { status: "OPEN" } })
          ).map((c) => ({ value: c.id, label: c.title })),
        },
        {
          name: "type",
          label: "Report type",
          type: "select",
          required: true,
          options: (tab === "law" ? ["LAW"] : ["FIRE", "MEDICAL"]).map((v) => ({
            value: v,
            label: v,
          })),
        },
        {
          name: "narrative",
          label: "Narrative",
          type: "textarea",
          required: true,
        },
        ...(tab === "fire"
          ? [
              {
                name: "patientReport",
                label: "Fictional patient report",
                type: "textarea" as const,
              },
              { name: "transportStatus", label: "Transport status" },
            ]
          : []),
      ],
    });
  return (
    <>
      <PageHeading
        eyebrow="FLORIDA PUBLIC SAFETY"
        title="CAD / MDT"
        description="Coordinate the scene. Keep the story moving."
      />
      <Notice>
        Fictional roleplay records only. Do not enter real addresses, phone
        numbers, medical information, or other personal data.
      </Notice>
      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/cad/${key}`}
            className={tab === key ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
      {["civilian", "law"].includes(tab) && (
        <DataTable
          resource="characters"
          columns={[
            { key: "firstName", label: "First name" },
            { key: "lastName", label: "Last name" },
            { key: "address", label: "Address" },
            { key: "vehicles", label: "Vehicles" },
          ]}
        />
      )}{" "}
      {tab !== "civilian" && (
        <div className="stack">
          <DataTable
            resource="calls"
            columns={[
              { key: "title", label: "Call" },
              { key: "location", label: "Location" },
              { key: "priority", label: "Priority" },
              { key: "units", label: "Assigned units" },
            ]}
          />
          <DataTable
            resource="units"
            columns={[
              { key: "callsign", label: "Unit" },
              { key: "service", label: "Service" },
              { key: "status", label: "Status" },
              { key: "call.title", label: "Call" },
            ]}
          />
        </div>
      )}
      <div className="content-grid two" style={{ marginTop: 25 }}>
        {forms.map((form) => (
          <section className="panel" key={form.action}>
            <h2 style={{ marginBottom: 20 }}>{form.title}</h2>
            <ActionForm
              action={`cad/${form.action}`}
              fields={form.fields}
              hidden={form.hidden}
            />
          </section>
        ))}
      </div>
    </>
  );
}
