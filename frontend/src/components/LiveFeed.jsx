import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchFeed = () => {
      fetch('/api/feed', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('cyberflow_token') } })
        .then(r => r.json())
        .then(data => {
          if (mounted && Array.isArray(data)) {
            setEvents(data);
          }
        })
        .catch(e => console.error(e));
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="live-feed">
      <div className="live-feed-header">
        <span className="live-feed-dot"></span>
        <span className="live-feed-title">LIVE INTELLIGENCE FEED</span>
      </div>
      <div className="live-feed-list">
        <AnimatePresence>
          {events.map((evt) => (
            <motion.div
              key={evt.id}
              className={`live-feed-item severity-${evt.severity}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="live-feed-time">{new Date(evt.timestamp).toTimeString().split(' ')[0]}</div>
              <div className="live-feed-msg">{evt.message || evt.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
