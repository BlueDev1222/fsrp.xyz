import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>404 · Lost in Florida?</h1>
      <p>This page does not exist.</p>
      <Link className="button" style={{ marginTop: 20 }} href="/">
        Back to the community
      </Link>
    </section>
  );
}
