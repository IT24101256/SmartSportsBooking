export default function TeamPage({ teamMembers, name, onNameChange, onAdd, onRemove, currentUser }) {
  return (
    <section className="panel full-width-panel member-page">
      <div className="panel-header">
        <div><p className="eyebrow subtle">Match planning</p><h3>Manage team</h3></div>
        <span className="admin-badge">{teamMembers.length + 1} players</span>
      </div>
      <p className="page-intro">Keep the players for your next session together in your account.</p>
      <form className="team-add-form" onSubmit={onAdd}>
        <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Player name" aria-label="Player name" />
        <button type="submit" className="primary-btn">Add player</button>
      </form>
      <div className="team-list">
        <div className="team-member"><span className="avatar small-avatar">{currentUser?.name?.charAt(0) ?? 'Y'}</span><div><strong>{currentUser?.name ?? 'You'}</strong><small>Team captain</small></div></div>
        {teamMembers.map((member) => <div className="team-member" key={member.id}><span className="avatar small-avatar">{member.name.charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>Team player</small></div><button type="button" className="remove-member" onClick={() => onRemove(member.id)}>Remove</button></div>)}
        {!teamMembers.length && <p className="empty-state">No additional players added yet.</p>}
      </div>
    </section>
  )
}
