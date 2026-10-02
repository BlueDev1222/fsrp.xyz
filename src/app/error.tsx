"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <h1>We could not load this page.</h1>
      <p>Please try again. If this continues, contact community support.</p>
      <button className="button" style={{ marginTop: 20 }} onClick={reset}>
        Try again
      </button>
    </section>
  );
}
