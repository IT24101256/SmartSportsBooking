export default function WorkflowHistoryPage({ workflows, onReviseRequest }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow subtle">Customer Agentic AI Trackers</p>
          <h3>My AI Booking Proposals</h3>
        </div>
      </div>

      <div className="workflow-list">
        {workflows.map((workflow) => {
          const rawValidation = workflow.rawValidation || {}
          const passedRules = rawValidation.passedRules || []
          const violations = rawValidation.violations || []
          const isPending = workflow.status === 'Pending manager approval' || workflow.status === 'PendingManagerApproval'
          const isApproved = workflow.status === 'Approved'
          const isRejected = workflow.status === 'Rejected'
          const isRevision = workflow.status === 'Revision requested' || workflow.status === 'RevisionRequested'
          const isFailed = workflow.status === 'ValidationFailed' || workflow.status === 'FailedSafe'

          return (
            <article className="workflow-card-pro" key={workflow.id}>
              <div className="workflow-card-header">
                <div>
                  <div className="workflow-id-badge">
                    <span className="id-label">Workflow ID:</span>
                    <code>{workflow.id}</code>
                  </div>
                  <h4>{workflow.objective}</h4>
                </div>
                <span className={`status ${isApproved ? 'confirmed' : isRejected ? 'rejected' : isFailed ? 'rejected' : isRevision ? 'revision' : 'pending'}`}>
                  {isPending ? '⏳ In Manager Review' : isApproved ? '✓ Confirmed & Booked' : isRejected ? '✕ Rejected' : isRevision ? '🔄 Revision Requested' : workflow.status}
                </span>
              </div>

              <div className="workflow-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Facility</span>
                  <strong>{workflow.facility}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Requested Time</span>
                  <strong>{workflow.date}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Budget</span>
                  <strong className="cost-highlight">{workflow.quotation}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Guests</span>
                  <strong>{workflow.guests || 'N/A'}</strong>
                </div>
              </div>

              <div className="workflow-validation-card">
                <div className="validation-header">
                  <strong>Validation Summary</strong>
                  <span className="validation-badge">{violations.length === 0 ? '✓ Verified by Deterministic Agent' : `${violations.length} Issues Detected`}</span>
                </div>
                <div className="rules-grid">
                  {passedRules.map((rule, idx) => (
                    <div className="rule-item passed" key={idx}>
                      <span className="check-icon">✓</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                  {violations.map((violation, idx) => (
                    <div className="rule-item failed" key={idx}>
                      <span className="fail-icon">✕</span>
                      <span>{violation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {workflow.approvalComment && (
                <div className={`workflow-decision-banner ${isRevision ? 'revision-banner' : ''}`}>
                  <strong>Manager Feedback:</strong> {workflow.approvalComment}
                </div>
              )}

              {workflow.finalOutcome && (
                <div className="workflow-outcome-text">
                  <small>Outcome: {workflow.finalOutcome}</small>
                </div>
              )}
            </article>
          )
        })}

        {!workflows.length && (
          <div className="empty-state-card">
            <p className="empty-state">You have not submitted any AI booking requests yet. Click &quot;Ask AI Assistant&quot; to plan your first event!</p>
          </div>
        )}
      </div>
    </section>
  )
}
