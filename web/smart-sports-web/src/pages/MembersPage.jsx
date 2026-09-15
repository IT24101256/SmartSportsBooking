export default function MembersPage({ members }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Member directory</h3>
        <span className="admin-badge">Admin access</span>
      </div>
      <div className="member-table-wrap">
        <table className="member-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {members.map((member) => (
              <tr key={`${member.email}-${member.name}`}>
                <td>{member.name}</td><td>{member.email}</td>
                <td>{member.role === 'admin' ? 'Admin' : 'Member'}</td>
                <td><span className="member-status active">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
