import { motion } from 'framer-motion';

export default function LaserFlow({ color = "#41dc8f" }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div 
        animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        style={{
          width: '200%', height: '200%',
          backgroundImage: `linear-gradient(45deg, transparent 45%, ${color}22 50%, transparent 55%), linear-gradient(-45deg, transparent 45%, ${color}22 50%, transparent 55%)`,
          backgroundSize: '100px 100px',
          opacity: 0.5
        }}
      />
    </div>
  );
}
