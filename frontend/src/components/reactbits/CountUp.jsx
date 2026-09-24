import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — reactbits-style animated number reveal.
 * Eases from the previous value up to `value` on every change, using
 * a plain requestAnimationFrame loop (no framer-motion coupling, so
 * it can't break on a version bump). Pass an existing formatter
 * (formatINR, padStart, etc.) via `format` — it's called every frame
 * with the in-progress rounded number so currency/percent displays
 * animate correctly too.
 */
export default function CountUp({ value, duration = 900, format, className = '' }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startTsRef = useRef(null);
  const fromRef = useRef(0);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return undefined;

    // First paint: jump straight to the value, no animation from zero
    // if the number is already large (avoids a distracting long count
    // on page-load for e.g. multi-crore rupee figures).
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fromRef.current = 0;
    }

    const startValue = fromRef.current;
    startTsRef.current = null;

    const tick = (ts) => {
      if (startTsRef.current == null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = startValue + (value - startValue) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const rounded = Math.round(display);
  const content = format ? format(rounded) : rounded;

  return <span className={`rb-countup ${className}`}>{content}</span>;
}
