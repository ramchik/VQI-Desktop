import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const ROLES = ['surgeon', 'data_manager', 'administrator'];
const ROLE_LABELS = { surgeon: 'Surgeon', data_manager: 'Data Manager', administrator: 'Administrator' };
const ROLE_COLORS = { surgeon: 'info', data_manager: 'success', administrator: 'danger' };

export default function UserManagement() {
  const { user: currentUser, notify } = useApp();
  const [users, setUsers] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [tab, setTab] = useState('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showSurgeonForm, setShowSurgeonForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingSurgeon, setEditingSurgeon] = useState(null);
  const [saving, setSaving] = useState(false);

  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'surgeon' });
  const [surgeonForm, setSurgeonForm] = useState({ first_name: '', last_name: '', specialty: 'Vascular Surgery', license_number: '' });

  useEffect(() => { loadUsers(); loadSurgeons(); }, []);

  async function loadUsers() {
    const res = await window.electronAPI.getUsers();
    if (res.success) setUsers(res.data);
  }

  async function loadSurgeons() {
    const res = await window.electronAPI.getSurgeons();
    if (res.success) setSurgeons(res.data);
  }

  async function handleSaveUser() {
    if (!userForm.full_name.trim() || !userForm.username.trim()) {
      notify('Name and username are required', 'error');
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      notify('Password is required for new users', 'error');
      return;
    }
    setSaving(true);
    try {
      let res;
      const data = { ...userForm };
      if (editingUser && !data.password) delete data.password;
      if (editingUser) {
        res = await window.electronAPI.updateUser(editingUser.user_id, data);
      } else {
        res = await window.electronAPI.createUser(data);
      }
      if (res.success) {
        notify(editingUser ? 'User updated' : 'User created');
        setShowUserForm(false);
        setEditingUser(null);
        setUserForm({ username: '', password: '', full_name: '', role: 'surgeon' });
        loadUsers();
      } else {
        notify(res.error || 'Save failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(u) {
    if (u.user_id === currentUser.user_id) { notify('Cannot deactivate your own account', 'error'); return; }
    if (!confirm(`Deactivate user ${u.full_name}?`)) return;
    const res = await window.electronAPI.deleteUser(u.user_id);
    if (res.success) { notify('User deactivated'); loadUsers(); }
  }

  function startEditUser(u) {
    setEditingUser(u);
    setUserForm({ username: u.username, password: '', full_name: u.full_name, role: u.role });
    setShowUserForm(true);
  }

  async function handleSaveSurgeon() {
    if (!surgeonForm.first_name.trim() || !surgeonForm.last_name.trim()) {
      notify('First and last name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editingSurgeon) {
        res = await window.electronAPI.updateSurgeon(editingSurgeon.surgeon_id, surgeonForm);
      } else {
        res = await window.electronAPI.createSurgeon(surgeonForm);
      }
      if (res.success) {
        notify(editingSurgeon ? 'Surgeon updated' : 'Surgeon added');
        setShowSurgeonForm(false);
        setEditingSurgeon(null);
        setSurgeonForm({ first_name: '', last_name: '', specialty: 'Vascular Surgery', license_number: '' });
        loadSurgeons();
      } else {
        notify(res.error || 'Save failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  function startEditSurgeon(s) {
    setEditingSurgeon(s);
    setSurgeonForm({ first_name: s.first_name, last_name: s.last_name, specialty: s.specialty || 'Vascular Surgery', license_number: s.license_number || '' });
    setShowSurgeonForm(true);
  }

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage registry users and surgeon directory</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          👤 System Users ({users.length})
        </button>
        <button className={`tab-btn ${tab === 'surgeons' ? 'active' : ''}`} onClick={() => setTab('surgeons')}>
          👨‍⚕️ Surgeons ({surgeons.length})
        </button>
      </div>

      {tab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registry Users</div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingUser(null);
              setUserForm({ username: '', password: '', full_name: '', role: 'surgeon' });
              setShowUserForm(true);
            }}>+ Add User</button>
          </div>

          {showUserForm && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>
                {editingUser ? '✏️ Edit User' : '➕ New User'}
              </div>
              <div className="form-grid form-grid-3" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input className="form-input" value={userForm.full_name}
                    onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. John Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Username</label>
                  <input className="form-input" value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="username" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className="form-input" type="password" value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Role</label>
                  <select className="form-select" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="btn-group">
                <button className="btn btn-primary btn-sm" onClick={handleSaveUser} disabled={saving}>
                  {saving ? '⏳ Saving...' : editingUser ? '💾 Update User' : '✅ Create User'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-container" style={{ border: 'none' }}>
            {users.length === 0 ? (
              <div className="empty-state"><div>No users found</div></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id}>
                      <td>{u.full_name}</td>
                      <td><span className="badge badge-gray">{u.username}</span></td>
                      <td><span className={`badge badge-${ROLE_COLORS[u.role] || 'gray'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td>
                        <span className={`badge badge-${u.active ? 'success' : 'danger'}`}>
                          {u.active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-ghost btn-sm" onClick={() => startEditUser(u)}>✏️ Edit</button>
                          {u.user_id !== currentUser.user_id && (
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteUser(u)}>
                              🚫 Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: '#64748b' }}>
            <strong>Roles:</strong> Surgeon (view/enter), Data Manager (full edit + follow-up), Administrator (all + users + backup)
          </div>
        </div>
      )}

      {tab === 'surgeons' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Surgeon Directory</div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingSurgeon(null);
              setSurgeonForm({ first_name: '', last_name: '', specialty: 'Vascular Surgery', license_number: '' });
              setShowSurgeonForm(true);
            }}>+ Add Surgeon</button>
          </div>

          {showSurgeonForm && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>
                {editingSurgeon ? '✏️ Edit Surgeon' : '➕ Add Surgeon'}
              </div>
              <div className="form-grid form-grid-4" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label required">First Name</label>
                  <input className="form-input" value={surgeonForm.first_name}
                    onChange={e => setSurgeonForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Last Name</label>
                  <input className="form-input" value={surgeonForm.last_name}
                    onChange={e => setSurgeonForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialty</label>
                  <input className="form-input" value={surgeonForm.specialty}
                    onChange={e => setSurgeonForm(f => ({ ...f, specialty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">License Number</label>
                  <input className="form-input" value={surgeonForm.license_number}
                    onChange={e => setSurgeonForm(f => ({ ...f, license_number: e.target.value }))} placeholder="License #" />
                </div>
              </div>
              <div className="btn-group">
                <button className="btn btn-primary btn-sm" onClick={handleSaveSurgeon} disabled={saving}>
                  {saving ? '⏳ Saving...' : editingSurgeon ? '💾 Update' : '✅ Add Surgeon'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowSurgeonForm(false); setEditingSurgeon(null); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-container" style={{ border: 'none' }}>
            {surgeons.length === 0 ? (
              <div className="empty-state"><div>No surgeons configured</div></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Specialty</th>
                    <th>License</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {surgeons.map(s => (
                    <tr key={s.surgeon_id}>
                      <td style={{ fontWeight: 500 }}>Dr. {s.first_name} {s.last_name}</td>
                      <td>{s.specialty || '—'}</td>
                      <td>{s.license_number || '—'}</td>
                      <td><span className={`badge badge-${s.active ? 'success' : 'danger'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEditSurgeon(s)}>✏️ Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
