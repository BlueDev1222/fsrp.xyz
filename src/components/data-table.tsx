"use client";
import { useEffect, useState, useRef } from "react";
type Row = Record<string, unknown>;
function valueAt(row: Row, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object" ? (value as Row)[key] : undefined,
      row,
    );
}
function format(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object")
    return Array.isArray(value)
      ? `${value.length} items`
      : JSON.stringify(value);
  return String(value).replaceAll("_", " ");
}
export function DataTable({
  resource,
  columns,
  staff = false,
}: {
  resource: string;
  columns: { key: string; label: string }[];
  staff?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/data/${resource}?page=${page}&q=${encodeURIComponent(q)}&scope=${staff ? "staff" : "member"}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message);
        setRows(result.data);
        setMore(result.hasMore);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [resource, page, q, staff, refresh]);
  return (
    <div>
      <div className="table-tools">
        <input
          className="search-input"
          aria-label="Search records"
          placeholder="Search records…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <button
          className="button secondary small"
          onClick={() => setRefresh((v) => v + 1)}
        >
          Refresh records
        </button>
      </div>
      {error ? (
        <div role="alert" className="error-message">
          {error}
        </div>
      ) : loading ? (
        <div className="loading" aria-label="Loading records" />
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={String(r.id ?? i)}>
                  {columns.map((c) => (
                    <td key={c.key}>{format(valueAt(r, c.key))}</td>
                  ))}
                  <td>
                    <button
                      className="button small secondary"
                      onClick={() => {
                        setSelected(r);
                        dialog.current?.showModal();
                      }}
                    >
                      View record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <strong>No records found</strong>
          <p>Records that you can access will appear here.</p>
        </div>
      )}
      <div className="pagination">
        <button
          className="button small secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="button small secondary"
          disabled={!more || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <dialog className="modal" ref={dialog}>
        <div className="modal-top">
          <h2>Record details</h2>
          <button className="close" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
        {selected && (
          <dl>
            {Object.entries(selected).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <dt className="inline-label">
                  {key.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd
                  style={{ margin: 0 }}
                  className={typeof value === "object" ? "details-json" : ""}
                >
                  {typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </dialog>
    </div>
  );
}
