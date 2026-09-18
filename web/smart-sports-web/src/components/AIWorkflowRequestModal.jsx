export default function AIWorkflowRequestModal({ form, onChange, onSubmit, onClose }) {
  const applyTemplate = (template) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().slice(0, 10)

    onChange('objective', template.objective)
    onChange('facilityType', template.facilityType)
    onChange('date', dateStr)
    onChange('startTime', template.startTime)
    onChange('endTime', template.endTime)
    onChange('guests', template.guests)
    onChange('budget', template.budget)
  }

  const templates = [
    {
      title: '🏸 Badminton Tournament',
      objective: '16-Team Inter-University Badminton Championship (4 Court Slots)',
      facilityType: 'Badminton',
      startTime: '09:00',
      endTime: '12:00',
      guests: 24,
      budget: 35000
    },
    {
      title: '⚽ Football Match',
      objective: 'Weekend Corporate Friendly Cup 11v11 Match',
      facilityType: 'Football',
      startTime: '16:00',
      endTime: '18:00',
      guests: 22,
      budget: 25000
    },
    {
      title: '🏊 Swimming Gala',
      objective: 'Junior Squad Aquatic Training & Sprint Gala',
      facilityType: 'Swimming',
      startTime: '07:00',
      endTime: '10:00',
      guests: 18,
      budget: 20000
    },
    {
      title: '🎾 Tennis Clinic',
      objective: 'Advanced Doubles Coaching Clinic & Matchplay',
      facilityType: 'Tennis',
      startTime: '14:00',
      endTime: '16:00',
      guests: 8,
      budget: 15000
    }
  ]

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal pro-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle">Autonomous Agent Pipeline</p>
            <h3>Agentic AI Booking Orchestrator</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-description">
          Provide your sports event objective. The <b>4 specialized AI agents</b> will decompose the goal, query allow-listed facility tools, run deterministic collision & budget checks, and stage a proposal for manager approval.
        </p>

        {/* Quick Domain Presets */}
        <div className="template-presets">
          <span className="preset-label">Quick Domain Presets:</span>
          <div className="preset-button-grid">
            {templates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-btn"
                onClick={() => applyTemplate(t)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <form className="booking-form" onSubmit={onSubmit}>
          <label>
            <span>Domain Objective / Event Goal</span>
            <input
              value={form.objective}
              onChange={(event) => onChange('objective', event.target.value)}
              placeholder="e.g. 16-Team Inter-University Badminton Championship"
              required
            />
          </label>

          <label>
            <span>Sport / Facility Type</span>
            <select value={form.facilityType} onChange={(event) => onChange('facilityType', event.target.value)}>
              <option>Badminton</option>
              <option>Football</option>
              <option>Swimming</option>
              <option>Tennis</option>
              <option>Basketball</option>
              <option>Volleyball</option>
              <option>Cricket</option>
              <option>Fitness</option>
            </select>
          </label>

          <div className="form-row">
            <label>
              <span>Date</span>
              <input type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} required />
            </label>
            <label>
              <span>Start Time</span>
              <input type="time" value={form.startTime} onChange={(event) => onChange('startTime', event.target.value)} required />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>End Time</span>
              <input type="time" value={form.endTime} onChange={(event) => onChange('endTime', event.target.value)} required />
            </label>
            <label>
              <span>Participants / Guests (Max 30)</span>
              <input
                type="number"
                min="1"
                max="30"
                value={form.guests}
                onChange={(event) => onChange('guests', event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            <span>Budget Ceiling (LKR)</span>
            <input
              type="number"
              min="1"
              value={form.budget}
              onChange={(event) => onChange('budget', event.target.value)}
              placeholder="e.g. 35000"
              required
            />
          </label>

          <div className="agent-pipeline-preview">
            <small>🔒 High-impact action (booking creation) is strictly gated by manager authorization.</small>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">🚀 Launch Multi-Agent Workflow</button>
          </div>
        </form>
      </div>
    </div>
  )
}
