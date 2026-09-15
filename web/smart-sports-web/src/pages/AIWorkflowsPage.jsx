export default function AIWorkflowsPage({ workflows, decision, onDecisionChange, onRequestRevision, onReject, onApprove }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <div><p className="eyebrow subtle">Agentic AI control room</p><h3>Booking proposals awaiting approval</h3></div>
        <span className="admin-badge">Manager approval required</span>
      </div>
      <div className="workflow-explainer"><strong>What does Agentic AI do here?</strong><p>It breaks one booking request into four specialist checks. The system validates their proposal, then pauses before creating a real booking. A manager makes the final decision.</p></div>
      <div className="workflow-list">
        {workflows.map((workflow) => (
          <article className="workflow-card" key={workflow.id}>
            <div className="workflow-card-header"><div><strong>{workflow.id}</strong><h4>{workflow.objective}</h4></div><span className={`status ${workflow.status === 'Approved' ? 'confirmed' : workflow.status === 'Rejected' ? 'rejected' : 'pending'}`}>{workflow.status}</span></div>
            <div className="workflow-meta"><span><b>Facility:</b> {workflow.facility}</span><span><b>Requested:</b> {workflow.date}</span><span><b>Quotation:</b> {workflow.quotation}</span></div>
            <div className="agent-step-list">{workflow.steps.map((step, index) => <span key={step} className="agent-step"><b>{index + 1}</b><span><strong>{step}</strong><small>{index === 0 ? 'Creates the plan' : index === 1 ? 'Finds the right facility' : index === 2 ? 'Checks time, capacity and budget' : 'Prepares action, but cannot book yet'}</small></span></span>)}</div>
            <div className="workflow-validation"><strong>Deterministic validation passed</strong>{workflow.validation.map((rule) => <span key={rule}>✓ {rule}</span>)}</div>
            {(workflow.status === 'Pending manager approval' || workflow.status === 'Revision requested') && <><label className="workflow-comment"><span>Decision note <small>(required for audit history)</small></span><textarea value={decision} onChange={(event) => onDecisionChange(event.target.value)} placeholder="Explain why you approved, rejected or requested changes." rows="2" /></label><div className="modal-actions"><button className="secondary-btn" type="button" disabled={!decision.trim()} onClick={() => onRequestRevision(workflow.id)}>Request revision</button><button className="secondary-btn" type="button" disabled={!decision.trim()} onClick={() => onReject(workflow.id)}>Reject safely</button><button className="primary-btn" type="button" disabled={!decision.trim()} onClick={() => onApprove(workflow.id)}>Approve & create booking</button></div></>}
            {workflow.status !== 'Pending manager approval' && workflow.status !== 'Revision requested' && <div className="workflow-decision"><strong>Audit decision:</strong> {workflow.decision}</div>}
          </article>
        ))}
        {!workflows.length && <p className="empty-state">No proposals are waiting for manager approval.</p>}
      </div>
    </section>
  )
}
