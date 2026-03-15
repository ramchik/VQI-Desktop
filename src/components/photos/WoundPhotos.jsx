import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';

const WIFI_LABELS = {
  0: 'None / Minimal', 1: 'Mild', 2: 'Moderate', 3: 'Severe'
};

const WIFI_COLORS = { 0: '#10b981', 1: '#f59e0b', 2: '#f97316', 3: '#ef4444' };

const PHOTO_TYPES = ['Pre-operative', 'Intraoperative', 'Post-operative', 'Follow-up', 'Wound'];

const ANATOMICAL_LOCATIONS = [
  'Right Foot', 'Left Foot', 'Right Toe(s)', 'Left Toe(s)',
  'Right Heel', 'Left Heel', 'Right Forefoot', 'Left Forefoot',
  'Right Midfoot', 'Left Midfoot', 'Right Lower Leg', 'Left Lower Leg',
  'Right Thigh', 'Left Thigh', 'Right Groin', 'Left Groin',
  'Right Arm', 'Left Arm', 'Neck / Carotid', 'Abdomen', 'Other'
];

export default function WoundPhotos({ procedureId, patientId }) {
  const { notify } = useApp();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState({
    photo_type: 'Wound',
    taken_date: new Date().toISOString().slice(0, 10),
    anatomical_location: '',
    wifi_wound: '',
    wifi_ischemia: '',
    wifi_infection: '',
    notes: ''
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => { loadPhotos(); }, [procedureId]);

  async function loadPhotos() {
    setLoading(true);
    const res = await window.electronAPI.getPhotos(procedureId);
    if (res.success) setPhotos(res.data);
    setLoading(false);
  }

  async function handleUpload() {
    setUploading(true);
    try {
      const cleanMeta = Object.fromEntries(
        Object.entries(meta).map(([k, v]) => [k, v === '' ? null : v])
      );
      const res = await window.electronAPI.uploadPhotos(procedureId, patientId, cleanMeta);
      if (res.success) {
        notify(`${res.data.length} photo(s) uploaded`);
        await loadPhotos();
      } else if (!res.canceled) {
        notify(res.error || 'Upload failed', 'error');
      }
    } finally { setUploading(false); }
  }

  async function handleDelete(photoId) {
    const res = await window.electronAPI.deletePhoto(photoId);
    if (res.success) {
      notify('Photo deleted');
      setPhotos(p => p.filter(x => x.photo_id !== photoId));
      if (selectedPhoto?.photo_id === photoId) setSelectedPhoto(null);
    } else {
      notify(res.error || 'Delete failed', 'error');
    }
  }

  function wifiTotal(photo) {
    const w = photo.wifi_wound ?? 0;
    const i = photo.wifi_ischemia ?? 0;
    const inf = photo.wifi_infection ?? 0;
    return { w, i, inf, total: w + i + inf };
  }

  function wifiRisk(total) {
    if (total <= 1) return { label: 'Very Low', color: '#10b981' };
    if (total <= 3) return { label: 'Low', color: '#84cc16' };
    if (total <= 5) return { label: 'Moderate', color: '#f59e0b' };
    if (total <= 7) return { label: 'High', color: '#f97316' };
    return { label: 'Very High', color: '#ef4444' };
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading photos...</div>
  );

  return (
    <div>
      {/* Upload Panel */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">📸 Upload Photos</div>
        </div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Photo Type</label>
              <select className="form-select" value={meta.photo_type}
                onChange={e => setMeta(m => ({ ...m, photo_type: e.target.value }))}>
                {PHOTO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date Taken</label>
              <input className="form-input" type="date" value={meta.taken_date}
                onChange={e => setMeta(m => ({ ...m, taken_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Anatomical Location</label>
              <select className="form-select" value={meta.anatomical_location}
                onChange={e => setMeta(m => ({ ...m, anatomical_location: e.target.value }))}>
                <option value="">Select...</option>
                {ANATOMICAL_LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>

            <div className="section-header">WIfI Score (Wound, Ischemia, foot Infection)</div>

            {[
              ['wifi_wound', 'W — Wound Grade'],
              ['wifi_ischemia', 'I — Ischemia Grade'],
              ['wifi_infection', 'fI — Infection Grade']
            ].map(([field, label]) => (
              <div className="form-group" key={field}>
                <label className="form-label">{label}</label>
                <select className="form-select" value={meta[field]}
                  onChange={e => setMeta(m => ({ ...m, [field]: e.target.value }))}>
                  <option value="">Not scored</option>
                  {[0, 1, 2, 3].map(v => (
                    <option key={v} value={v}>{v} — {WIFI_LABELS[v]}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="form-group full-width">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={meta.notes}
                onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))}
                placeholder="Wound description, dimensions, odour, exudate..." />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><span className="spinner-sm"></span> Uploading...</> : '📁 Choose & Upload Photos'}
            </button>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      {photos.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📷</div>
            <div className="empty-state-title">No photos yet</div>
            <div className="empty-state-desc">Upload pre-op, intraoperative, or wound photos above</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Photo Gallery ({photos.length})</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, padding: 16 }}>
            {photos.map(photo => {
              const wifi = wifiTotal(photo);
              const risk = wifiRisk(wifi.total);
              return (
                <div key={photo.photo_id}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                    overflow: 'hidden', cursor: 'pointer',
                    boxShadow: selectedPhoto?.photo_id === photo.photo_id ? '0 0 0 2px #2563eb' : 'none'
                  }}
                  onClick={() => setSelectedPhoto(selectedPhoto?.photo_id === photo.photo_id ? null : photo)}
                >
                  {/* Image preview */}
                  <div
                    style={{ height: 140, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                    onDoubleClick={e => { e.stopPropagation(); window.electronAPI.openPhotoFile(photo.file_path); }}
                    title="Double-click to open in system viewer"
                  >
                    <img
                      src={`file://${photo.file_path}`}
                      alt={photo.file_name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '<div style="color:#475569;font-size:36px">📷</div>';
                      }}
                    />
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 4, wordBreak: 'break-all' }}>
                      {photo.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                      {photo.photo_type} · {photo.taken_date || '—'}
                    </div>
                    {photo.anatomical_location && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>📍 {photo.anatomical_location}</div>
                    )}
                    {(photo.wifi_wound != null || photo.wifi_ischemia != null || photo.wifi_infection != null) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: risk.color, background: risk.color + '22', padding: '2px 6px', borderRadius: 4 }}>
                          WIfI: {wifi.w}/{wifi.i}/{wifi.inf} — {risk.label}
                        </span>
                      </div>
                    )}
                    {photo.notes && (
                      <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 4 }}>
                        {photo.notes.slice(0, 60)}{photo.notes.length > 60 ? '...' : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); window.electronAPI.openPhotoFile(photo.file_path); }}>
                        Open
                      </button>
                      <button className="btn btn-sm" style={{ fontSize: 11, background: '#7f1d1d', color: '#fca5a5', border: 'none' }}
                        onClick={e => { e.stopPropagation(); if (confirm('Delete this photo?')) handleDelete(photo.photo_id); }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Before / After comparison */}
      {photos.length >= 2 && (
        <BeforeAfterComparison photos={photos} />
      )}
    </div>
  );
}

function BeforeAfterComparison({ photos }) {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const leftPhoto = photos.find(p => p.photo_id === Number(left));
  const rightPhoto = photos.find(p => p.photo_id === Number(right));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div className="card-title">Before / After Comparison</div>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['Before (Pre-op)', 'After (Post-op)'].map((label, idx) => {
            const val = idx === 0 ? left : right;
            const setter = idx === 0 ? setLeft : setRight;
            const photo = idx === 0 ? leftPhoto : rightPhoto;
            return (
              <div key={label}>
                <div className="form-group">
                  <label className="form-label">{label}</label>
                  <select className="form-select" value={val} onChange={e => setter(e.target.value)}>
                    <option value="">Select photo...</option>
                    {photos.map(p => (
                      <option key={p.photo_id} value={p.photo_id}>
                        {p.taken_date} — {p.photo_type} {p.anatomical_location ? `(${p.anatomical_location})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {photo && (
                  <div style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={`file://${photo.file_path}`}
                      alt={photo.file_name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
