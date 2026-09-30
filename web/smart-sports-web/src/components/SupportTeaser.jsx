export default function SupportTeaser({ onContactSupport, onOpenSupportPage }) {
  return (
    <section className="support-teaser-section">
      <div className="support-teaser-card">
        <div className="support-teaser-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="support-teaser-text">
          <span className="section-eyebrow">CLUB ASSISTANCE</span>
          <h4 className="support-teaser-title">NEED HELP?</h4>
          <p className="support-teaser-desc">
            Something went wrong with your booking, reschedule, or lighting? Our facilities support team is ready to assist.
          </p>
        </div>
        <div className="support-teaser-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onContactSupport}
          >
            Create support ticket
          </button>
          {onOpenSupportPage && (
            <button
              type="button"
              className="ghost-card-btn"
              onClick={onOpenSupportPage}
            >
              View tickets
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
