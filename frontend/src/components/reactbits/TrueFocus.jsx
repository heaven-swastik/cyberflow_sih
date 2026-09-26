import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function TrueFocus({ sentence = "True Focus", blurAmount = 5, borderColor = "#5227FF", animationDuration = 0.5, pauseBetweenAnimations = 1 }) {
  const words = sentence.split(" ");
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFocusIndex(prev => (prev + 1) % words.length);
    }, (animationDuration + pauseBetweenAnimations) * 1000);
    return () => clearInterval(interval);
  }, [words.length, animationDuration, pauseBetweenAnimations]);

  return (
    <div style={{ display: 'flex', gap: '0.4em', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          animate={{
            filter: focusIndex === i ? 'blur(0px)' : `blur(${blurAmount}px)`,
            opacity: focusIndex === i ? 1 : 0.3,
            scale: focusIndex === i ? 1.05 : 1,
            color: focusIndex === i ? borderColor : '#2d3748',
            textShadow: focusIndex === i ? `0 0 12px ${borderColor}44` : 'none'
          }}
          transition={{ duration: animationDuration }}
          style={{ display: 'inline-block', fontWeight: 900 }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}

