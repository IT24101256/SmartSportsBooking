import { useEffect, useState } from 'react'

const emptyForm = { name: '', rating: 0, review: '', photos: [] }

export default function ReviewModal({ booking, existingReview, onSubmit, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setForm({ name: existingReview?.name || '', rating: existingReview?.rating || 0, review: existingReview?.review || '', photos: [] })
  }, [existingReview])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.rating || !form.review.trim()) {
      setFeedback('Choose a star rating and write a review.')
      return
    }
    await onSubmit({ ...form, bookingId: booking.id, reviewId: existingReview?.id })
  }

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal review-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header">
          <div><p className="eyebrow subtle">Your experience</p><h3>{existingReview ? 'Edit review' : 'Leave a review'}</h3><span className="modal-description">{booking.name}</span></div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <form className="booking-form" onSubmit={handleSubmit}>
          <label><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" required /></label>
          <div className="review-field"><span>Rating</span><div className="star-picker" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= form.rating ? 'star active' : 'star'} onClick={() => setForm((current) => ({ ...current, rating: star }))} aria-label={`${star} star${star > 1 ? 's' : ''}`}>★</button>)}
          </div></div>
          <label><span>Review</span><textarea value={form.review} onChange={(event) => setForm((current) => ({ ...current, review: event.target.value }))} placeholder="How was your booking?" rows="5" maxLength="1000" required /></label>
          <label><span>Photos <small>(max 3)</small></span><input type="file" accept="image/*" multiple onChange={(event) => setForm((current) => ({ ...current, photos: Array.from(event.target.files || []).slice(0, 3) }))} /></label>
          {feedback && <p className="form-feedback">{feedback}</p>}
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn">{existingReview ? 'Update review' : 'Submit review'}</button></div>
        </form>
      </div>
    </div>
  )
}