import { useState } from 'react'

export default function EditFacilityModal({
  isOpen,
  isNew,
  facility,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(() => ({
    name: facility?.name || '',
    type: facility?.type || 'Badminton',
    hourlyRate: facility?.hourlyRate || '',
    description: facility?.description || '',
    isAvailable: facility?.isAvailable !== undefined ? facility.isAvailable : true,
    faq: Array.isArray(facility?.faq) ? facility.faq : [],
    images: Array.isArray(facility?.images) ? facility.images : [],
  }))

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  if (!isOpen) return null

  const sportCategories = [
    { label: 'Badminton', icon: '🏸' },
    { label: 'Cricket', icon: '🏏' },
    { label: 'Football', icon: '⚽' },
    { label: 'Basketball', icon: '🏀' },
    { label: 'Swimming', icon: '🏊' },
    { label: 'Tennis', icon: '🎾' },
    { label: 'Fitness', icon: '🏋️' },
    { label: 'Other', icon: '🏟️' },
  ]

  const handleAddFaq = () => {
    setForm((curr) => ({
      ...curr,
      faq: [...curr.faq, { question: '', answer: '' }],
    }))
  }

  const handleUpdateFaq = (index, field, value) => {
    setForm((curr) => ({
      ...curr,
      faq: curr.faq.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }))
  }

  const handleRemoveFaq = (index) => {
    setForm((curr) => ({
      ...curr,
      faq: curr.faq.filter((_, idx) => idx !== index),
    }))
  }

  const handleAddImages = (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    // Cap total images at 6
    const availableSlots = 6 - form.images.length
    if (availableSlots <= 0) {
      alert('Maximum 6 facility photos allowed.')
      return
    }

    const filesToRead = files.slice(0, availableSlots)
    filesToRead.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setForm((curr) => ({
          ...curr,
          images: [...curr.images, String(reader.result)],
        }))
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  const handleRemoveImage = (index) => {
    setForm((curr) => ({
      ...curr,
      images: curr.images.filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback('')
    if (!form.name.trim()) {
      setFeedback('Facility name is required.')
      return
    }
    if (!form.hourlyRate || Number(form.hourlyRate) <= 0) {
      setFeedback('Please specify a valid hourly rate (LKR).')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setFeedback(err?.message || 'Failed to save facility.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="facility-modal-backdrop" onClick={onClose}>
      <div
        className="facility-awesome-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="facility-modal-title"
      >
        {/* Header */}
        <div className="facility-modal-header">
          <div className="facility-modal-title-wrap">
            <div className="facility-modal-eyebrow">
              <span className="hub-pulse-dot" />
              <span>FACILITY SPECIFICATIONS & OPERATIONS</span>
            </div>
            <h2 id="facility-modal-title" className="facility-modal-heading">
              {isNew ? 'Add Sports Facility' : `Edit ${form.name || 'Facility'}`}
            </h2>
            <p className="facility-modal-sub">
              Define court specifications, hourly pricing, player FAQs, and showcase photography.
            </p>
          </div>

          <button
            type="button"
            className="facility-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alert if error */}
        {feedback && (
          <div className="facility-modal-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="facility-modal-form">
          {/* 1. Live Availability Switch Card */}
          <div className="facility-toggle-card">
            <div className="toggle-card-info">
              <span className="toggle-card-title">Booking Availability Status</span>
              <p className="toggle-card-desc">
                When enabled, members can immediately select slots and reserve this facility.
              </p>
            </div>

            <div className="toggle-control-group">
              <span className={`toggle-status-pill ${form.isAvailable ? 'available' : 'maintenance'}`}>
                {form.isAvailable ? '🟢 Open & Bookable' : '🔴 Maintenance / Closed'}
              </span>

              <label className="facility-switch-label">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm((c) => ({ ...c, isAvailable: e.target.checked }))}
                />
                <span className="facility-switch-slider" />
              </label>
            </div>
          </div>

          {/* 2. Basic Info (Name, Sport Category, Hourly Rate) */}
          <div className="facility-form-row two-col">
            <label className="facility-field">
              <span className="field-label">Facility Name *</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. Center Court Badminton Arena"
                className="facility-input"
              />
            </label>

            <label className="facility-field">
              <span className="field-label">Sport Category *</span>
              <select
                value={form.type}
                onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
                className="facility-select"
              >
                {sportCategories.map((cat) => (
                  <option key={cat.label} value={cat.label}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="facility-form-row">
            <label className="facility-field">
              <span className="field-label">Hourly Rental Rate (LKR) *</span>
              <div className="facility-rate-input-wrap">
                <span className="rate-prefix">LKR</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="50"
                  value={form.hourlyRate}
                  onChange={(e) => setForm((c) => ({ ...c, hourlyRate: e.target.value }))}
                  placeholder="e.g. 3500"
                  className="facility-input rate-input"
                />
                <span className="rate-suffix">/ hour</span>
              </div>
            </label>
          </div>

          {/* 3. Description */}
          <label className="facility-field">
            <span className="field-label">Description & Court Specifications</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Describe flooring (e.g. BWF synthetic, hardwood), tournament lighting, climate control, locker rooms..."
              className="facility-textarea"
            />
          </label>

          {/* 4. Photo Gallery Showcase */}
          <div className="facility-section-block">
            <div className="section-block-header">
              <div>
                <span className="section-title">Facility Photos ({form.images.length}/6)</span>
                <span className="section-sub">Add high-resolution court photos to attract bookings.</span>
              </div>
            </div>

            {/* Photo Preview Grid */}
            <div className="facility-photos-grid">
              {form.images.map((img, idx) => (
                <div key={idx} className="facility-photo-thumb-card">
                  <img src={img} alt={`Facility view ${idx + 1}`} />
                  <button
                    type="button"
                    className="facility-photo-delete-btn"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {form.images.length < 6 && (
                <label className="facility-photo-upload-tile">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImages}
                    style={{ display: 'none' }}
                  />
                  <span className="tile-icon">📷</span>
                  <span className="tile-text">+ Add Photo</span>
                  <span className="tile-sub">JPG, PNG or WEBP</span>
                </label>
              )}
            </div>
          </div>

          {/* 5. Frequently Asked Questions (FAQ) */}
          <div className="facility-section-block">
            <div className="section-block-header">
              <div>
                <span className="section-title">Player FAQ & Court Guidance</span>
                <span className="section-sub">Provide answers to equipment rental, non-marking shoes, rules.</span>
              </div>

              <button
                type="button"
                className="facility-btn-add-faq"
                onClick={handleAddFaq}
              >
                + Add FAQ
              </button>
            </div>

            {form.faq.length === 0 ? (
              <div className="facility-faq-empty">
                <span>No FAQ entries added yet. Click "+ Add FAQ" to guide players.</span>
              </div>
            ) : (
              <div className="facility-faq-list">
                {form.faq.map((item, idx) => (
                  <div key={idx} className="facility-faq-item-card">
                    <div className="faq-item-top">
                      <span className="faq-num">Q{idx + 1}</span>
                      <button
                        type="button"
                        className="faq-delete-btn"
                        onClick={() => handleRemoveFaq(idx)}
                        title="Delete this FAQ"
                      >
                        ✕
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Are non-marking badminton shoes strictly required?"
                      value={item.question}
                      onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                      className="facility-input faq-question-input"
                    />

                    <textarea
                      rows={2}
                      placeholder="e.g. Yes, gum-rubber non-marking court shoes are required to protect the tournament hardwood surface."
                      value={item.answer}
                      onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                      className="facility-textarea faq-answer-input"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="facility-modal-footer">
            <button
              type="button"
              className="facility-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="facility-btn-save"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="facility-btn-spinner" />
                  <span>Saving Facility...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>{isNew ? 'Create Facility' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
