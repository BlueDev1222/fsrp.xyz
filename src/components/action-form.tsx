"use client";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "datetime-local"
    | "date"
    | "select"
    | "checkbox"
    | "list";
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: string | number | boolean;
  help?: string;
};
export function ActionForm({
  action,
  fields,
  hidden = {},
  label = "Save",
  reload = true,
}: {
  action: string;
  fields: Field[];
  hidden?: Record<string, unknown>;
  label?: string;
  reload?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pendingTransaction = useRef<{ payload: string; key: string } | null>(
    null,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = { ...hidden };
    for (const field of fields) {
      const raw = form.get(field.name);
      if (!raw && !field.required && field.type !== "checkbox") continue;
      data[field.name] =
        field.type === "number"
          ? Number(raw)
          : field.type === "checkbox"
            ? raw === "on"
            : field.type === "list"
              ? String(raw ?? "")
                  .split(/\n|,/)
                  .map((v) => v.trim())
                  .filter(Boolean)
              : field.type === "datetime-local"
                ? new Date(String(raw)).toISOString()
                : raw;
    }
    if (action === "economy/transaction") {
      const payload = JSON.stringify(data);
      if (pendingTransaction.current?.payload !== payload)
        pendingTransaction.current = { payload, key: crypto.randomUUID() };
      data.idempotencyKey = pendingTransaction.current.key;
    }
    try {
      const response = await fetch(`/api/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Unable to save.");
      setMessage("Saved successfully.");
      if (reload) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      {fields.map((field) => (
        <label
          key={field.name}
          className={field.type === "checkbox" ? "check-label" : ""}
        >
          {field.label}
          {field.type === "textarea" || field.type === "list" ? (
            <textarea
              name={field.name}
              required={field.required}
              defaultValue={String(field.value ?? "")}
              placeholder={
                field.type === "list" ? "One item per line" : undefined
              }
            />
          ) : field.type === "select" ? (
            <select
              name={field.name}
              required={field.required}
              defaultValue={String(field.value ?? "")}
            >
              <option value="">Select…</option>
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={
                field.type === "checkbox"
                  ? undefined
                  : String(field.value ?? "")
              }
              defaultChecked={
                field.type === "checkbox" ? Boolean(field.value) : undefined
              }
            />
          )}{" "}
          {field.help && <small>{field.help}</small>}
        </label>
      ))}
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="success-message">
          {message}
        </div>
      )}
      <div className="form-actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : label}
        </button>
      </div>
    </form>
  );
}
export function ActionButton({
  action,
  data,
  children,
  confirm,
}: {
  action: string;
  data: Record<string, unknown>;
  children: React.ReactNode;
  confirm?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  return (
    <span>
      <button
        className="button small secondary"
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError("");
          setDone(false);
          try {
            const response = await fetch(`/api/actions/${action}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error?.message);
            setDone(true);
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to complete action.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : done ? "Saved" : children}
      </button>
      {error && (
        <span role="alert" className="error-message">
          {error}
        </span>
      )}
    </span>
  );
}
