import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await window.electronAPI.login({ username: username.trim(), password });
      if (res.success && res.user) {
        onLogin(res.user);
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🫀</div>
          <h1 className="login-title">VQI Desktop Registry</h1>
          <p className="login-subtitle">Vascular Surgery Patient Registry</p>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
            Modeled after the Vascular Quality Initiative
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 6, color: '#991b1b', fontSize: '0.85rem', marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner-sm"></span> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.78rem', color: '#94a3b8' }}>
          Default credentials: admin / admin123
        </p>

        <div style={{
          marginTop: 24, padding: '12px 16px', background: '#f0f4f8',
          borderRadius: 8, fontSize: '0.78rem', color: '#64748b'
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Offline Mode</strong>
          All data is stored locally and encrypted on this workstation.
          No internet connection required.
        </div>
      </div>
    </div>
  );
}
