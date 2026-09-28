import { useState } from 'react'

const PRESET_REASONS = [
  'Heavy rain / Adverse weather conditions (Outdoor Ground Impacted)',
  'Court emergency maintenance & surface repairs',
  'Floodlight / power system malfunction',
  'Extreme weather advisory / safety precautions',
]

export default function AdminRescheduleModal({ booking, onClose, onConfirm }) {
  const [reason, setReason] = useState(PRESET_REASONS[0])
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!reason.trim()) return

    setSubmitting(true)
    try {
      await onConfirm(booking, reason.trim())
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-modal-backdrop" onClick={onClose} id="admin-reschedule-backdrop">
      <div
        className="booking-modal admin-reschedule-modal"
        onClick={(e) => e.stopPropagation()}
        id="admin-reschedule-modal"
        style={{ maxWidth: '540px' }}
      >
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle" style={{ color: '#0284c7' }}>Admin Facility Control</p>
            <h3>Ask Member to Reschedule</h3>
          </div>
          <button type="button" className="close-btn" id="close-admin-reschedule-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleConfirm} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="admin-reschedule-booking-info">
            <strong>Booking #{booking.id} · {booking.name || booking.facilityName}</strong>
            <p style={{ margin: '4px 0', color: '#64748b', fontSize: '0.88rem' }}>
              Customer: <b>{booking.customerName}</b> · Scheduled for: <b>{booking.date}</b>
            </p>
          </div>

          <div className="info-banner" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>ℹ️</span>
            <small style={{ color: '#0369a1', lineHeight: '1.45' }}>
              When you send this request, <strong>only the free reschedule button</strong> will appear for this user on their dashboard. They will be able to select a new date and time slot for free.
            </small>
          </div>

          <div>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>
              Quick Reason Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`chip ${reason === preset ? 'active-chip' : ''}`}
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    padding: '6px 10px',
                    borderRadius: '20px',
                    border: reason === preset ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: reason === preset ? '#e0f2fe' : '#f8fafc',
                    color: reason === preset ? '#0369a1' : '#475569',
                    fontWeight: reason === preset ? 700 : 500,
                  }}
                >
                  {preset.startsWith('Heavy rain') ? '🌧️ ' : preset.startsWith('Court') ? '🛠️ ' : '⚡ '}
                  {preset.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Reason message to user <span style={{ color: '#ef4444' }}>*</span></span>
            <textarea
              id="admin-reschedule-reason-input"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Heavy rain at the football field, court maintenance..."
              required
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="secondary-btn" id="admin-cancel-ask-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              id="admin-confirm-ask-btn"
              disabled={submitting || !reason.trim()}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
            >
              {submitting ? 'Sending Request...' : 'Send Reschedule Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
