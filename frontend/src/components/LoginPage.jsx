import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

function PasswordStrength({ password }) {
  const score = !password ? 0
    : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
    : password.length >= 10 && (/[A-Z]/.test(password) || /[0-9]/.test(password)) ? 3
    : password.length >= 8 ? 2
    : 1;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#f56565', '#ed8936', '#ed8936', '#48bb78'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? colors[score] : '#eaedf1', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: colors[score], fontWeight: 600 }}>{labels[score]}</div>
    </div>
  );
}

function Field({ label, id, type = 'text', value, onChange, placeholder, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, letterSpacing: '0.02em' }} htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: '100%', padding: '0.8rem 1rem',
          background: '#ffffff',
          border: `2px solid ${error ? '#f56565' : '#eaedf1'}`,
          borderRadius: 12, color: '#2d3748', fontSize: '0.95rem',
          outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
        }}
        onFocus={e => { if (!error) { e.target.style.borderColor = '#9f7aea'; e.target.style.boxShadow = '0 0 0 3px rgba(159, 122, 234, 0.2)'; } }}
        onBlur={e => { if (!error) { e.target.style.borderColor = '#eaedf1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.01)'; } }}
      />
      {children}
      {error && <div style={{ fontSize: '0.78rem', color: '#f56565', fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

const LoginPage = ({ onLoginSuccess, onBack }) => {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) e.email = 'Valid email required';
    if (!password || password.length < 8) e.password = 'Min 8 characters';
    if (tab === 'register') {
      if (!displayName || displayName.trim().length < 2) e.displayName = 'Name required (min 2 chars)';
      if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (tab === 'register') {
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setGlobalError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f4f6fa', padding: '1.5rem', position: 'relative', overflow: 'hidden'
    }}>
      {/* Playful & Professional Background elements */}
      <div style={{
        position: 'absolute', inset: 0, backgroundImage:
          'radial-gradient(circle at 15% 20%, rgba(119, 85, 245, 0.08) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(159, 122, 234, 0.08) 0%, transparent 40%)',
        pointerEvents: 'none'
      }} />
      
      {/* 3D floating blobs for playful tone */}
      <motion.div animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '15%', left: '10%', width: 250, height: 250, background: 'linear-gradient(135deg, #a78bfa 0%, #835cf5 100%)', borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%', filter: 'blur(60px)', opacity: 0.3 }} />
      <motion.div animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', borderRadius: '50% 50% 30% 70% / 50% 40% 60% 50%', filter: 'blur(80px)', opacity: 0.2 }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
        style={{
          width: '100%', maxWidth: 440, position: 'relative',
          background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: 28,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(119, 85, 245, 0.05)',
          overflow: 'hidden', padding: '3rem 2.5rem'
        }}
      >
        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={{
            background: 'rgba(119, 85, 245, 0.1)', border: 'none', color: '#7755f5', cursor: 'pointer',
            fontSize: '0.85rem', marginBottom: '1.5rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '999px', fontWeight: 600, transition: 'all 0.2s'
          }}>← Go Back</button>
        )}

        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }} style={{
            width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #a78bfa 0%, #7755f5 100%)',
            boxShadow: '0 10px 25px rgba(119, 85, 245, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.8rem'
          }}>🛡️</motion.div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.8rem', fontWeight: 800, color: '#1a202c', letterSpacing: '-0.03em' }}>CyberFlow</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#718096', fontWeight: 500 }}>
            {tab === 'signin' ? 'Welcome back! Sign in to the intelligence portal.' : 'Join the proactive defense network.'}
          </p>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', background: '#f1f5f9', borderRadius: 14, padding: 4,
          marginBottom: '2rem', gap: 4
        }}>
          {[['signin', 'Sign In'], ['register', 'Register']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setErrors({}); setGlobalError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: tab === key ? '#ffffff' : 'transparent',
                color: tab === key ? '#7755f5' : '#64748b',
                boxShadow: tab === key ? '0 2px 10px rgba(0,0,0,0.05)' : 'none'
              }}
            >{label}</button>
          ))}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {globalError && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }}
              style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e',
                borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}
            >{globalError}</motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <AnimatePresence mode="wait">
            {tab === 'register' && (
              <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Field label="Full Name" id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Investigator Name" error={errors.displayName} />
              </motion.div>
            )}
          </AnimatePresence>

          <Field label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@cyberflow.gov.in" error={errors.email} />

          <Field label={tab === 'signin' ? 'Password' : 'Create Password'} id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" error={errors.password}>
            {tab === 'register' && <PasswordStrength password={password} />}
          </Field>

          <AnimatePresence mode="wait">
            {tab === 'register' && (
              <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Field label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" error={errors.confirmPassword} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%', padding: '0.9rem', marginTop: '0.75rem',
              background: isLoading ? '#b794f4' : 'linear-gradient(135deg, #9f7aea 0%, #7755f5 100%)',
              color: '#ffffff', border: 'none', borderRadius: 14,
              fontWeight: 800, fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'box-shadow 0.2s',
              boxShadow: isLoading ? 'none' : '0 10px 20px rgba(119, 85, 245, 0.3)'
            }}
          >
            {isLoading ? 'Authenticating...' : tab === 'signin' ? 'Sign In to Dashboard' : 'Create Account'}
          </motion.button>
        </form>

        {/* Judge hint */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>DEMO CREDENTIALS</div>
          <div style={{ fontSize: '0.85rem', color: '#7755f5', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>admin@cyberflow.gov <br/><span style={{ color: '#a0aec0' }}>•</span> CyberFlowAdmin123!</div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
