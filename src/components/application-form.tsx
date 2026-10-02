"use client";
import { useState, type FormEvent } from "react";
type Question = {
  id: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
};
export function ApplicationForm({
  applicationId,
  questions,
}: {
  applicationId: string;
  questions: Question[];
}) {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const answers = Object.fromEntries(
      questions.map((q) => [
        q.id,
        q.type === "CHECKBOX" ? form.getAll(q.id) : form.get(q.id),
      ]),
    );
    try {
      const response = await fetch("/api/actions/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, answers }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="success-message" role="status">
        Application submitted. Track the review in My dashboard → Applications.
      </div>
    );
  return (
    <form className="form" onSubmit={submit}>
      {questions.map((q) =>
        q.type === "CHECKBOX" ? (
          <fieldset key={q.id}>
            <legend>{q.label}</legend>
            {q.options.map((o) => (
              <label className="check-label" key={o}>
                <input type="checkbox" name={q.id} value={o} />
                {o}
              </label>
            ))}
          </fieldset>
        ) : (
          <label key={q.id}>
            {q.label}
            {q.required ? " *" : ""}
            {q.type === "LONG" ? (
              <textarea name={q.id} required={q.required} maxLength={10000} />
            ) : ["CHOICE", "DROPDOWN", "YESNO"].includes(q.type) ? (
              <select name={q.id} required={q.required}>
                <option value="">Select…</option>
                {(q.type === "YESNO" ? ["Yes", "No"] : q.options).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                name={q.id}
                required={q.required}
                type={
                  q.type === "NUMBER"
                    ? "number"
                    : q.type === "DATE"
                      ? "date"
                      : "text"
                }
                maxLength={200}
              />
            )}
          </label>
        ),
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <button disabled={busy} className="button">
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
