export default function ReviewsPanel({ reviews, apiBaseUrl, currentUser, onEdit, onDelete }) {
  const canEdit = (review) => currentUser?.id === review.userId
  const canDelete = (review) => currentUser?.role === 'admin' || canEdit(review)
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '')

  return (
    <section className="panel reviews-panel">
      <div className="panel-header"><div><h3>Member reviews</h3><span className="subtle">Real experiences from the sports community</span></div></div>
      {reviews.length === 0 ? <p className="empty-state">No reviews yet. Be the first to share your experience.</p> : <div className="reviews-list">
        {reviews.map((review) => <article className="review-card" key={review.id}>
          <div className="review-card-header"><div><strong>{review.name}</strong><span>{review.facilityName || 'Facility booking'}</span></div><div className="review-stars">{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div></div>
          <p>{review.review}</p>
          {review.photos?.length > 0 && <div className="review-photos">{review.photos.map((photo) => <img key={photo} src={`${apiOrigin}${photo}`} alt="Review" />)}</div>}
          {(canEdit(review) || canDelete(review)) && <div className="review-actions">{canEdit(review) && <button type="button" className="text-action" onClick={() => onEdit(review)}>Edit</button>}{canDelete(review) && <button type="button" className="text-action danger-action" onClick={() => onDelete(review)}>Delete</button>}</div>}
        </article>)}
      </div>}
    </section>
  )
}