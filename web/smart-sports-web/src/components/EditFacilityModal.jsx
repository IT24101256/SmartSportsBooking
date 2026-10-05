import { useState, useEffect, useMemo } from 'react'

export default function EditFacilityModal({
  isOpen,
  isNew,
  facility,
  onSave,
  onClose,
  sportCategories = [],
  apiBaseUrl = 'http://localhost:5187/api',
}) {
  const defaultSportCategories = ['Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball']
  const [availableSportCategories, setAvailableSportCategories] = useState(() => (
    [...defaultSportCategories, ...sportCategories]
      .filter((category, index, categories) => categories.indexOf(category) === index)
      .filter((category) => category !== 'Indoor' && category !== 'Outdoor')
  ))
  const parseEquipments = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            name: typeof item === 'object' ? item.name || '' : String(item),
            hourlyRate: typeof item === 'object' && item.hourlyRate !== undefined ? item.hourlyRate : '',
          }))
        }
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, hourlyRate: '' }))
      }
    }
    return []
  }

  const [form, setForm] = useState(() => ({
    name: facility?.name || '',
    sportCategory: facility?.sportCategory || facility?.type || defaultSportCategories[0],
    courtType: facility?.courtType || facility?.courtTag || 'Indoor',
    hourlyRate: facility?.hourlyRate || '',
    description: facility?.description || '',
    isAvailable: facility?.isAvailable !== undefined ? facility.isAvailable : true,
    faq: Array.isArray(facility?.faq) ? facility.faq : [],
    images: Array.isArray(facility?.images) ? facility.images : [],
  }))

  const [equipments, setEquipments] = useState(() => parseEquipments(facility?.equipmentsProvided))
  const [masterEquipments, setMasterEquipments] = useState([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let active = true
    const equipmentUrl = new URL(`${apiBaseUrl}/equipments`)
    if (facility?.id) equipmentUrl.searchParams.set('facilityId', facility.id)
    const assignedUrl = facility?.id ? `${apiBaseUrl}/Facilities/${facility.id}/equipment` : null
    Promise.all([
      fetch(equipmentUrl).then((res) => (res.ok ? res.json() : [])),
      assignedUrl ? fetch(assignedUrl).then((res) => (res.ok ? res.json() : [])) : Promise.resolve([]),
    ])
      .then(([data, assigned]) => {
        if (active && Array.isArray(data)) {
          const normalized = data.map((equipment) => ({
            ...equipment,
            sportCategory: equipment.sportCategory || equipment.sportCategoryName || equipment.category?.name || '',
          }))
          setMasterEquipments(normalized)
          if (!isNew && Array.isArray(assigned)) {
            setEquipments(assigned.map((equipment) => ({ id: equipment.id, name: equipment.name })))
          }
          // If this is a new facility and equipments list is empty, auto-populate with sport defaults
          if (isNew && (!equipments || equipments.length === 0)) {
            const curSport = (facility?.sportCategory || facility?.type || 'Indoor').toLowerCase()
            const matching = normalized.filter((eq) => {
              const eqSport = (eq.sportCategory || '').toLowerCase()
              return eqSport === curSport || curSport.includes(eqSport) || eqSport.includes(curSport)
            })
            if (matching.length > 0) {
              setEquipments(matching.map((m) => ({ id: m.id, name: m.name })))
            }
          }
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isOpen, apiBaseUrl, isNew, facility?.id])

  const sportMasterEquipments = useMemo(() => {
    const curType = (form.sportCategory || 'Indoor').toLowerCase()
    return masterEquipments.filter((eq) => {
      const eqSport = (eq.sportCategory || '').toLowerCase()
      return eqSport === curType || curType.includes(eqSport) || eqSport.includes(curType)
    })
  }, [masterEquipments, form.sportCategory])

  if (!isOpen) return null

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

    const cleanedEquipments = equipments
      .filter((eq) => eq.name.trim())
      .map((eq) => ({ id: eq.id, name: eq.name.trim() }))

    setSaving(true)
    try {
      await onSave({
        ...form,
        sportCategory: form.sportCategory.trim(),
        type: form.sportCategory.trim(),
        equipmentsProvided: JSON.stringify(cleanedEquipments),
      })
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

          {/* 2. Basic Info (Name, Sport Category, Court Type, Hourly Rate) */}
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

          <div className="facility-form-row two-col">
            <label className="facility-field">
              <span className="field-label">Sport Category *</span>
              <select
                value={form.sportCategory}
                onChange={(e) => setForm((c) => ({ ...c, sportCategory: e.target.value }))}
                className="facility-select"
              >
                {availableSportCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="facility-field">
              <span className="field-label">Court Type (Setting) *</span>
              <select
                value={form.courtType || 'Indoor'}
                onChange={(e) => setForm((c) => ({ ...c, courtType: e.target.value }))}
                className="facility-select"
              >
                <option value="Indoor">🏢 Indoor Court</option>
                <option value="Outdoor">🌳 Outdoor Court</option>
              </select>
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

          {/* 3.5 Equipments Provided */}
          <div className="facility-section-block">
            <div className="section-block-header">
              <div>
                <span className="section-title">Equipments Provided ({equipments.length})</span>
                <span className="section-sub">
                  Select equipment from the registry. Rental prices are managed on the Equipment page.
                </span>
              </div>

            </div>

            {/* Registry Quick Sync Selector */}
            {sportMasterEquipments.length > 0 && (
              <div className="equip-registry-quick-bar">
                <div className="registry-bar-header">
                  <span className="registry-bar-title">
                    🎯 Available from Sports Equipment Registry ({sportMasterEquipments.length} for {form.sportCategory}):
                  </span>
                  <button
                    type="button"
                    className="registry-bar-btn-all"
                    onClick={() => {
                      const existingNames = new Set(
                        equipments.map((e) => e.name.trim().toLowerCase())
                      )
                      const toAdd = sportMasterEquipments
                        .filter((me) => !existingNames.has(me.name.trim().toLowerCase()))
                        .map((me) => ({ id: me.id, name: me.name }))
                      setEquipments((curr) => [...curr, ...toAdd])
                    }}
                  >
                    ⚡ Attach All {form.sportCategory} Equipment
                  </button>
                </div>
                <div className="registry-pills-wrap">
                  {sportMasterEquipments.map((me) => {
                    const isAdded = equipments.some(
                      (e) => e.name.trim().toLowerCase() === me.name.trim().toLowerCase()
                    )
                    return (
                      <button
                        key={me.id}
                        type="button"
                        className={`registry-pill-toggle ${isAdded ? 'is-selected' : ''}`}
                        onClick={() => {
                          if (isAdded) {
                            setEquipments((curr) =>
                              curr.filter(
                                (e) =>
                                  e.name.trim().toLowerCase() !== me.name.trim().toLowerCase()
                              )
                            )
                          } else {
                            setEquipments((curr) => [
                              ...curr,
                              { id: me.id, name: me.name },
                            ])
                          }
                        }}
                      >
                        <span className="pill-check">{isAdded ? '✓ Added' : '+ Add'}</span>
                        <span className="pill-name">{me.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {equipments.length === 0 ? (
              <div className="facility-faq-empty">
                <span>No equipment selected for this facility.</span>
              </div>
            ) : (
              <div className="facility-equipment-builder-list">
                {equipments.map((eq, idx) => (
                  <div key={idx} className="facility-equipment-builder-row">
                    <span>{eq.name}</span>
                    <button
                      type="button"
                      className="facility-faq-delete-btn equip-delete-btn"
                      onClick={() => setEquipments((curr) => curr.filter((_, itemIndex) => itemIndex !== idx))}
                      title="Remove equipment item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
