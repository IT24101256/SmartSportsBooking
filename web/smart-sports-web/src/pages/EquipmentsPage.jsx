import { useState, useMemo, useEffect } from 'react'

export default function EquipmentsPage({
  apiBaseUrl,
  token,
  facilities = [],
  currentUser,
  sportCategories = [],
}) {
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSport, setSelectedSport] = useState('All')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)
  const [form, setForm] = useState({
    name: '',
    sportCategory: '',
    hourlyRate: 250,
    totalStock: 10,
    description: '',
    isAvailable: true,
  })
  const [saving, setSaving] = useState(false)
  const [modalFeedback, setModalFeedback] = useState('')
  const defaultSportCategories = ['Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball']
  const availableSportCategories = useMemo(() => (
    [...defaultSportCategories, ...sportCategories.map((category) => typeof category === 'string' ? category : category.name)]
      .filter(Boolean)
      .filter((category, index, categories) => categories.indexOf(category) === index)
  ), [sportCategories])
  const sportCategoryOptions = ['All', ...availableSportCategories]

  const fetchEquipments = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBaseUrl}/equipments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to load equipment catalog.')
      const data = await res.json()
      setEquipments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Error connecting to equipment service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipments()
  }, [apiBaseUrl, token])

  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const matchesSport =
        selectedSport === 'All' ||
        eq.sportCategory?.toLowerCase() === selectedSport.toLowerCase()

      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        eq.name?.toLowerCase().includes(q) ||
        eq.sportCategory?.toLowerCase().includes(q) ||
        eq.description?.toLowerCase().includes(q) ||
        eq.facilityName?.toLowerCase().includes(q)

      return matchesSport && matchesSearch
    })
  }, [equipments, selectedSport, searchQuery])

  // KPIs
  const totalItems = equipments.length
  const sportsCovered = useMemo(() => {
    const set = new Set(equipments.map((e) => e.sportCategory).filter(Boolean))
    return set.size
  }, [equipments])

  const avgRate = useMemo(() => {
    if (!equipments.length) return 0
    const sum = equipments.reduce((acc, e) => acc + (Number(e.hourlyRate) || 0), 0)
    return Math.round(sum / equipments.length)
  }, [equipments])

  const totalStockUnits = useMemo(() => {
    return equipments.reduce((acc, e) => acc + (parseInt(e.totalStock, 10) || 0), 0)
  }, [equipments])

  const handleOpenAdd = () => {
    setEditingEquipment(null)
    setForm({
      name: '',
      sportCategory: selectedSport !== 'All' ? selectedSport : 'Badminton',
      hourlyRate: 250,
      totalStock: 15,
      description: '',
      isAvailable: true,
    })
    setModalFeedback('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (eq) => {
    setEditingEquipment(eq)
    setForm({
      name: eq.name || '',
      sportCategory: eq.sportCategory || 'Badminton',
      hourlyRate: eq.hourlyRate || 0,
      totalStock: eq.totalStock || 10,
      description: eq.description || '',
      isAvailable: eq.isAvailable !== false,
    })
    setModalFeedback('')
    setIsModalOpen(true)
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from equipment registry?`)) {
      return
    }

    try {
      const res = await fetch(`${apiBaseUrl}/equipments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete equipment item.')
      setEquipments((curr) => curr.filter((e) => e.id !== id))
    } catch (err) {
      alert(err.message || 'Error deleting equipment.')
    }
  }

  const handleModalSubmit = async (e) => {
    e.preventDefault()
    setModalFeedback('')

    if (!form.name.trim()) {
      setModalFeedback('Equipment name is required.')
      return
    }

    if (Number(form.hourlyRate) < 0) {
      setModalFeedback('Hourly rate cannot be negative.')
      return
    }

    setSaving(true)
    try {
      const url = editingEquipment
        ? `${apiBaseUrl}/equipments/${editingEquipment.id}`
        : `${apiBaseUrl}/equipments`

      const method = editingEquipment ? 'PUT' : 'POST'
      const payload = {
        name: form.name.trim(),
        sportCategory: form.sportCategory.trim(),
        hourlyRate: Number(form.hourlyRate) || 0,
        totalStock: Math.max(0, parseInt(form.totalStock, 10) || 0),
        description: form.description.trim() || null,
        isAvailable: form.isAvailable,
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to save equipment.')
      }

      const savedItem = await res.json().catch(() => null)
      await fetchEquipments()
      setIsModalOpen(false)
    } catch (err) {
      setModalFeedback(err.message || 'An error occurred while saving equipment.')
    } finally {
      setSaving(false)
    }
  }

  const getSportIcon = (sport = '') => {
    return '🏅'
  }

  return (
    <div className="equipments-page-wrapper">
      {/* 1. HERO & COMMAND HEADER */}
      <section className="equipments-hero-card">
        <div className="equip-hero-header">
          <div className="equip-hero-info">
            <div className="equip-badge-pill">
              <span className="hub-pulse-dot" />
              <span>SPORTS GEAR & HOURLY PRICING REGISTRY • ADMIN ONLY</span>
            </div>
            <h1 className="equip-hero-title">Equipment Inventory & Hourly Rates</h1>
            <p className="equip-hero-sub">
              Define and price sports equipment by discipline. Equipments registered here automatically sync
              into facility creation, member bookings, and on-site desk rentals.
            </p>
          </div>

          <button
            type="button"
            className="primary-btn equip-add-hero-btn"
            onClick={handleOpenAdd}
          >
            <span className="plus-icon">➕</span> Add New Equipment
          </button>
        </div>

        {/* 2. STATS KPI GRID */}
        <div className="equip-kpi-grid">
          <div className="equip-kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
              🎒
            </div>
            <div className="kpi-text">
              <span className="kpi-label">TOTAL EQUIPMENT TYPES</span>
              <strong className="kpi-val">{totalItems}</strong>
              <span className="kpi-sub">Master catalog items</span>
            </div>
          </div>

          <div className="equip-kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              🏟️
            </div>
            <div className="kpi-text">
              <span className="kpi-label">SPORTS DISCIPLINES</span>
              <strong className="kpi-val">{sportsCovered} Sports</strong>
              <span className="kpi-sub">Badminton, Cricket, etc.</span>
            </div>
          </div>

          <div className="equip-kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
              💰
            </div>
            <div className="kpi-text">
              <span className="kpi-label">AVG HOURLY RATE</span>
              <strong className="kpi-val">LKR {avgRate.toLocaleString()}</strong>
              <span className="kpi-sub">Per hour rental rate</span>
            </div>
          </div>

          <div className="equip-kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              📦
            </div>
            <div className="kpi-text">
              <span className="kpi-label">INVENTORY UNITS</span>
              <strong className="kpi-val">{totalStockUnits.toLocaleString()}</strong>
              <span className="kpi-sub">Total gear in storage</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONTROLS & FILTER BAR */}
      <section className="equip-filter-section">
        {/* Sport Pills */}
        <div className="equip-sports-pills-bar">
          {sportCategoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              className={`sport-pill-btn ${selectedSport === category ? 'active' : ''}`}
              onClick={() => setSelectedSport(category)}
            >
              <span className="pill-icon">{category === 'All' ? '⚡' : '🏅'}</span>
              <span className="pill-text">{category}</span>
              {category === 'All' ? (
                <span className="pill-count">{equipments.length}</span>
              ) : (
                <span className="pill-count">
                  {equipments.filter((e) => e.sportCategory?.toLowerCase() === category.toLowerCase()).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Actions Bar */}
        <div className="equip-search-bar-row">
          <div className="equip-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by equipment name, sport category, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="equip-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="equip-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <span className="equip-count-tag">
            Showing <strong>{filteredEquipments.length}</strong> of {equipments.length} items
          </span>
        </div>
      </section>

      {/* 4. MAIN EQUIPMENT CARDS GRID */}
      <section className="equip-cards-container">
        {loading ? (
          <div className="equip-loading-state">
            <span className="ledger-spinner" />
            <span>Loading equipment catalog...</span>
          </div>
        ) : error ? (
          <div className="equip-error-state">
            <p>⚠️ {error}</p>
            <button type="button" className="secondary-btn" onClick={fetchEquipments}>
              Retry Loading
            </button>
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="equip-empty-card">
            <span className="empty-emoji">🎒</span>
            <h3>No Equipment Found</h3>
            <p>
              {searchQuery
                ? `No sports gear matches your search "${searchQuery}".`
                : `No equipment registered under ${selectedSport}. Click "+ Add New Equipment" to add items.`}
            </p>
            <button type="button" className="primary-btn" onClick={handleOpenAdd}>
              + Add Equipment for {selectedSport === 'All' ? 'Sports' : selectedSport}
            </button>
          </div>
        ) : (
          <div className="equip-grid">
            {filteredEquipments.map((eq) => (
              <div key={eq.id} className="equip-item-card">
                {/* Top strip */}
                <div className="card-top-strip">
                  <span className="sport-tag-badge">
                    <span className="sport-emoji">{getSportIcon(eq.sportCategory)}</span>
                    <span>{eq.sportCategory}</span>
                  </span>

                  <span className={`status-pill ${eq.isAvailable ? 'available' : 'maintenance'}`}>
                    {eq.isAvailable ? '🟢 In Stock' : '🔴 Unavailable'}
                  </span>
                </div>

                {/* Title & Desc */}
                <div className="card-body">
                  <h3 className="equip-item-name">{eq.name}</h3>
                  <p className="equip-item-desc">
                    {eq.description || `Tournament grade ${eq.sportCategory} gear available for player bookings.`}
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="card-meta-row">
                  <div className="meta-box rate-box">
                    <span className="meta-lbl">HOURLY RATE</span>
                    <strong className="rate-value">
                      LKR {Number(eq.hourlyRate).toLocaleString()} <span className="rate-unit">/ hr</span>
                    </strong>
                  </div>

                  <div className="meta-box stock-box">
                    <span className="meta-lbl">AVAILABLE STOCK</span>
                    <strong className="stock-value">
                      {eq.totalStock || 0} <span className="rate-unit">units</span>
                    </strong>
                  </div>
                </div>

                {/* Venue Link Indicator */}
                <div className="card-venue-link">
                  <span className="venue-link-icon">🏟️</span>
                  <span className="venue-link-text">
                    {eq.facilityName ? `Linked: ${eq.facilityName}` : `Universal for all ${eq.sportCategory} courts`}
                  </span>
                </div>

                {/* Card Actions */}
                <div className="card-actions-bar">
                  <button
                    type="button"
                    className="secondary-btn card-action-btn edit-btn"
                    onClick={() => handleOpenEdit(eq)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-btn card-action-btn danger-hover-btn delete-btn"
                    onClick={() => handleDelete(eq.id, eq.name)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. ADD / EDIT EQUIPMENT MODAL */}
      {isModalOpen && (
        <div className="facility-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="facility-awesome-modal equip-crud-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px' }}
          >
            {/* Modal Header */}
            <div className="facility-modal-header">
              <div className="facility-modal-title-wrap">
                <div className="facility-modal-eyebrow">
                  <span className="hub-pulse-dot" style={{ background: '#2563eb' }} />
                  <span>ADMIN EQUIPMENT REGISTRY</span>
                </div>
                <h2 className="facility-modal-heading">
                  {editingEquipment ? `Edit: ${editingEquipment.name}` : 'Add New Sports Equipment'}
                </h2>
                <p className="facility-modal-sub">
                  Define equipment item, assign its sport discipline, and set its hourly rental price.
                </p>
              </div>

              <button
                type="button"
                className="facility-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalFeedback && (
              <div className="facility-modal-alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{modalFeedback}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="facility-modal-form">
              {/* Equipment Name */}
              <label className="facility-field">
                <span className="field-label">Equipment Name *</span>
                <input
                  type="text"
                  className="facility-input"
                  placeholder="e.g. Yonex Carbon Rackets (Pair), Kashmir Willow Bat..."
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
              </label>

              {/* Sport Category & Linked Venue */}
              <div className="form-double-col">
                <label className="facility-field">
                  <span className="field-label">Sport Category *</span>
                  <select
                    className="facility-select"
                    value={form.sportCategory}
                    onChange={(e) => setForm((c) => ({ ...c, sportCategory: e.target.value }))}
                    required
                  >
                    {availableSportCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Pricing & Stock */}
              <div className="form-double-col">
                <label className="facility-field">
                  <span className="field-label">Hourly Rental Rate (LKR / hr) *</span>
                  <div className="equip-rate-input-wrap">
                    <span className="rate-prefix">LKR</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      className="facility-input rate-input"
                      placeholder="e.g. 300"
                      value={form.hourlyRate}
                      onChange={(e) => setForm((c) => ({ ...c, hourlyRate: e.target.value }))}
                      required
                    />
                  </div>
                </label>

                <label className="facility-field">
                  <span className="field-label">Total Stock Units In Inventory *</span>
                  <input
                    type="number"
                    min="0"
                    className="facility-input"
                    placeholder="e.g. 20"
                    value={form.totalStock}
                    onChange={(e) => setForm((c) => ({ ...c, totalStock: e.target.value }))}
                    required
                  />
                </label>
              </div>

              {/* Description */}
              <label className="facility-field">
                <span className="field-label">Description & Specification (Optional)</span>
                <textarea
                  rows="2"
                  className="facility-textarea"
                  placeholder="e.g. BWF certified high tension graphite rackets with padded carrying case..."
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                />
              </label>

              {/* Availability Toggle Card */}
              <div className="facility-toggle-card">
                <div className="toggle-card-info">
                  <span className="toggle-card-title">Inventory Availability</span>
                  <p className="toggle-card-desc">
                    When enabled, managers and admins can add this equipment to bookings.
                  </p>
                </div>
                <label className="facility-switch-label">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm((c) => ({ ...c, isAvailable: e.target.checked }))}
                  />
                  <span className="facility-switch-slider" />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="facility-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                  style={{ minWidth: '160px' }}
                >
                  {saving ? 'Saving...' : editingEquipment ? '✓ Update Equipment' : '+ Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
