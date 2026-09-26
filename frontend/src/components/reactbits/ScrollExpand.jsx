import { motion, useScroll, useTransform } from 'framer-motion';

export default function ScrollExpand({ src, title, children }) {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 24, border: '1px solid var(--border-medium)' }}>
      <motion.img 
        src={src} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', scale }} 
      />
      <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.h2 style={{ fontSize: '3rem', color: '#2d3748', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 16px 0', opacity }}>{title}</motion.h2>
        <motion.div style={{ opacity }}>
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
