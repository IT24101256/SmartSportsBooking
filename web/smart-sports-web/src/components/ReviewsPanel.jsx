import { getFacilityImage } from '../utils/facilityImages'

export default function ReviewsPanel({ reviews, apiBaseUrl = '', currentUser, onEdit, onDelete }) {
  const canEdit = (review) => currentUser?.id === review.userId
  const canDelete = (review) => currentUser?.role === 'admin' || canEdit(review)

  const resolvePhotoSrc = (photo) => {
    if (!photo) return ''
    if (photo.startsWith('data:image') || photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    const origin = apiBaseUrl
      ? apiBaseUrl.replace(/\/api\/?$/, '')
      : 'https://smartsportsbooking.onrender.com'
    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`
    return `${origin}${cleanPath}`
  }

  return (
    <section className="panel reviews-panel">
      <div className="panel-header"><div><h3>Member reviews</h3><span className="subtle">Real experiences from the sports community</span></div></div>
      {reviews.length === 0 ? <p className="empty-state">No reviews yet. Be the first to share your experience.</p> : <div className="reviews-list">
        {reviews.map((review) => <article className="review-card" key={review.id}>
          <div className="review-card-header"><div><strong>{review.name}</strong><span>{review.facilityName || 'Facility booking'}</span></div><div className="review-stars">{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div></div>
          <p>{review.review}</p>
          {review.photos?.length > 0 && (
            <div className="review-photos">
              {review.photos.map((photo, pIdx) => (
                <img
                  key={photo || pIdx}
                  src={resolvePhotoSrc(photo)}
                  alt="Review"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = getFacilityImage({ name: review.facilityName })
                  }}
                />
              ))}
            </div>
          )}
          {(canEdit(review) || canDelete(review)) && <div className="review-actions">{canEdit(review) && <button type="button" className="text-action" onClick={() => onEdit(review)}>Edit</button>}{canDelete(review) && <button type="button" className="text-action danger-action" onClick={() => onDelete(review)}>Delete</button>}</div>}
        </article>)}
      </div>}
    </section>
  )
}