export default function AIWorkflowRequestModal({ form, onChange, onSubmit, onClose }) {
  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle">Smart booking assistant</p>
            <h3>Ask AI to find a facility</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <p className="modal-description">Tell us what you need. The system checks availability, capacity, budget, and then sends the proposal for manager approval.</p>
        <form className="booking-form" onSubmit={onSubmit}>
          <label>
            <span>What do you need?</span>
            <input value={form.objective} onChange={(event) => onChange('objective', event.target.value)} placeholder="Evening football training" required />
          </label>
          <label>
            <span>Facility type</span>
            <select value={form.facilityType} onChange={(event) => onChange('facilityType', event.target.value)}>
              <option>Football</option><option>Badminton</option><option>Swimming</option><option>Tennis</option><option>Fitness</option><option>Basketball</option>
            </select>
          </label>
          <div className="form-row">
            <label><span>Date</span><input type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} required /></label>
            <label><span>Start time</span><input type="time" value={form.startTime} onChange={(event) => onChange('startTime', event.target.value)} required /></label>
          </div>
          <div className="form-row">
            <label><span>End time</span><input type="time" value={form.endTime} onChange={(event) => onChange('endTime', event.target.value)} required /></label>
            <label><span>Guests</span><input type="number" min="1" max="30" value={form.guests} onChange={(event) => onChange('guests', event.target.value)} required /></label>
          </div>
          <label><span>Budget (LKR)</span><input type="number" min="1" value={form.budget} onChange={(event) => onChange('budget', event.target.value)} required /></label>
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn">Submit AI request</button></div>
        </form>
      </div>
    </div>
  )
}
