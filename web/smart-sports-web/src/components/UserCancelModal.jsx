import { useEffect, useState } from 'react'
import { calculateCancellationQuote, CANCELLATION_POLICY_RULES } from '../utils/cancellationPolicy'

export default function UserCancelModal({ booking, token, apiBaseUrl, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState(() => calculateCancellationQuote(booking))

  useEffect(() => {
    let isMounted = true
    const fetchServerQuote = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/bookings/${booking.id}/cancellation-quote`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (response.ok && isMounted) {
          const data = await response.json()
          setQuote((prev) => ({
            ...prev,
            hoursPrior: data.hoursPrior,
            refundPercentage: data.refundPercentage,
            refundAmount: data.refundAmount,
            refundStatus: data.refundStatus,
            policyTier: data.policyTier,
            policyExplanation: data.policyExplanation,
            isOutdoor: data.isOutdoorEligibleForRainCheck,
          }))
        }
      } catch {
        // Fall back to client calculation
      }
    }

    if (booking?.id) {
      fetchServerQuote()
    }

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, booking, token])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(booking, reason.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const isFullRefund = quote.refundPercentage === 100
  const isPartialRefund = quote.refundPercentage === 50
  const isNoRefund = quote.refundPercentage === 0

  return (
    <div className="booking-modal-backdrop" onClick={onClose} id="user-cancel-modal-backdrop">
      <div
        className="booking-modal cancel-policy-modal"
        onClick={(e) => e.stopPropagation()}
        id="user-cancel-modal"
        style={{ maxWidth: '580px' }}
      >
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle" style={{ color: '#ef4444' }}>SmartSports Cancellation & Refund</p>
            <h3>Cancel Booking #{booking.id}</h3>
          </div>
          <button type="button" className="close-btn" id="close-cancel-modal-btn" onClick={onClose}>×</button>
        </div>

        <div className="cancel-modal-body">
          <div className="booking-summary-pill">
            <div className="summary-left">
              <strong>{booking.name || booking.facilityName}</strong>
              <span>📅 {booking.date}</span>
            </div>
            <div className="summary-right">
              <span className="price-tag">Total: LKR {Number(booking.totalAmount || 0).toLocaleString()}</span>
              <span className="notice-pill">⏱️ ~{quote.hoursPrior} hrs until game</span>
            </div>
          </div>

          <div className="policy-tiers-container">
            <h4 className="policy-section-title">Applicable Refund Policy</h4>
            <div className="policy-tier-cards">
              {CANCELLATION_POLICY_RULES.slice(0, 3).map((rule) => {
                const isActive = rule.percentage === quote.refundPercentage
                return (
                  <div
                    key={rule.tier}
                    className={`policy-tier-card ${isActive ? 'tier-active' : ''}`}
                    style={isActive ? { borderColor: rule.color, backgroundColor: `${rule.color}10` } : {}}
                  >
                    <div className="tier-header">
                      <span className="tier-title" style={{ color: isActive ? rule.color : 'inherit' }}>
                        {rule.tier}
                      </span>
                      {isActive && <span className="tier-active-badge" style={{ backgroundColor: rule.color }}>Applied</span>}
                    </div>
                    <span className="tier-window">{rule.window}</span>
                    <p className="tier-desc">{rule.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            className={`refund-calculation-box ${
              isFullRefund ? 'full-refund-theme' : isPartialRefund ? 'partial-refund-theme' : 'no-refund-theme'
            }`}
          >
            <div className="calc-row">
              <span>Your Notice Window:</span>
              <strong>{quote.hoursPrior} hours prior to start</strong>
            </div>
            <div className="calc-row">
              <span>Refund Eligibility:</span>
              <strong style={{ color: isFullRefund ? '#10b981' : isPartialRefund ? '#f59e0b' : '#ef4444' }}>
                {quote.refundStatus} ({quote.refundPercentage}%)
              </strong>
            </div>
            <div className="calc-divider" />
            <div className="calc-row calc-total-row">
              <span>Refund to be credited:</span>
              <span className="calculated-refund-amount">
                LKR {Number(quote.refundAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {quote.isOutdoor && (
            <div className="outdoor-rain-notice">
              <span className="rain-icon">🌧️</span>
              <div>
                <strong>Outdoor Facility Rain-Check Note:</strong>
                <p>
                  If this session is impacted by heavy rain, management can offer a free rescheduling voucher instead of regular cancellation.
                </p>
              </div>
            </div>
          )}

          <label className="cancel-reason-label">
            <span>Reason for cancellation (optional)</span>
            <textarea
              id="user-cancel-reason-input"
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Change of schedule, personal conflict..."
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
            <button
              type="button"
              className="secondary-btn"
              id="user-keep-booking-btn"
              onClick={onClose}
              disabled={loading}
            >
              Keep Booking
            </button>
            <button
              type="button"
              className="primary-btn danger-btn"
              id="user-confirm-cancel-btn"
              onClick={handleConfirm}
              disabled={loading}
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
            >
              {loading
                ? 'Processing...'
                : `Confirm Cancellation (${
                    isNoRefund ? 'No Refund' : `LKR ${Number(quote.refundAmount).toLocaleString()} Refund`
                  })`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
