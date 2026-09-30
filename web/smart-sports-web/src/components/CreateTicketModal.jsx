import { useState } from 'react'

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const quickCategories = [
    { label: '⚡ Lighting & Power', text: 'Lighting adjustment on court' },
    { label: '📅 Reschedule Query', text: 'Reschedule request for upcoming match' },
    { label: '🎾 Nets & Equipment', text: 'Equipment inspection or net adjustment' },
    { label: '🛠️ Court Maintenance', text: 'Court surface cleaning or maintenance' },
    { label: '❓ General Assistance', text: 'General club concierge question' },
  ]

  const handleSelectQuickCategory = (item) => {
    if (!subject) {
      setSubject(item.text)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !detail.trim()) {
      setError('Please provide both a ticket subject and details.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        subject: subject.trim(),
        detail: detail.trim(),
        priority,
      })
      // Reset form
      setSubject('')
      setPriority('Medium')
      setDetail('')
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to submit ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div
        className="booking-modal awesome-modal create-ticket-awesome-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="awesome-modal-header">
          <div className="modal-title-group">
            <div className="modal-eyebrow-pill">
              <span className="live-dot" />
              <span>FACILITY CONCIERGE & OPERATIONS</span>
            </div>
            <h3 className="modal-headline">Create Support Ticket</h3>
            <p className="awesome-modal-subline">
              Our operations team responds to court lighting, rescheduling inquiries, and facility issues.
            </p>
          </div>

          <button
            type="button"
            className="awesome-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Quick Category Chips */}
        <div className="ticket-quick-categories">
          <span className="quick-cat-label">Suggested Topics:</span>
          <div className="quick-cat-pills">
            {quickCategories.map((cat, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-cat-pill"
                onClick={() => handleSelectQuickCategory(cat)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form className="awesome-modal-form" onSubmit={handleSubmit}>
          {error && <div className="awesome-form-error">{error}</div>}

          {/* Subject */}
          <div className="awesome-form-field">
            <label htmlFor="ticket-subject">
              <span className="field-label-text">Ticket Subject</span>
              <span className="field-required">*</span>
            </label>
            <div className="input-with-icon-wrap">
              <svg className="field-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <input
                id="ticket-subject"
                type="text"
                className="awesome-text-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Floodlight timer adjustment on Badminton Hall Court 2"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Segmented Priority Picker (Visual Cards) */}
          <div className="awesome-form-field">
            <label>
              <span className="field-label-text">Urgency & Priority</span>
            </label>
            <div className="priority-segmented-grid">
              {/* Low */}
              <button
                type="button"
                className={`priority-select-card priority-card-low ${priority === 'Low' ? 'active' : ''}`}
                onClick={() => setPriority('Low')}
              >
                <div className="priority-card-top">
                  <span className="priority-dot dot-low" />
                  <span className="priority-title">Low</span>
                </div>
                <span className="priority-hint">General question or club feedback</span>
              </button>

              {/* Medium */}
              <button
                type="button"
                className={`priority-select-card priority-card-medium ${priority === 'Medium' ? 'active' : ''}`}
                onClick={() => setPriority('Medium')}
              >
                <div className="priority-card-top">
                  <span className="priority-dot dot-medium" />
                  <span className="priority-title">Medium</span>
                </div>
                <span className="priority-hint">Standard assistance / reschedule inquiry</span>
              </button>

              {/* High */}
              <button
                type="button"
                className={`priority-select-card priority-card-high ${priority === 'High' ? 'active' : ''}`}
                onClick={() => setPriority('High')}
              >
                <div className="priority-card-top">
                  <span className="priority-dot dot-high pulse" />
                  <span className="priority-title">High</span>
                </div>
                <span className="priority-hint">Urgent issue during active match session</span>
              </button>
            </div>
          </div>

          {/* Details Textarea */}
          <div className="awesome-form-field">
            <div className="field-label-row">
              <label htmlFor="ticket-detail">
                <span className="field-label-text">Inquiry Details</span>
                <span className="field-required">*</span>
              </label>
              <span className="char-counter">{detail.length} / 1000</span>
            </div>
            <textarea
              id="ticket-detail"
              className="awesome-textarea"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Tell our facilities management team how we can assist you. Mention specific court numbers, booking IDs, or equipment requirements..."
              rows="4"
              maxLength="1000"
              required
            />
          </div>

          {/* Modal Actions */}
          <div className="awesome-modal-actions">
            <button
              type="button"
              className="awesome-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="awesome-submit-btn ticket-submit-cta"
              disabled={submitting || !subject.trim() || !detail.trim()}
            >
              {submitting ? (
                <span className="submit-spinner" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
