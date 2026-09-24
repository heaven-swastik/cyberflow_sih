/**
 * Aurora — reactbits-style animated gradient background.
 * Three soft, slowly-drifting blobs of color behind hero content.
 * Pure CSS (see .rb-aurora rules in index.css) — no canvas, no deps,
 * so it costs nothing extra to install and can't crash the demo.
 */
export default function Aurora({ className = '' }) {
  return (
    <div className={`rb-aurora ${className}`} aria-hidden="true">
      <div className="rb-aurora__blob rb-aurora__blob--a" />
      <div className="rb-aurora__blob rb-aurora__blob--b" />
      <div className="rb-aurora__blob rb-aurora__blob--c" />
    </div>
  );
}
