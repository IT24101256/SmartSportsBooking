import { useState } from 'react'

export default function AdminConfirmRefundModal({ booking, onClose, onConfirm }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(booking, notes.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const refundAmt = Number(booking.refundAmount || 0).toLocaleString()
  const isFullRefund = booking.refundPercentage === 100 || (Number(booking.refundAmount || 0) >= Number(booking.totalAmount || 0) && Number(booking.totalAmount || 0) > 0)
  const isHalfRefund = !isFullRefund

  return (
    <div className="booking-modal-backdrop" onClick={onClose} id="admin-refund-modal-backdrop">
      <div
        className="booking-modal"
        onClick={(e) => e.stopPropagation()}
        id="admin-refund-modal"
        style={{ maxWidth: '520px' }}
      >
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle" style={{ color: isFullRefund ? '#10b981' : '#f59e0b' }}>
              Management Refund Verification
            </p>
            <h3>Verify & Confirm {isFullRefund ? 'Full Refund (100%)' : 'Half Refund (50%)'}</h3>
          </div>
          <button type="button" className="close-btn" id="close-refund-modal-btn" onClick={onClose}>×</button>
        </div>

        <div className="cancel-modal-body" style={{ marginTop: '1rem' }}>
          <div
            className="booking-summary-pill"
            style={{
              background: isFullRefund ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isFullRefund ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            }}
          >
            <div className="summary-left">
              <strong>{booking.name || booking.facilityName || 'Facility'}</strong>
              <span>Booking #{booking.id} · Customer: <b>{booking.customerName}</b></span>
              <small style={{ color: '#64748b' }}>Contact: {booking.contactNumber || 'N/A'}</small>
            </div>
            <div className="summary-right" style={{ textAlign: 'right' }}>
              <span className="price-tag" style={{ color: isFullRefund ? '#10b981' : '#d97706', fontSize: '1.15rem', fontWeight: 800 }}>
                LKR {refundAmt}
              </span>
              <span
                className="notice-pill"
                style={{
                  background: isFullRefund ? '#10b98120' : '#f59e0b20',
                  color: isFullRefund ? '#047857' : '#92400e',
                  fontWeight: 700,
                }}
              >
                {isFullRefund ? '🟢 Full 100% Refund' : '🟡 Half 50% Refund'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--card-bg, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Original Amount:</span>
              <strong>LKR {Number(booking.totalAmount || 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Payment Method:</span>
              <strong>{booking.paymentMethod || 'Bank Transfer'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Cancellation Reason:</span>
              <span style={{ maxWidth: '60%', textAlign: 'right' }}>{booking.cancellationReason || 'Member requested cancellation.'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Current Status:</span>
              <span className="status pending" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>To Refund (Pending Verification)</span>
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Refund Notes / Transaction Reference (Optional)</span>
            <input
              type="text"
              id="admin-refund-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank slip transfer TRX-99238, cash refund at reception, etc."
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '10px 12px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1.2rem', gap: '10px' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              id="admin-confirm-refund-submit-btn"
              onClick={handleConfirm}
              disabled={loading}
              style={{ backgroundColor: isFullRefund ? '#10b981' : '#f59e0b', borderColor: isFullRefund ? '#10b981' : '#f59e0b', color: '#fff' }}
            >
              {loading ? 'Confirming...' : `Confirm & Release ${isFullRefund ? 'Full' : 'Half'} Refund (LKR ${refundAmt})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
