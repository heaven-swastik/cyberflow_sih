/**
 * ShinyText — reactbits-style shimmer sweep across text.
 * A gradient background clipped to the text, animated left-to-right
 * on a loop. Renders as `as` (default span) so it drops into
 * headings, eyebrows, or badges without changing document structure.
 */
export default function ShinyText({ as: Tag = 'span', className = '', children }) {
  return <Tag className={`rb-shiny-text ${className}`}>{children}</Tag>;
}
