import { useState } from 'react';

export default function HalftoneReveal({ src, inkColor = "#050b0a", paperColor = "#41dc8f" }) {
  const [maskPos, setMaskPos] = useState({ x: -999, y: -999 });

  return (
    <div 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: paperColor, borderRadius: 24, cursor: 'crosshair', border: '1px solid var(--border-medium)' }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMaskPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setMaskPos({ x: -999, y: -999 })}
    >
      <div style={{ position: 'absolute', inset: 0, background: inkColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: paperColor, fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: 2 }}>Hover to reveal past network patterns</h2>
      </div>
      <img 
        src={src} 
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          WebkitMaskImage: `radial-gradient(circle 250px at ${maskPos.x}px ${maskPos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
          maskImage: `radial-gradient(circle 250px at ${maskPos.x}px ${maskPos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
          pointerEvents: 'none',
          mixBlendMode: 'luminosity'
        }} 
      />
    </div>
  );
}
