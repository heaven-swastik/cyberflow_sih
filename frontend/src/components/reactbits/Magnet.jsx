import { useRef, useCallback } from 'react';

/**
 * Magnet — reactbits-style pointer attraction.
 * Wrap a single interactive child (usually a button); the child
 * eases toward the cursor while hovered and snaps back on leave.
 * Uses direct style writes on a ref instead of React state, so it
 * stays smooth without re-rendering on every mousemove.
 */
export default function Magnet({ children, strength = 0.3, className = '' }) {
  const ref = useRef(null);

  const handleMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
    },
    [strength]
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0, 0)';
  }, []);

  return (
    <div
      ref={ref}
      className={`rb-magnet ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}
