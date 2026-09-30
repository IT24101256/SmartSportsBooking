import { useState, useMemo } from 'react'

export default function MembersPage({ members = [] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [copiedEmail, setCopiedEmail] = useState('')

  // Copy email helper
  const handleCopyEmail = (email) => {
    if (!email) return
    navigator.clipboard?.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(''), 2000)
  }

  // Derive stats
  const totalCount = members.length
  const adminCount = members.filter((m) => {
    const r = (m.role || '').toLowerCase()
    return r === 'admin' || r === 'manager'
  }).length
  const regularCount = totalCount - adminCount

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        (member.name || '').toLowerCase().includes(q) ||
        (member.email || '').toLowerCase().includes(q) ||
        (member.contactNumber || '').toLowerCase().includes(q) ||
        (member.nicNumber || '').toLowerCase().includes(q)

      const roleStr = (member.role || '').toLowerCase()
      const matchesRole =
        roleFilter === 'All' ||
        (roleFilter === 'Admin' && (roleStr === 'admin' || roleStr === 'manager')) ||
        (roleFilter === 'Member' && roleStr !== 'admin' && roleStr !== 'manager')

      return matchesSearch && matchesRole
    })
  }, [members, search, roleFilter])

  return (
    <div className="members-directory-wrapper">
      {/* 1. HERO HEADER */}
      <section className="members-hero-card">
        <div className="members-hero-content">
          <div className="members-badge-pill">
            <span className="hub-pulse-dot" />
            <span>ATHLETE & USER DIRECTORY</span>
            <span className="hub-badge-sep">•</span>
            <span>{totalCount} Registered Users</span>
          </div>

          <h1 className="members-hero-title">Member Directory & Access</h1>
          <p className="members-hero-subtitle">
            Manage athlete profiles, verify identity credentials (NIC/Contact), and oversee administrative permissions.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="members-stats-strip">
          <div className="member-stat-box">
            <span className="stat-label">TOTAL USERS</span>
            <strong className="stat-number">{totalCount}</strong>
          </div>
          <div className="member-stat-box">
            <span className="stat-label">ADMINISTRATORS</span>
            <strong className="stat-number highlight-amber">{adminCount}</strong>
          </div>
          <div className="member-stat-box">
            <span className="stat-label">ATHLETES / MEMBERS</span>
            <strong className="stat-number highlight-blue">{regularCount}</strong>
          </div>
          <div className="member-stat-box">
            <span className="stat-label">ACTIVE STATUS</span>
            <strong className="stat-number highlight-green">100%</strong>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <section className="members-filter-bar">
        {/* Search Input */}
        <div className="members-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search member name, email, contact, or NIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="members-search-input"
          />
          {search && (
            <button
              type="button"
              className="members-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="members-role-tabs">
          <button
            type="button"
            className={`role-tab-pill ${roleFilter === 'All' ? 'active' : ''}`}
            onClick={() => setRoleFilter('All')}
          >
            All Accounts ({totalCount})
          </button>
          <button
            type="button"
            className={`role-tab-pill ${roleFilter === 'Admin' ? 'active' : ''}`}
            onClick={() => setRoleFilter('Admin')}
          >
            🛡️ Admins ({adminCount})
          </button>
          <button
            type="button"
            className={`role-tab-pill ${roleFilter === 'Member' ? 'active' : ''}`}
            onClick={() => setRoleFilter('Member')}
          >
            🏅 Members ({regularCount})
          </button>
        </div>
      </section>

      {/* 3. MEMBER CARDS GRID */}
      {filteredMembers.length === 0 ? (
        <div className="members-empty-state">
          <div className="empty-avatar-icon">👥</div>
          <h3>No Members Found</h3>
          <p>
            {search
              ? `No registered members match "${search}".`
              : 'No members registered under this filter.'}
          </p>
          {search && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="members-cards-grid">
          {filteredMembers.map((member) => {
            const isAdm =
              (member.role || '').toLowerCase() === 'admin' ||
              (member.role || '').toLowerCase() === 'manager'

            const initials = member.name
              ? member.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'MB'

            return (
              <article key={member.id || member.email} className={`member-directory-card ${isAdm ? 'is-admin-card' : ''}`}>
                <div className="member-card-header">
                  {/* Avatar & Online Beacon */}
                  <div className="member-card-avatar-wrap">
                    <div className={`member-card-avatar ${isAdm ? 'admin-gradient' : 'member-gradient'}`}>
                      {initials}
                    </div>
                    <span className="member-card-online-dot" title="Active Account" />
                  </div>

                  {/* Role Badge */}
                  <div className="member-card-badges">
                    <span className={`member-card-role-badge ${isAdm ? 'badge-admin' : 'badge-member'}`}>
                      {isAdm ? '🛡️ Administrator' : '🏅 Club Member'}
                    </span>
                  </div>
                </div>

                {/* Member Identity Details */}
                <div className="member-card-body">
                  <h3 className="member-card-name" title={member.name}>
                    {member.name}
                  </h3>

                  {/* Email row with Copy Button */}
                  <div className="member-info-row">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span className="member-info-text email-text" title={member.email}>
                      {member.email}
                    </span>
                    <button
                      type="button"
                      className="copy-email-btn"
                      onClick={() => handleCopyEmail(member.email)}
                      title="Copy email to clipboard"
                    >
                      {copiedEmail === member.email ? '✓' : '⧉'}
                    </button>
                  </div>

                  {/* Phone / Contact if available */}
                  {member.contactNumber && (
                    <div className="member-info-row">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="member-info-text">{member.contactNumber}</span>
                    </div>
                  )}

                  {/* NIC if available */}
                  {member.nicNumber && (
                    <div className="member-info-row">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="7" y1="8" x2="17" y2="8" />
                        <line x1="7" y1="12" x2="13" y2="12" />
                      </svg>
                      <span className="member-info-text">NIC: {member.nicNumber}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer with Quick Contact action */}
                <div className="member-card-footer">
                  <div className="member-status-indicator">
                    <span className="status-beacon" />
                    <span>Active Member</span>
                  </div>

                  <a
                    href={`mailto:${member.email}`}
                    className="member-contact-link"
                    title={`Send email to ${member.name}`}
                  >
                    <span>Contact</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
