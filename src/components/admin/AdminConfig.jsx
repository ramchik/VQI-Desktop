import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const CATEGORIES = [
  { id: 'procedure_type',  label: 'Procedure Types',    icon: '🔬' },
  { id: 'ethnicity',       label: 'Ethnicity',           icon: '🌍' },
  { id: 'insurance',       label: 'Insurance Types',     icon: '💳' },
  { id: 'urgency',         label: 'Urgency Levels',      icon: '⚡' },
  { id: 'anesthesia_type', label: 'Anesthesia Types',    icon: '💉' },
  { id: 'hospital',        label: 'Hospitals / Sites',   icon: '🏥' },
];

export default function AdminConfig() {
  const { notify } = useApp();
  const [activeCategory, setActiveCategory] = useState('procedure_type');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadOptions(); }, [activeCategory]);

  async function loadOptions() {
    setLoading(true);
    const res = await window.electronAPI.getConfigByCategory(activeCategory);
    if (res.success) setOptions(res.data);
    setLoading(false);
  }

  async function handleAdd() {
    const v = newValue.trim();
    if (!v) return;
    setSaving(true);
    const res = await window.electronAPI.createConfigOption({ category: activeCategory, value: v, sort_order: options.length });
    if (res.success) {
      notify(`"${v}" added`);
      setNewValue('');
      loadOptions();
    } else {
      notify(res.error || 'Already exists', 'error');
    }
    setSaving(false);
  }

  async function handleUpdate(id) {
    const v = editValue.trim();
    if (!v) return;
    setSaving(true);
    const res = await window.electronAPI.updateConfigOption(id, { value: v });
    if (res.success) {
      notify('Updated');
      setEditingId(null);
      loadOptions();
    } else {
      notify(res.error || 'Update failed', 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id, value) {
    if (!confirm(`Remove "${value}" from the list?`)) return;
    const res = await window.electronAPI.deleteConfigOption(id);
    if (res.success) {
      notify(`"${value}" removed`);
      loadOptions();
    }
  }

  function startEdit(opt) {
    setEditingId(opt.option_id);
    setEditValue(opt.value);
  }

  const catLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory;

  return (
    <div className="page-wide" style={{ padding: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Configuration</h1>
          <p className="page-subtitle">Manage dropdown lists used throughout the registry</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Category sidebar */}
        <div style={{
          width: 220, flexShrink: 0, background: '#1e293b',
          border: '1px solid #334155', borderRadius: 10, overflow: 'hidden'
        }}>
          {CATEGORIES.map(cat => (
            <div
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setEditingId(null); setNewValue(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
                background: activeCategory === cat.id ? '#1e3a8a' : 'transparent',
                borderLeft: activeCategory === cat.id ? '3px solid #3b82f6' : '3px solid transparent',
                color: activeCategory === cat.id ? '#e2e8f0' : '#94a3b8',
                fontWeight: activeCategory === cat.id ? 600 : 400,
                fontSize: '0.88rem', transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: 16 }}>{cat.icon}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                {CATEGORIES.find(c => c.id === activeCategory)?.icon} {catLabel}
                <span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#64748b', marginLeft: 10 }}>
                  {options.length} option{options.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="card-body">
              {/* Add new value */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={`Add new ${catLabel.toLowerCase()} option...`}
                />
                <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !newValue.trim()}>
                  + Add
                </button>
              </div>

              {/* Options list */}
              {loading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
              ) : options.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
                  No options yet. Add the first one above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {options.map((opt, idx) => (
                    <div key={opt.option_id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: '#0f172a',
                      border: '1px solid #334155', borderRadius: 8
                    }}>
                      <span style={{ color: '#475569', fontSize: '0.78rem', minWidth: 24, textAlign: 'right' }}>
                        {idx + 1}
                      </span>

                      {editingId === opt.option_id ? (
                        <>
                          <input
                            className="form-input"
                            style={{ flex: 1, padding: '5px 10px', fontSize: '0.88rem' }}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdate(opt.option_id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(opt.option_id)} disabled={saving}>
                            Save
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.9rem' }}>{opt.value}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(opt)}>
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDelete(opt.option_id, opt.value)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{
            marginTop: 16, padding: '12px 16px', background: '#1e293b',
            border: '1px solid #334155', borderRadius: 8, fontSize: '0.82rem', color: '#64748b'
          }}>
            <strong style={{ color: '#94a3b8' }}>Note:</strong> Changes take effect immediately in all dropdown menus.
            Removing an option does not affect existing records that used it.
          </div>
        </div>
      </div>
    </div>
  );
}
