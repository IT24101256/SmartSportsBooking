export default function SupportPage({ requests, onAddTicket, isAdmin, onStatusChange, onOpenRequest }) {
  return (
    <section className="panel full-width-panel support-page">
      <div className="panel-header">
        <h3>Support requests</h3>
        <button className="text-action" type="button" onClick={onAddTicket}>Add ticket</button>
      </div>
      <div className="support-list">
        {requests.map((item) => (
          <div key={item.id ?? item.title} className="support-item">
            <button className="support-request-select" type="button" onClick={() => onOpenRequest(item)}><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className={`support-status ${String(item.status || 'Pending').toLowerCase().replace('underreview', 'under-review')}`}>{item.status || 'Pending'}</span></button>
            <span className="priority-tag">{item.priority}</span>
            {isAdmin && item.status === 'Pending' && <button className="secondary-btn" type="button" onClick={() => onStatusChange(item, 'UnderReview')}>Open for review</button>}
            {isAdmin && item.status === 'UnderReview' && <button className="secondary-btn" type="button" onClick={() => onStatusChange(item, 'Resolved')}>Mark resolved</button>}
          </div>
        ))}
      </div>
    </section>
  )
}
