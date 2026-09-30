export default function MemberReviewsSection({
  reviews = [],
  apiBaseUrl = '',
  currentUser,
  onEdit,
  onDelete,
}) {
  const canEdit = (review) => currentUser?.id === review.userId
  const canDelete = (review) => currentUser?.role === 'admin' || canEdit(review)
  const apiOrigin = apiBaseUrl ? apiBaseUrl.replace(/\/api\/?$/, '') : ''

  return (
    <section className="member-reviews-section">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">COMMUNITY VOICES</span>
          <h3 className="section-title">WHAT MEMBERS SAY</h3>
        </div>
        <span className="activity-hint-text">Verified match and court experiences</span>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-reviews-card">
          <p>No member reviews yet. Book a session and be the first to share your experience!</p>
        </div>
      ) : (
        <div className="reviews-cards-carousel">
          {reviews.map((review) => {
            const initials = review.name
              ? review.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'MB'

            return (
              <article key={review.id} className="premium-review-card">
                <div className="review-top-stars-row">
                  <div className="review-stars-gold" aria-label={`${review.rating} out of 5 stars`}>
                    {'★'.repeat(review.rating)}
                    <span className="stars-muted">{'★'.repeat(Math.max(0, 5 - review.rating))}</span>
                  </div>
                  <span className="verified-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Verified Booking</span>
                  </span>
                </div>

                <p className="review-quote-text">
                  "{review.review || 'Great facilities and seamless booking experience!'}"
                </p>

                {review.photos?.length > 0 && (
                  <div className="review-attached-photos">
                    {review.photos.map((photo) => (
                      <img
                        key={photo}
                        src={`${apiOrigin}${photo}`}
                        alt="Facility photo by member"
                        className="review-thumb-img"
                      />
                    ))}
                  </div>
                )}

                <div className="review-author-footer">
                  <div className="review-author-avatar">{initials}</div>
                  <div className="review-author-info">
                    <strong className="review-author-name">{review.name}</strong>
                    <span className="review-facility-tag">
                      {review.facilityName || 'Court Booking'}
                    </span>
                  </div>
                </div>

                {(canEdit(review) || canDelete(review)) && (
                  <div className="review-admin-actions">
                    {canEdit(review) && (
                      <button
                        type="button"
                        className="review-action-btn"
                        onClick={() => onEdit && onEdit(review)}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete(review) && (
                      <button
                        type="button"
                        className="review-action-btn danger-text"
                        onClick={() => onDelete && onDelete(review)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
