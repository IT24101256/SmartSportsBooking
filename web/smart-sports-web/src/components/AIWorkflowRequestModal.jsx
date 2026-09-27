export default function AIWorkflowRequestModal({ form, options, selectedSlots, loading, onChange, onSubmit, onToggleSlot, onContinue, onClose }) {
  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal pro-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle">AI booking assistant</p>
            <h3>Find an available playing slot</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-description">
          Hi, what do you want to play and when do you want to play? I will find the available slots for you.
        </p>

        <form className="booking-form" onSubmit={onSubmit}>
          <label>
            <span>Your request</span>
            <input
              value={form.requestText}
              onChange={(event) => onChange('requestText', event.target.value)}
              placeholder="I want to play football on Saturday"
              required
            />
          </label>

          <label>
            <span>Date fallback</span>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => onChange('date', event.target.value)} required />
          </label>

          {loading && <div className="agent-pipeline-preview"><small>Searching live availability...</small></div>}
          {!loading && options.length > 0 && <div className="ai-slot-results"><strong>Available slots</strong><small>Select one or more consecutive slots at the same facility.</small>{options.map((option) => <div className="ai-slot-facility" key={option.facility.id}><div><strong>{option.facility.name}</strong><small>LKR {option.hourlyRate.toLocaleString()} / hour</small></div><div className="availability-slots">{option.slots.map((slot) => { const selected = selectedSlots.some((item) => item.facility.id === option.facility.id && item.slot.startTime === slot.startTime); return <button key={`${option.facility.id}-${slot.startTime}`} type="button" className={`availability-slot available ${selected ? 'selected' : ''}`} onClick={() => onToggleSlot(option, slot)}><strong>{slot.startTime.slice(0, 5)}</strong><small>{selected ? 'Selected' : 'Select'}</small></button> })}</div></div>)}<div className="modal-actions"><button type="button" className="primary-btn" disabled={!selectedSlots.length} onClick={onContinue}>Continue to payment</button></div></div>}
          {!loading && options.length === 0 && <div className="agent-pipeline-preview"><small>No available slots are shown yet. Search for a date to check live availability.</small></div>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>Find available slots</button>
          </div>
        </form>
      </div>
    </div>
  )
}
