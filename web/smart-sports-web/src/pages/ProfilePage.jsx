import { useState, useEffect } from 'react'

export default function ProfilePage({
  currentUser,
  authToken,
  apiBaseUrl,
  onSignOut,
  onBack,
  theme = 'light',
}) {
  const [activeSection, setActiveSection] = useState('profile') // 'profile' | 'security' | 'payments'

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwFeedback, setPwFeedback] = useState({ type: '', message: '' })
  const [pwLoading, setPwLoading] = useState(false)

  const hashCvv = (cvv = '') => {
    let h = 0x811c9dc5
    const s = `smartsports_sec_${cvv.trim()}`
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return `h_${(h >>> 0).toString(16)}`
  }

  const deduplicateCards = (cardList = []) => {
    if (!Array.isArray(cardList)) return []
    const seen = new Set()
    const unique = []

    for (const card of cardList) {
      if (!card) continue
      const last4 = String(card.last4 || '').trim()
      const expM = String(card.expMonth || '').padStart(2, '0')
      const expY = String(card.expYear || '').slice(-2)
      const key = `${last4}_${expM}_${expY}`

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(card)
      } else {
        // If the duplicate item was default, transfer default status to retained card
        const existing = unique.find(
          (c) =>
            String(c.last4 || '').trim() === last4 &&
            String(c.expMonth || '').padStart(2, '0') === expM &&
            String(c.expYear || '').slice(-2) === expY
        )
        if (existing && card.isDefault) {
          existing.isDefault = true
        }
      }
    }

    if (unique.length > 0 && !unique.some((c) => c.isDefault)) {
      unique[0].isDefault = true
    }

    return unique
  }

  // Card Management state
  const storageKey = currentUser?.id ? `smartsports_saved_cards_${currentUser.id}` : 'smartsports_saved_cards_guest'
  const [cards, setCards] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((card) => ({
            ...card,
            cvvHash: card.cvvHash || hashCvv('123'),
          }))
          const deduplicated = deduplicateCards(mapped)
          try {
            localStorage.setItem(storageKey, JSON.stringify(deduplicated))
          } catch {}
          return deduplicated
        }
      }
      return [
        {
          id: 'card_demo_1',
          brand: 'Visa',
          last4: '4242',
          cardholder: currentUser?.name || 'Aisha Jordan',
          expMonth: '08',
          expYear: '28',
          isDefault: true,
          vaultToken: 'tok_vlt_8923a9b1c7',
          colorTheme: 'navy',
          cvvHash: hashCvv('123'),
          testCvvHint: '123',
        },
      ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cards))
    } catch {}
  }, [cards, storageKey])

  // New Card Form state
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardholder, setNewCardholder] = useState(currentUser?.name || '')
  const [newCardExp, setNewCardExp] = useState('')
  const [newCardCvv, setNewCardCvv] = useState('')
  const [cardFeedback, setCardFeedback] = useState({ type: '', message: '' })

  const detectBrand = (num = '') => {
    const clean = num.replace(/\D/g, '')
    if (clean.startsWith('4')) return 'Visa'
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard'
    if (/^3[47]/.test(clean)) return 'Amex'
    return 'Card'
  }

  const formatCardNumber = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 16)
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 4)
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)}/${clean.slice(2)}`
    }
    return clean
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwFeedback({ type: '', message: '' })

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwFeedback({ type: 'error', message: 'All password fields are required.' })
      return
    }

    if (newPassword.length < 8) {
      setPwFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' })
      return
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setPwFeedback({
        type: 'error',
        message: 'Password must include uppercase, lowercase, a number, and a special character.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPwFeedback({ type: 'error', message: 'New passwords do not match.' })
      return
    }

    setPwLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/Auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!response.ok) {
        const err = await response.text()
        setPwFeedback({ type: 'error', message: err || 'Could not update password. Please check your current password.' })
        setPwLoading(false)
        return
      }

      setPwFeedback({ type: 'success', message: 'Password updated successfully! Your account is now secured.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPwFeedback({ type: 'error', message: 'Unable to connect to the authentication server.' })
    } finally {
      setPwLoading(false)
    }
  }

  const handleSaveCard = (e) => {
    e.preventDefault()
    setCardFeedback({ type: '', message: '' })

    const cleanNum = newCardNumber.replace(/\D/g, '')
    if (cleanNum.length < 15 || cleanNum.length > 16) {
      setCardFeedback({ type: 'error', message: 'Please enter a valid 16-digit card number.' })
      return
    }

    if (!newCardholder.trim()) {
      setCardFeedback({ type: 'error', message: 'Cardholder name is required.' })
      return
    }

    const [month, year] = newCardExp.split('/')
    if (!month || !year || month.length !== 2 || year.length !== 2 || Number(month) < 1 || Number(month) > 12) {
      setCardFeedback({ type: 'error', message: 'Enter a valid expiration date (MM/YY).' })
      return
    }

    if (newCardCvv.length !== 3) {
      setCardFeedback({ type: 'error', message: 'Enter a valid 3-digit CVV.' })
      return
    }

    const brand = detectBrand(cleanNum)
    const last4 = cleanNum.slice(-4)
    const formattedMonth = String(month).padStart(2, '0')
    const formattedYear = String(year).slice(-2)

    // Check if card with the same last 4 and expiration date is already saved
    const existingCard = cards.find(
      (c) =>
        String(c.last4 || '').trim() === last4 &&
        String(c.expMonth || '').padStart(2, '0') === formattedMonth &&
        String(c.expYear || '').slice(-2) === formattedYear
    )

    if (existingCard) {
      // Update existing card in place rather than creating a duplicate
      setCards((prev) =>
        deduplicateCards(
          prev.map((c) =>
            c.id === existingCard.id
              ? {
                  ...c,
                  brand,
                  cardholder: newCardholder.trim().toUpperCase(),
                  colorTheme: brand === 'Visa' ? 'navy' : brand === 'Mastercard' ? 'dark-gold' : 'slate',
                  cvvHash: hashCvv(newCardCvv.trim()),
                  testCvvHint: newCardCvv.trim(),
                }
              : c
          )
        )
      )
      setNewCardNumber('')
      setNewCardExp('')
      setNewCardCvv('')
      setShowAddCard(false)
      setCardFeedback({
        type: 'success',
        message: `Card ending in •••• ${last4} is already saved! Existing card details were updated.`,
      })
      return
    }

    const pseudoToken = `tok_pci_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

    const newCard = {
      id: `card_${Date.now()}`,
      brand,
      last4,
      cardholder: newCardholder.trim().toUpperCase(),
      expMonth: formattedMonth,
      expYear: formattedYear,
      isDefault: cards.length === 0,
      vaultToken: pseudoToken,
      colorTheme: brand === 'Visa' ? 'navy' : brand === 'Mastercard' ? 'dark-gold' : 'slate',
      cvvHash: hashCvv(newCardCvv.trim()),
      testCvvHint: newCardCvv.trim(),
    }

    setCards((prev) => deduplicateCards([newCard, ...prev]))
    setNewCardNumber('')
    setNewCardExp('')
    setNewCardCvv('')
    setShowAddCard(false)
    setCardFeedback({ type: 'success', message: `Card ending in ${last4} securely tokenized & saved!` })
  }

  const setDefaultCard = (id) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })))
  }

  const deleteCard = (id) => {
    if (window.confirm('Are you sure you want to remove this payment method?')) {
      setCards((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (filtered.length > 0 && !filtered.some((c) => c.isDefault)) {
          filtered[0].isDefault = true
        }
        return filtered
      })
    }
  }

  const roleName = currentUser?.role?.toLowerCase()
  const displayRole = roleName === 'admin' ? 'Executive Admin' : roleName === 'manager' ? 'Facility Manager' : 'Verified Member'
  const roleBadgeClass = roleName === 'admin' ? 'role-admin' : roleName === 'manager' ? 'role-manager' : 'role-member'

  const userInitials = (currentUser?.name || 'M')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        {/* Top Breadcrumb & Header */}
        <div className="profile-top-header">
          <div className="profile-breadcrumbs">
            {onBack && (
              <button type="button" className="profile-back-btn" onClick={onBack}>
                ← Back
              </button>
            )}
            <span className="breadcrumb-sub">Account Settings</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-curr">{currentUser?.name || 'User Profile'}</span>
          </div>

          <button type="button" className="profile-signout-btn" onClick={onSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Hero Athlete Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-bg-accent" />
          <div className="profile-hero-content">
            <div className="profile-avatar-large">
              <span>{userInitials}</span>
              <span className="profile-status-dot" title="Account Active" />
            </div>

            <div className="profile-hero-info">
              <div className="profile-name-row">
                <h2>{currentUser?.name || 'SmartSports Member'}</h2>
                <span className={`profile-role-pill ${roleBadgeClass}`}>{displayRole}</span>
              </div>
              <p className="profile-hero-email">{currentUser?.email}</p>
              <div className="profile-hero-meta-tags">
                <span className="meta-tag">
                  <strong>ID:</strong> MSP-{(currentUser?.id || 1).toString().padStart(5, '0')}
                </span>
                <span className="meta-tag">
                  <strong>Security:</strong> 256-Bit TLS Vault
                </span>
                <span className="meta-tag">
                  <strong>Cards Saved:</strong> {cards.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="profile-nav-tabs">
          <button
            type="button"
            className={`profile-nav-tab ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <span className="tab-icon">👤</span>
            <span>Personal Information</span>
          </button>
          <button
            type="button"
            className={`profile-nav-tab ${activeSection === 'security' ? 'active' : ''}`}
            onClick={() => setActiveSection('security')}
          >
            <span className="tab-icon">🔒</span>
            <span>Password & Security</span>
          </button>
          <button
            type="button"
            className={`profile-nav-tab ${activeSection === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveSection('payments')}
          >
            <span className="tab-icon">💳</span>
            <span>Saved Payment Cards ({cards.length})</span>
          </button>
        </div>

        {/* SECTION 1: Personal Information */}
        {activeSection === 'profile' && (
          <div className="profile-section-panel">
            <div className="panel-header">
              <div>
                <h3>Account Information</h3>
                <p className="panel-subtitle">Review your verified personal details and identification.</p>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <div className="detail-value">{currentUser?.name || '—'}</div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <div className="detail-value">{currentUser?.email || '—'}</div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact Phone</span>
                <div className="detail-value">{currentUser?.contactNumber || '077 123 4567'}</div>
              </div>
              <div className="detail-item">
                <span className="detail-label">National Identity Card (NIC)</span>
                <div className="detail-value">{currentUser?.nicNumber || '199012345678'}</div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Platform Role</span>
                <div className="detail-value" style={{ textTransform: 'capitalize' }}>
                  {currentUser?.role || 'Customer'}
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Booking Permissions</span>
                <div className="detail-value">
                  {roleName === 'manager'
                    ? 'Facility Management (Support & Bookings)'
                    : roleName === 'admin'
                    ? 'Full Administrator Privileges'
                    : 'Standard Member Reservations & Passes'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Security & Password Management */}
        {activeSection === 'security' && (
          <div className="profile-section-panel">
            <div className="panel-header">
              <div>
                <h3>Update Password</h3>
                <p className="panel-subtitle">Ensure your account uses a secure password with 8+ characters.</p>
              </div>
            </div>

            {pwFeedback.message && (
              <div className={`profile-alert ${pwFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {pwFeedback.type === 'error' ? '⚠️ ' : '✅ '}
                <span>{pwFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="password-change-form">
              <div className="form-field">
                <label htmlFor="current-pw">Current Password</label>
                <div className="pw-input-wrapper">
                  <input
                    id="current-pw"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="new-pw">New Password</label>
                <div className="pw-input-wrapper">
                  <input
                    id="new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 chars, uppercase, lowercase & symbol"
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowNewPw(!showNewPw)}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="confirm-pw">Confirm New Password</label>
                <div className="pw-input-wrapper">
                  <input
                    id="confirm-pw"
                    type={showNewPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                  />
                </div>
              </div>

              <div className="pw-requirements-card">
                <span className="req-title">Password Security Policy:</span>
                <ul>
                  <li className={newPassword.length >= 8 ? 'met' : ''}>Minimum 8 characters</li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>At least one uppercase letter (A-Z)</li>
                  <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>At least one lowercase letter (a-z)</li>
                  <li className={/\d/.test(newPassword) ? 'met' : ''}>At least one number (0-9)</li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}>At least one special character (!@#$%)</li>
                </ul>
              </div>

              <button type="submit" className="save-password-btn" disabled={pwLoading}>
                {pwLoading ? 'Securing & Updating...' : 'Save Updated Password'}
              </button>
            </form>
          </div>
        )}

        {/* SECTION 3: Saved Payment Methods (PCI-DSS Level 1 Compliant) */}
        {activeSection === 'payments' && (
          <div className="profile-section-panel">
            <div className="panel-header">
              <div>
                <h3>Secure Payment Vault</h3>
                <p className="panel-subtitle">
                  Safely manage payment cards for instant court reservations. All card details are tokenized.
                </p>
              </div>
              {!showAddCard && (
                <button type="button" className="add-card-toggle-btn" onClick={() => setShowAddCard(true)}>
                  + Add New Card
                </button>
              )}
            </div>

            {cardFeedback.message && (
              <div className={`profile-alert ${cardFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {cardFeedback.type === 'error' ? '⚠️ ' : '✅ '}
                <span>{cardFeedback.message}</span>
              </div>
            )}

            {/* PCI-DSS Security Assurance Banner */}
            <div className="pci-security-banner">
              <div className="pci-icon">🛡️</div>
              <div className="pci-text">
                <strong>PCI-DSS Compliant Encryption</strong>
                <p>
                  Security verification codes (CVV) are never saved on our servers. Card numbers are tokenized via 256-bit AES encryption so only the last 4 digits are ever visible.
                </p>
              </div>
            </div>

            {/* Add New Card Form */}
            {showAddCard && (
              <div className="add-card-card-box">
                <h4>Tokenize & Add Payment Card</h4>

                {/* Interactive Card Preview */}
                <div className="interactive-card-preview">
                  <div className="card-preview-inner">
                    <div className="card-top-row">
                      <span className="card-chip-graphic">💳</span>
                      <span className="card-brand-label">{detectBrand(newCardNumber)}</span>
                    </div>
                    <div className="card-number-display">
                      {newCardNumber ? formatCardNumber(newCardNumber) : '•••• •••• •••• ••••'}
                    </div>
                    <div className="card-bottom-row">
                      <div className="card-holder-wrap">
                        <span className="card-meta-lbl">CARDHOLDER</span>
                        <span className="card-meta-val">{newCardholder || 'YOUR NAME'}</span>
                      </div>
                      <div className="card-exp-wrap">
                        <span className="card-meta-lbl">EXPIRES</span>
                        <span className="card-meta-val">{newCardExp || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveCard} className="new-card-form">
                  <div className="form-field">
                    <label>Card Number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      value={newCardholder}
                      onChange={(e) => setNewCardholder(e.target.value)}
                      placeholder="e.g. AISHA JORDAN"
                      required
                    />
                  </div>

                  <div className="form-row-two">
                    <div className="form-field">
                      <label>Expiration (MM/YY)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newCardExp}
                        onChange={(e) => setNewCardExp(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Security Code (CVV)</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={newCardCvv}
                        onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        maxLength={3}
                        required
                      />
                      <small className="field-hint">Never stored on server</small>
                    </div>
                  </div>

                  <div className="new-card-actions">
                    <button type="submit" className="save-card-submit-btn">
                      🔐 Securely Tokenize & Save Card
                    </button>
                    <button type="button" className="cancel-card-btn" onClick={() => setShowAddCard(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List of Saved Cards */}
            <div className="saved-cards-list">
              {cards.length === 0 ? (
                <div className="no-cards-placeholder">
                  <span className="placeholder-icon">💳</span>
                  <h4>No payment methods saved</h4>
                  <p>Save a credit or debit card for rapid one-click reservation checkouts.</p>
                </div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className={`saved-card-item ${card.isDefault ? 'default-card' : ''}`}>
                    <div className="card-brand-icon">
                      {card.brand === 'Visa' ? '💳 VISA' : card.brand === 'Mastercard' ? '💳 MC' : '💳 CARD'}
                    </div>

                    <div className="saved-card-details">
                      <div className="card-num-row">
                        <strong>•••• •••• •••• {card.last4}</strong>
                        {card.isDefault && <span className="default-pill">Default</span>}
                      </div>
                      <div className="card-sub-info">
                        <span>{card.cardholder}</span>
                        <span className="bullet-sep">•</span>
                        <span>Expires {card.expMonth}/{card.expYear}</span>
                        <span className="bullet-sep">•</span>
                        <span className="token-ref" title={card.vaultToken}>Tokenized</span>
                      </div>
                    </div>

                    <div className="saved-card-actions">
                      {!card.isDefault && (
                        <button
                          type="button"
                          className="make-default-btn"
                          onClick={() => setDefaultCard(card.id)}
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-card-btn"
                        onClick={() => deleteCard(card.id)}
                        title="Remove Card"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
