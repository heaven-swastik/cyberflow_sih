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
  const colors = ['', '#e4483f', '#e2954a', '#e2954a', '#41dc8f'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: colors[score] }}>{labels[score]}</div>
    </div>
  );
}

function Field({ label, id, type = 'text', value, onChange, placeholder, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.78rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.07em' }} htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: '100%', padding: '0.7rem 0.9rem',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${error ? '#e4483f' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, color: '#f4f7f5', fontSize: '0.95rem',
          outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
        }}
        onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(65,220,143,0.5)'; }}
        onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      />
      {children}
      {error && <div style={{ fontSize: '0.78rem', color: '#e4483f' }}>{error}</div>}
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
      background: '#050b0a', padding: '1.5rem', position: 'relative'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0, backgroundImage:
          'radial-gradient(circle at 30% 30%, rgba(65,220,143,0.06) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(91,143,214,0.05) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 420, position: 'relative',
          background: 'rgba(13,23,21,0.92)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(65,220,143,0.18)', borderRadius: 16,
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.8)',
          overflow: 'hidden'
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #41dc8f, transparent)' }} />

        <div style={{ padding: '2rem' }}>
          {/* Back button */}
          {onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: '#8a9390', cursor: 'pointer',
              fontSize: '0.85rem', marginBottom: '1rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4
            }}>← Back</button>
          )}

          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: 'rgba(65,220,143,0.1)',
              border: '1px solid rgba(65,220,143,0.25)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem'
            }}>🛡️</div>
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.6rem', fontWeight: 700, color: '#f4f7f5' }}>CyberFlow</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#8a9390' }}>
              {tab === 'signin' ? 'Sign in to the intelligence platform' : 'Create your account'}
            </p>
          </div>

          {/* Tab toggle */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3,
            marginBottom: '1.5rem', gap: 3
          }}>
            {[['signin', 'Sign In'], ['register', 'Register']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setErrors({}); setGlobalError(''); }}
                style={{
                  flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.2s',
                  background: tab === key ? 'rgba(65,220,143,0.15)' : 'transparent',
                  color: tab === key ? '#41dc8f' : '#8a9390'
                }}
              >{label}</button>
            ))}
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ background: 'rgba(228,72,63,0.12)', border: '1px solid rgba(228,72,63,0.3)', color: '#ff8a80',
                  borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem' }}
              >{globalError}</motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="wait">
              {tab === 'register' && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Field label="Full Name" id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ramesh Kumar" error={errors.displayName} />
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

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '0.8rem', marginTop: '0.5rem',
                background: isLoading ? 'rgba(65,220,143,0.4)' : '#41dc8f',
                color: '#050b0a', border: 'none', borderRadius: 9,
                fontWeight: 700, fontSize: '0.95rem',
                cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
              }}
            >
              {isLoading ? 'Authenticating...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Judge hint */}
          <div style={{ marginTop: '1.25rem', padding: '0.6rem 0.75rem', background: 'rgba(65,220,143,0.05)', borderRadius: 8, border: '1px dashed rgba(65,220,143,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#8a9390', marginBottom: 2 }}>DEMO CREDENTIALS</div>
            <div style={{ fontSize: '0.78rem', color: '#41dc8f', fontFamily: 'IBM Plex Mono, monospace' }}>admin@cyberflow.gov · CyberFlowAdmin123!</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
