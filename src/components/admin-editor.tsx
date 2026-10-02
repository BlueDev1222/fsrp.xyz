"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "list" | "number" | "checkbox";
};
type Row = Record<string, unknown>;
export function AdminEditor({
  resource,
  records,
  fields,
}: {
  resource: string;
  records: Row[];
  fields: Field[];
}) {
  const [selected, setSelected] = useState("");
  const [values, setValues] = useState<Row>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="content-grid two">
      <section className="panel">
        <h2 style={{ marginBottom: 18 }}>Existing records</h2>
        <div className="stack">
          <button
            className="button"
            onClick={() => {
              setSelected("");
              setValues({});
              setSuccess("");
            }}
          >
            Create new record
          </button>
          {records.map((r) => (
            <button
              className="button secondary"
              key={String(r.id)}
              onClick={() => {
                setSelected(String(r.id));
                setValues(r);
                setSuccess("");
              }}
            >
              {String(r.name ?? r.title ?? r.id)}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2 style={{ marginBottom: 20 }}>
          {selected ? "Edit record" : "Create record"}
        </h2>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setSuccess("");
            const form = new FormData(e.currentTarget);
            const data: Row = {};
            for (const f of fields) {
              const v = form.get(f.name);
              if (f.type === "checkbox") data[f.name] = v === "on";
              else if (f.type === "number") data[f.name] = Number(v || 0);
              else if (f.type === "list")
                data[f.name] = String(v ?? "")
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean);
              else if (v) data[f.name] = v;
            }
            try {
              const response = await fetch(`/api/actions/admin/${resource}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected || undefined, data }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error?.message);
              setSuccess("Record saved.");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to save.");
            } finally {
              setBusy(false);
            }
          }}
          key={`${selected}-${JSON.stringify(values)}`}
        >
          {fields.map((f) => (
            <label
              key={f.name}
              className={f.type === "checkbox" ? "check-label" : ""}
            >
              {f.label}
              {f.type === "textarea" || f.type === "list" ? (
                <textarea
                  name={f.name}
                  defaultValue={
                    Array.isArray(values[f.name])
                      ? (values[f.name] as string[]).join("\n")
                      : String(values[f.name] ?? "")
                  }
                />
              ) : (
                <input
                  name={f.name}
                  type={
                    f.type === "checkbox"
                      ? "checkbox"
                      : f.type === "number"
                        ? "number"
                        : "text"
                  }
                  defaultChecked={
                    f.type === "checkbox"
                      ? Boolean(values[f.name] ?? true)
                      : undefined
                  }
                  defaultValue={
                    f.type === "checkbox"
                      ? undefined
                      : String(values[f.name] ?? "")
                  }
                />
              )}
            </label>
          ))}
          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="success-message">
              {success}
            </div>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
        </form>
      </section>
    </div>
  );
}
export function ApplicationBuilder({
  departments,
}: {
  departments: { id: string; name: string }[];
}) {
  const [questions, setQuestions] = useState([
    {
      label: "Why would you like to join?",
      type: "LONG",
      options: "",
      required: true,
    },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(e.currentTarget);
        try {
          const response = await fetch("/api/actions/applications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.get("title"),
              description: form.get("description"),
              departmentId: form.get("departmentId") || undefined,
              kind: form.get("kind"),
              status: form.get("status"),
              minimumAccountDays: Number(form.get("minimumAccountDays")),
              cooldownHours: Number(form.get("cooldownHours")),
              maximumSubmissions: Number(form.get("maximumSubmissions")),
              questions: questions.map((q, i) => ({
                ...q,
                options: q.options.split("\n").filter(Boolean),
                position: i,
              })),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message);
          setSuccess("Application form created.");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Title
        <input name="title" required />
      </label>
      <label>
        Description
        <textarea name="description" required />
      </label>
      <label>
        Kind
        <select name="kind">
          <option>DEPARTMENT</option>
          <option>STAFF</option>
          <option>COMMUNITY</option>
        </select>
      </label>
      <label>
        Department
        <select name="departmentId">
          <option value="">No department</option>
          {departments.map((d) => (
            <option value={d.id} key={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select name="status">
          <option>OPEN</option>
          <option>DRAFT</option>
          <option>CLOSED</option>
        </select>
      </label>
      <label>
        Minimum Discord account age (days)
        <input
          type="number"
          name="minimumAccountDays"
          defaultValue="0"
          min="0"
        />
      </label>
      <label>
        Cooldown (hours)
        <input type="number" name="cooldownHours" defaultValue="24" min="0" />
      </label>
      <label>
        Maximum submissions per member
        <input
          type="number"
          name="maximumSubmissions"
          defaultValue="3"
          min="1"
        />
      </label>
      <h2>Questions</h2>
      {questions.map((q, index) => (
        <fieldset className="form" key={index}>
          <legend>Question {index + 1}</legend>
          <label>
            Question label
            <input
              value={q.label}
              required
              onChange={(e) =>
                setQuestions(
                  questions.map((x, i) =>
                    i === index ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            Answer type
            <select
              value={q.type}
              onChange={(e) =>
                setQuestions(
                  questions.map((x, i) =>
                    i === index ? { ...x, type: e.target.value } : x,
                  ),
                )
              }
            >
              {[
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
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {["CHOICE", "CHECKBOX", "DROPDOWN"].includes(q.type) && (
            <label>
              Choices (one per line)
              <textarea
                value={q.options}
                onChange={(e) =>
                  setQuestions(
                    questions.map((x, i) =>
                      i === index ? { ...x, options: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) =>
                setQuestions(
                  questions.map((x, i) =>
                    i === index ? { ...x, required: e.target.checked } : x,
                  ),
                )
              }
            />
            Required
          </label>
          <div className="actions-inline">
            <button
              type="button"
              className="button secondary small"
              disabled={index === 0}
              onClick={() => {
                const next = [...questions];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                setQuestions(next);
              }}
            >
              Move up
            </button>
            <button
              type="button"
              className="button danger small"
              disabled={questions.length === 1}
              onClick={() =>
                setQuestions(questions.filter((_, i) => i !== index))
              }
            >
              Remove question
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          setQuestions([
            ...questions,
            { label: "", type: "SHORT", options: "", required: true },
          ])
        }
      >
        Add question
      </button>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="success-message" role="status">
          {success}
        </div>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Create application"}
      </button>
    </form>
  );
}
