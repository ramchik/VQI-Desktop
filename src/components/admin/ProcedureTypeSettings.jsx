import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const MODULES = [
  { value: '', label: 'None (no special module)' },
  { value: 'carotid', label: 'Carotid Module' },
  { value: 'evar', label: 'Aortic/EVAR Module' },
  { value: 'pad', label: 'PAD Module' },
  { value: 'venous', label: 'Venous Module' },
  { value: 'dialysis', label: 'Dialysis Module' },
];

const PRESET_COLORS = [
  '#3b82f6','#ef4444','#f97316','#8b5cf6','#10b981',
  '#06b6d4','#f59e0b','#ec4899','#64748b','#84cc16',
];

export default function ProcedureTypeSettings() {
  const { notify } = useApp();
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [tab, setTab] = useState('groups');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', color: '#3b82f6', bg_color: '#eff6ff' });
  const [newType, setNewType] = useState({ name: '', nosology_group_id: '', module: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [gr, tp] = await Promise.all([
      window.electronAPI.getNosologyGroups(),
      window.electronAPI.getProcedureTypes(),
    ]);
    if (gr.success) setGroups(gr.data);
    if (tp.success) setTypes(tp.data);
  }

  // ── Nosology Groups ──────────────────────────────────────────────────────

  async function handleAddGroup() {
    if (!newGroup.name.trim()) { notify('Group name is required', 'error'); return; }
    const res = await window.electronAPI.createNosologyGroup(newGroup);
    if (res.success) {
      notify('Group added');
      setNewGroup({ name: '', color: '#3b82f6', bg_color: '#eff6ff' });
      load();
    } else {
      notify(res.error || 'Failed to add group', 'error');
    }
  }

  async function handleSaveGroup(group) {
    const res = await window.electronAPI.updateNosologyGroup(group.group_id, {
      name: group.name, color: group.color, bg_color: group.bg_color, active: group.active
    });
    if (res.success) { notify('Group saved'); setEditingGroup(null); load(); }
    else notify(res.error || 'Save failed', 'error');
  }

  async function handleDeleteGroup(group) {
    if (confirmDelete?.key !== `g${group.group_id}`) {
      setConfirmDelete({ key: `g${group.group_id}`, label: group.name }); return;
    }
    const res = await window.electronAPI.deleteNosologyGroup(group.group_id);
    if (res.success) { notify('Group deleted'); setConfirmDelete(null); load(); }
    else notify(res.error || 'Delete failed', 'error');
  }

  // ── Procedure Types ──────────────────────────────────────────────────────

  async function handleAddType() {
    if (!newType.name.trim()) { notify('Procedure name is required', 'error'); return; }
    const res = await window.electronAPI.createProcedureType({
      name: newType.name.trim(),
      nosology_group_id: newType.nosology_group_id ? Number(newType.nosology_group_id) : null,
      module: newType.module || null,
    });
    if (res.success) {
      notify('Procedure type added');
      setNewType({ name: '', nosology_group_id: '', module: '' });
      load();
    } else {
      notify(res.error || 'Failed to add type', 'error');
    }
  }

  async function handleSaveType(t) {
    const res = await window.electronAPI.updateProcedureType(t.type_id, {
      name: t.name,
      nosology_group_id: t.nosology_group_id || null,
      module: t.module || null,
      active: t.active,
    });
    if (res.success) { notify('Procedure type saved'); setEditingType(null); load(); }
    else notify(res.error || 'Save failed', 'error');
  }

  async function handleDeleteType(t) {
    if (confirmDelete?.key !== `t${t.type_id}`) {
      setConfirmDelete({ key: `t${t.type_id}`, label: t.name }); return;
    }
    const res = await window.electronAPI.deleteProcedureType(t.type_id);
    if (res.success) { notify('Procedure type deleted'); setConfirmDelete(null); load(); }
    else notify(res.error || 'Delete failed', 'error');
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Procedure Types</h1>
          <p className="page-subtitle">Manage nosology groups and procedure types available in the system</p>
        </div>
      </div>

      {confirmDelete && (
        <div style={{ padding: '12px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#991b1b', flex: 1 }}>
            ⚠️ Delete <strong>{confirmDelete.label}</strong>? This cannot be undone.
          </span>
          <button className="btn btn-danger btn-sm" onClick={() => {
            const g = groups.find(g => `g${g.group_id}` === confirmDelete.key);
            const t = types.find(t => `t${t.type_id}` === confirmDelete.key);
            if (g) handleDeleteGroup(g); else if (t) handleDeleteType(t);
          }}>Confirm Delete</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === 'groups' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('groups')}>
          Nosology Groups ({groups.length})
        </button>
        <button className={`btn ${tab === 'types' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('types')}>
          Procedure Types ({types.length})
        </button>
      </div>

      {tab === 'groups' && (
        <div>
          {/* Add new group */}
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 600 }}>Add Nosology Group</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                <label className="form-label">Group Name</label>
                <input className="form-input" value={newGroup.name}
                  onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))}
                  placeholder="e.g. Thoracic" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Badge Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 220 }}>
                  {PRESET_COLORS.map(c => (
                    <div key={c} onClick={() => setNewGroup(g => ({ ...g, color: c }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: newGroup.color === c ? '2px solid #fff' : '2px solid transparent',
                        boxShadow: newGroup.color === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Badge Background</label>
                <input type="color" value={newGroup.bg_color}
                  onChange={e => setNewGroup(g => ({ ...g, bg_color: e.target.value }))}
                  style={{ width: 48, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: '0.78rem',
                  fontWeight: 600, color: newGroup.color, background: newGroup.bg_color,
                  border: `1px solid ${newGroup.color}40` }}>
                  {newGroup.name || 'Preview'}
                </span>
                <button className="btn btn-primary btn-sm" onClick={handleAddGroup}>Add Group</button>
              </div>
            </div>
          </div>

          {/* Groups list */}
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Badge Preview</th>
                  <th>Procedure Types</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => editingGroup?.group_id === g.group_id ? (
                  <tr key={g.group_id}>
                    <td>
                      <input className="form-input" value={editingGroup.name}
                        onChange={e => setEditingGroup(eg => ({ ...eg, name: e.target.value }))} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {PRESET_COLORS.map(c => (
                            <div key={c} onClick={() => setEditingGroup(eg => ({ ...eg, color: c }))}
                              style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                                border: editingGroup.color === c ? '2px solid #fff' : '2px solid transparent',
                                boxShadow: editingGroup.color === c ? `0 0 0 2px ${c}` : 'none' }} />
                          ))}
                        </div>
                        <input type="color" value={editingGroup.bg_color}
                          onChange={e => setEditingGroup(eg => ({ ...eg, bg_color: e.target.value }))}
                          style={{ width: 36, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                          color: editingGroup.color, background: editingGroup.bg_color,
                          border: `1px solid ${editingGroup.color}40` }}>
                          {editingGroup.name}
                        </span>
                      </div>
                    </td>
                    <td>{types.filter(t => t.nosology_group_id === g.group_id).length}</td>
                    <td>
                      <select className="form-select" style={{ width: 110 }} value={editingGroup.active}
                        onChange={e => setEditingGroup(eg => ({ ...eg, active: Number(e.target.value) }))}>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveGroup(editingGroup)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingGroup(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={g.group_id} style={{ opacity: g.active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10,
                        fontSize: '0.78rem', fontWeight: 600, color: g.color, background: g.bg_color,
                        border: `1px solid ${g.color}40` }}>
                        {g.name}
                      </span>
                    </td>
                    <td>{types.filter(t => t.nosology_group_id === g.group_id).length} types</td>
                    <td>
                      <span className={`badge ${g.active ? 'badge-success' : 'badge-gray'}`}>
                        {g.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingGroup({ ...g })} title="Edit">✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteGroup(g)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'types' && (
        <div>
          {/* Add new type */}
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 600 }}>Add Procedure Type</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200, margin: 0 }}>
                <label className="form-label">Procedure Name</label>
                <input className="form-input" value={newType.name}
                  onChange={e => setNewType(t => ({ ...t, name: e.target.value }))}
                  placeholder="e.g. Thoracic Outlet Decompression" />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
                <label className="form-label">Nosology Group</label>
                <select className="form-select" value={newType.nosology_group_id}
                  onChange={e => setNewType(t => ({ ...t, nosology_group_id: e.target.value }))}>
                  <option value="">No group</option>
                  {groups.filter(g => g.active).map(g => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                <label className="form-label">Specialized Module</label>
                <select className="form-select" value={newType.module}
                  onChange={e => setNewType(t => ({ ...t, module: e.target.value }))}>
                  {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginBottom: 1 }} onClick={handleAddType}>
                Add Type
              </button>
            </div>
          </div>

          {/* Types list */}
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Procedure Name</th>
                  <th>Nosology Group</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => editingType?.type_id === t.type_id ? (
                  <tr key={t.type_id}>
                    <td>
                      <input className="form-input" value={editingType.name}
                        onChange={e => setEditingType(et => ({ ...et, name: e.target.value }))} />
                    </td>
                    <td>
                      <select className="form-select" value={editingType.nosology_group_id || ''}
                        onChange={e => setEditingType(et => ({ ...et, nosology_group_id: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">No group</option>
                        {groups.map(g => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" value={editingType.module || ''}
                        onChange={e => setEditingType(et => ({ ...et, module: e.target.value || null }))}>
                        {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" style={{ width: 110 }} value={editingType.active}
                        onChange={e => setEditingType(et => ({ ...et, active: Number(e.target.value) }))}>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveType(editingType)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingType(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.type_id} style={{ opacity: t.active ? 1 : 0.5 }}>
                    <td>{t.name}</td>
                    <td>
                      {t.nosology_name ? (
                        <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 10,
                          fontSize: '0.75rem', fontWeight: 600, color: t.color, background: t.bg_color,
                          border: `1px solid ${t.color}40` }}>
                          {t.nosology_name}
                        </span>
                      ) : <span style={{ color: '#64748b' }}>—</span>}
                    </td>
                    <td>
                      {t.module ? (
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          {MODULES.find(m => m.value === t.module)?.label || t.module}
                        </span>
                      ) : <span style={{ color: '#64748b' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${t.active ? 'badge-success' : 'badge-gray'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingType({ ...t })} title="Edit">✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteType(t)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
