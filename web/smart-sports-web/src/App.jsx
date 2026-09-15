import { useState, useEffect } from 'react'
import './App.css'
import BookingList from './components/BookingList'
import SchedulePanel from './components/SchedulePanel'
import AIWorkflowRequestModal from './components/AIWorkflowRequestModal'
import OverviewPage from './pages/OverviewPage'
import FacilitiesPage from './pages/FacilitiesPage'
import BookingsPage from './pages/BookingsPage'
import SupportPage from './pages/SupportPage'
import MembersPage from './pages/MembersPage'
import AIWorkflowsPage from './pages/AIWorkflowsPage'
import WorkflowHistoryPage from './pages/WorkflowHistoryPage'

const API_BASE_URL = 'http://localhost:5187/api'

const baseNavItems = ['Overview', 'Facilities', 'Bookings', 'Support', 'My AI Requests']
const adminNavItems = [...baseNavItems, 'Members', 'AI Workflows']

const initialBookingForm = {
  facility: 'Championship Turf',
  date: '2026-09-12',
  time: '18:30',
  guests: '2',
  status: 'Confirmed',
}

const initialMembers = [
  { name: 'Aisha Jordan', email: 'member@smartsports.com', password: 'member123', role: 'member' },
  { name: 'Admin User', email: 'admin@smartsports.com', password: 'admin123', role: 'admin' },
]

const getFacilityIcon = (type) => {
  const normalized = (type || '').toLowerCase()
  if (normalized.includes('football') || normalized.includes('turf')) return '🏟️'
  if (normalized.includes('badminton')) return '🏸'
  if (normalized.includes('swim')) return '🏊'
  if (normalized.includes('tennis')) return '🎾'
  if (normalized.includes('fitness') || normalized.includes('gym')) return '🏋️'
  if (normalized.includes('basketball')) return '🏀'
  if (normalized.includes('cricket')) return '🏏'
  if (normalized.includes('volleyball')) return '🏐'
  if (normalized.includes('table tennis')) return '🏓'
  if (normalized.includes('squash')) return '🎾'
  return '🏆'
}

const getFacilityPrice = (type) => {
  const normalized = (type || '').toLowerCase()
  if (normalized.includes('football')) return 'LKR 4,500 / hour'
  if (normalized.includes('badminton')) return 'LKR 1,200 / hour'
  if (normalized.includes('swim')) return 'LKR 2,000 / session'
  if (normalized.includes('tennis')) return 'LKR 1,800 / hour'
  if (normalized.includes('fitness') || normalized.includes('gym')) return 'LKR 1,500 / session'
  if (normalized.includes('basketball')) return 'LKR 3,000 / hour'
  if (normalized.includes('cricket')) return 'LKR 5,000 / hour'
  return 'LKR 2,000 / hour'
}

const formatFacility = (facility, index = 0) => {
  const accents = ['green', 'blue', 'purple']
  const accent = accents[index % accents.length]
  return {
    id: facility.id,
    name: facility.name,
    type: facility.type,
    location: facility.location,
    price: getFacilityPrice(facility.type),
    status: facility.isAvailable ? 'Available now' : 'Currently unavailable',
    accent,
    icon: getFacilityIcon(facility.type),
  }
}

const facilities = [
  { name: 'Championship Turf', type: 'Football', price: 'LKR 4,500 / hour', status: 'Available now', accent: 'green', icon: '🏟️' },
  { name: 'Skyline Court', type: 'Badminton', price: 'LKR 1,200 / hour', status: 'Next slot 5:30 PM', accent: 'blue', icon: '🏸' },
  { name: 'Aqua Arena', type: 'Swimming', price: 'LKR 2,000 / session', status: 'Open today', accent: 'purple', icon: '🏊' },
  { name: 'Riverside Tennis Club', type: 'Tennis', price: 'LKR 1,800 / hour', status: 'Available tomorrow', accent: 'green', icon: '🎾' },
  { name: 'Performance Gym', type: 'Fitness', price: 'LKR 1,500 / session', status: 'Open now', accent: 'blue', icon: '🏋️' },
  { name: 'Indoor Basketball Arena', type: 'Basketball', price: 'LKR 3,000 / hour', status: 'Next slot 7:00 PM', accent: 'purple', icon: '🏀' },
]

const bookings = [
  { name: 'Court 4 • Tennis', date: 'Mon, 11:00 AM', status: 'Confirmed' },
  { name: 'Pool lane • Swim', date: 'Tue, 06:15 PM', status: 'Pending' },
  { name: 'Field 2 • Soccer', date: 'Thu, 07:30 PM', status: 'Confirmed' },
]

const support = [
  { title: 'Booking issue', detail: 'Need to change the time for Friday match', priority: 'Medium' },
  { title: 'Membership query', detail: 'Checking reward points balance', priority: 'Low' },
  { title: 'Facility request', detail: 'Request for extra lighting on court 5', priority: 'High' },
]

const schedule = [
  { time: '09:00 AM', title: 'Basketball training', coach: 'Coach Liam' , eventDate: '2026-09-10'},
  { time: '11:30 AM', title: 'Tennis clinic', coach: 'Coach Maya' , eventDate: '2026-09-10'},
  { time: '07:00 PM', title: 'Community match', coach: 'Captain team' , eventDate: '2026-09-10'},
]

function App() {
  const [activeTab, setCurrentTab] = useState('Overview')
  const [tabHistory, setTabHistory] = useState([])
  const [theme, setTheme] = useState('light')
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authToken, setAuthToken] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [email, setEmail] = useState('member@smartsports.com')
  const [password, setPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [authFeedback, setAuthFeedback] = useState('')
  const [registeredMembers, setRegisteredMembers] = useState(initialMembers)
  const [bookingsList, setBookingsList] = useState(bookings)
  const [scheduleList, setScheduleList] = useState(schedule)
  const [supportList, setSupportList] = useState(support)
  const [facilitiesList, setFacilitiesList] = useState(facilities)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState(initialBookingForm)
  const [bookingNotice, setBookingNotice] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [isTimetableOpen, setIsTimetableOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null)
  const [isAIRequestOpen, setIsAIRequestOpen] = useState(false)
  const [aiRequestForm, setAIRequestForm] = useState({ objective: '', facilityType: 'Football', date: '2026-09-12', startTime: '18:00', endTime: '19:00', guests: '2', budget: '5000' })
  const [ticketForm, setTicketForm] = useState({ subject: '', detail: '', priority: 'Medium' })
  const [workflowRequests, setWorkflowRequests] = useState([
    {
      id: 'WF-2026-014',
      objective: 'Find a basketball court for a 10-person evening training session',
      facility: 'Indoor Basketball Arena',
      date: '12 Sep 2026, 7:00 PM',
      quotation: 'LKR 3,000',
      status: 'Pending manager approval',
      validation: [
        'Facility exists and is available',
        'Requested time does not overlap another booking',
        '10 guests are within the facility capacity',
        'Quotation is within the customer budget',
      ],
      steps: ['Planning Agent', 'Facility Analysis Agent', 'Scheduling and Validation Agent', 'Inventory and Action Agent'],
    },
  ])
  const [workflowDecision, setWorkflowDecision] = useState('')
  const [workflowHistory, setWorkflowHistory] = useState([])

  const setActiveTab = (tab) => {
    if (tab !== activeTab) {
      setTabHistory((current) => [...current, activeTab])
      setCurrentTab(tab)
    }
  }

  const goBack = () => {
    setTabHistory((current) => {
      if (!current.length) return current
      const previousTab = current[current.length - 1]
      setCurrentTab(previousTab)
      return current.slice(0, -1)
    })
  }

  const formatBooking = (booking) => ({
    id: booking.id,
    name: `${booking.facility?.name ?? 'Facility'} • booking`,
    date: `${new Date(booking.bookingDate).toLocaleDateString()} • ${booking.startTime.slice(0, 5)}`,
    status: booking.status,
  })

  const formatScheduleBooking = (booking) => ({
    id: `booking-${booking.id}`,
    time: booking.startTime.slice(0, 5),
    title: `Booking at ${booking.facility?.name ?? 'facility'}`,
    coach: currentUser?.name ?? 'Member booking',
    eventDate: booking.bookingDate.slice(0, 10),
  })

  const loadBookings = async (token) => {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) return
    const savedBookings = await response.json()
    setBookingsList(savedBookings.map(formatBooking))
    setScheduleList((current) => [
      ...current.filter((item) => !String(item.id).startsWith('booking-')),
      ...savedBookings.filter((item) => item.bookingDate.slice(0, 10) === new Date().toISOString().slice(0, 10)).map(formatScheduleBooking),
    ])
  }

  const loadSupportRequests = async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/support-requests`)
    if (response.ok) setSupportList(await response.json())
  }

  const loadMembers = async (token) => {
    const response = await fetch(`${API_BASE_URL}/members`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setRegisteredMembers(await response.json())
  }

  const loadFacilities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/Facilities`)
      if (response.ok) {
        const savedFacilities = await response.json()
        if (Array.isArray(savedFacilities) && savedFacilities.length > 0) {
          setFacilitiesList(savedFacilities.map(formatFacility))
        }
      }
    } catch {
      // Keep static defaults on network failure
    }
  }

  useEffect(() => {
    loadFacilities()
    loadSupportRequests()
  }, [])

  const formatWorkflow = (workflow) => {
    const proposal = JSON.parse(workflow.proposalJson || '{}')
    const validation = JSON.parse(workflow.validationJson || '{}')
    return {
      id: workflow.workflowId,
      objective: workflow.objective,
      facility: proposal.facilityName ?? workflow.facilityType,
      date: new Date(workflow.requestedStart).toLocaleString(),
      quotation: proposal.estimatedCost ? `LKR ${proposal.estimatedCost.toLocaleString()}` : `LKR ${workflow.budget.toLocaleString()}`,
      status: workflow.status === 'PendingManagerApproval' ? 'Pending manager approval' : workflow.status,
      validation: Object.entries(validation).map(([key, value]) => `${key}: ${value ? 'passed' : 'failed'}`),
      steps: workflow.steps?.map((step) => step.agentName) ?? [],
    }
  }

  const loadWorkflows = async (token) => {
    const response = await fetch(`${API_BASE_URL}/booking-workflows/admin-history`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setWorkflowRequests((await response.json()).map(formatWorkflow))
  }

  const loadWorkflowHistory = async (token) => {
    const response = await fetch(`${API_BASE_URL}/booking-workflows/history`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setWorkflowHistory((await response.json()).map(formatWorkflow))
  }

  const decideWorkflow = async (workflowId, action) => {
    const response = await fetch(`${API_BASE_URL}/booking-workflows/${workflowId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ comment: workflowDecision.trim() }),
    })
    if (!response.ok) {
      setBookingNotice(await response.text() || 'Workflow decision could not be saved.')
      return
    }
    const updatedWorkflow = formatWorkflow(await response.json())
    setWorkflowRequests((current) => current.map((item) => item.id === workflowId ? { ...item, ...updatedWorkflow, decision: workflowDecision.trim() } : item))
    setWorkflowDecision('')
    await loadBookings(authToken)
    setBookingNotice(action === 'approve' ? 'Workflow approved and booking created.' : 'Workflow rejected and saved.')
  }

  const navItems = currentUser?.role === 'admin' ? adminNavItems : baseNavItems

  const requireLogin = (message = 'Please log in to continue.') => {
    if (!loggedIn) {
      setAuthFeedback(message)
      setShowAuthPanel(true)
      return false
    }
    return true
  }

  const openBooking = () => {
    if (requireLogin('Please log in before creating a booking.')) {
      setIsBookingOpen(true)
    }
  }

  const openTicket = () => {
    if (requireLogin('Please log in before creating a support ticket.')) {
      setIsTicketOpen(true)
    }
  }

  const openAIRequest = () => {
    if (requireLogin('Please log in before asking AI to find a facility.')) setIsAIRequestOpen(true)
  }

  const handleAIRequestChange = (field, value) => {
    setAIRequestForm((current) => ({ ...current, [field]: value }))
  }

  const handleAIRequestSubmit = async (event) => {
    event.preventDefault()
    if (aiRequestForm.endTime <= aiRequestForm.startTime) {
      setBookingNotice('End time must be after start time.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/booking-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          objective: aiRequestForm.objective,
          facilityType: aiRequestForm.facilityType,
          requestedStart: `${aiRequestForm.date}T${aiRequestForm.startTime}:00.000Z`,
          requestedEnd: `${aiRequestForm.date}T${aiRequestForm.endTime}:00.000Z`,
          guests: Number(aiRequestForm.guests),
          budget: Number(aiRequestForm.budget),
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        setBookingNotice(error?.error || 'The AI request could not be submitted.')
        return
      }
      const workflow = await response.json()
      setWorkflowHistory((current) => [formatWorkflow(workflow), ...current])
      setIsAIRequestOpen(false)
      setBookingNotice(`AI request submitted. Status: ${workflow.status}. A manager will review it.`)
      setAIRequestForm((current) => ({ ...current, objective: '' }))
    } catch {
      setBookingNotice('The API is unavailable. Start the backend on port 5187 and try again.')
    }
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    if (!ticketForm.subject.trim() || !ticketForm.detail.trim()) return
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/support-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ticketForm.subject, detail: ticketForm.detail, priority: ticketForm.priority }),
      })
      if (!response.ok) {
        setBookingNotice(await response.text() || 'Support ticket could not be saved.')
        return
      }
      const savedRequest = await response.json()
      setSupportList((current) => [savedRequest, ...current])
      setBookingNotice(`Support ticket submitted: ${ticketForm.subject.trim()}. Saved to the database.`)
    } catch {
      setBookingNotice('The API is unavailable. Start the backend on port 5187 and try again.')
      return
    }
    setTicketForm({ subject: '', detail: '', priority: 'Medium' })
    setIsTicketOpen(false)
  }

  const renderPage = () => {
    const dynamicStats = [
      { label: 'Facilities', value: String(facilitiesList.length), tone: 'green' },
      { label: 'Bookings today', value: '142', tone: 'blue' },
      { label: 'Member satisfaction', value: '96%', tone: 'orange' },
    ]

    if (activeTab === 'Members') return <MembersPage members={registeredMembers} />
    if (activeTab === 'AI Workflows') return <AIWorkflowsPage workflows={workflowRequests} decision={workflowDecision} onDecisionChange={setWorkflowDecision} onRequestRevision={(id) => { setWorkflowRequests((current) => current.map((item) => item.id === id ? { ...item, status: 'Revision requested', decision: workflowDecision.trim() } : item)); setWorkflowDecision('') }} onReject={(id) => decideWorkflow(id, 'reject')} onApprove={(id) => decideWorkflow(id, 'approve')} />
    if (activeTab === 'My AI Requests') return <WorkflowHistoryPage workflows={workflowHistory} />
    if (activeTab === 'Facilities') return <FacilitiesPage facilities={facilitiesList} onViewTimetable={() => setIsTimetableOpen(true)} />
    if (activeTab === 'Bookings') return <BookingsPage bookings={bookingsList} onNewBooking={openBooking} />
    if (activeTab === 'Support') return <SupportPage requests={supportList} onAddTicket={openTicket} />
    return <OverviewPage heroMessage={heroMessage} stats={dynamicStats} facilities={facilitiesList} bookings={bookingsList} support={supportList} schedule={scheduleList} onBooking={openBooking} onAIRequest={openAIRequest} onTicket={openTicket} onFacilities={() => setActiveTab('Facilities')} onSchedule={() => setIsTimetableOpen(true)} onBookings={() => setActiveTab('Bookings')} onDetails={setSelectedScheduleItem} onTeam={() => { if (requireLogin('Please log in to manage your team.')) setBookingNotice('Team management is ready for your next match.') }} onNotice={setBookingNotice} />
  }

  const heroMessage = (() => {
    if (activeTab === 'Facilities') return 'Book a premium facility that fits your training plan.'
    if (activeTab === 'Bookings') return 'Manage your upcoming games and reservation updates in one place.'
    if (activeTab === 'Support') return 'Track support requests and get help from the facilities team.'
    if (activeTab === 'Members') return 'Review member activity, access and facility usage in one place.'
    if (activeTab === 'AI Workflows') return 'Review validated booking proposals before any high-impact action is executed.'
    return 'Play harder. Book smarter.'
  })()

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        setAuthFeedback('No account matches that email and password. Register first.')
        return
      }

      const result = await response.json()
      setAuthToken(result.token)
      setCurrentUser({ name: result.fullName, email: result.email, role: result.role?.toLowerCase() })
      setLoggedIn(true)
      setShowAuthPanel(false)
      setActiveTab('Overview')
      setAuthFeedback('')
      setPassword('')
      await loadBookings(result.token)
      await loadSupportRequests()
      await loadFacilities()
      await loadWorkflowHistory(result.token)
      if (result.role?.toLowerCase() === 'admin') {
        await loadMembers(result.token)
        await loadWorkflows(result.token)
      }
    } catch {
      setAuthFeedback('The API is unavailable. Start the backend on port 5187 and try again.')
      return
    }
  }

  const handleRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword || !registerConfirmPassword) {
      setAuthFeedback('Please complete all registration fields.')
      return
    }

    if (registerPassword.length < 6) {
      setAuthFeedback('Password must be at least 6 characters long.')
      return
    }

    if (registerPassword !== registerConfirmPassword) {
      setAuthFeedback('Passwords do not match. Please try again.')
      return
    }

    const response = await fetch(`${API_BASE_URL}/Auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: registerName.trim(), email: registerEmail.trim(), password: registerPassword }),
    })

    if (!response.ok) {
      setAuthFeedback(await response.text() || 'Registration failed.')
      return
    }

    setEmail(registerEmail.trim().toLowerCase())
    setPassword('')
    setRegisterName('')
    setRegisterEmail('')
    setRegisterPassword('')
    setRegisterConfirmPassword('')
    setAuthFeedback('Registration successful. You can now sign in.')
    setAuthMode('login')
  }

  const renderTabContent = () => {
    if (activeTab === 'Members') {
      return (
        <section className="panel full-width-panel">
          <div className="panel-header">
            <h3>Member directory</h3>
            <span className="admin-badge">Admin access</span>
          </div>

          <div className="member-table-wrap">
            <table className="member-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registeredMembers.map((member) => (
                  <tr key={`${member.email}-${member.name}`}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
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

    if (activeTab === 'AI Workflows') {
      return (
        <section className="panel full-width-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow subtle">Agentic AI control room</p>
              <h3>Booking proposals awaiting approval</h3>
            </div>
            <span className="admin-badge">Manager approval required</span>
          </div>
          <div className="workflow-explainer">
            <strong>What does Agentic AI do here?</strong>
            <p>It breaks one booking request into four specialist checks. The system validates their proposal, then pauses before creating a real booking. A manager makes the final decision.</p>
          </div>
          <div className="workflow-list">
            {workflowRequests.map((workflow) => (
              <article className="workflow-card" key={workflow.id}>
                <div className="workflow-card-header">
                  <div>
                    <strong>{workflow.id}</strong>
                    <h4>{workflow.objective}</h4>
                  </div>
                  <span className={`status ${workflow.status === 'Approved' ? 'confirmed' : workflow.status === 'Rejected' ? 'rejected' : 'pending'}`}>{workflow.status}</span>
                </div>
                <div className="workflow-meta">
                  <span><b>Facility:</b> {workflow.facility}</span>
                  <span><b>Requested:</b> {workflow.date}</span>
                  <span><b>Quotation:</b> {workflow.quotation}</span>
                </div>
                <div className="agent-step-list">
                  {workflow.steps.map((step, index) => (
                    <span key={step} className="agent-step"><b>{index + 1}</b><span><strong>{step}</strong><small>{index === 0 ? 'Creates the plan' : index === 1 ? 'Finds the right facility' : index === 2 ? 'Checks time, capacity and budget' : 'Prepares action, but cannot book yet'}</small></span></span>
                  ))}
                </div>
                <div className="workflow-validation">
                  <strong>Deterministic validation passed</strong>
                  {workflow.validation.map((rule) => <span key={rule}>✓ {rule}</span>)}
                </div>
                {workflow.status === 'Pending manager approval' || workflow.status === 'Revision requested' ? (
                  <>
                    <label className="workflow-comment">
                      <span>Decision note <small>(required for audit history)</small></span>
                      <textarea value={workflowDecision} onChange={(event) => setWorkflowDecision(event.target.value)} placeholder="Explain why you approved, rejected or requested changes." rows="2" />
                    </label>
                    <div className="modal-actions">
                      <button className="secondary-btn" type="button" disabled={!workflowDecision.trim()} onClick={() => {
                        setWorkflowRequests((current) => current.map((item) => item.id === workflow.id ? { ...item, status: 'Revision requested', decision: workflowDecision.trim() } : item))
                        setWorkflowDecision('')
                      }}>Request revision</button>
                      <button className="secondary-btn" type="button" disabled={!workflowDecision.trim()} onClick={() => {
                        setWorkflowRequests((current) => current.map((item) => item.id === workflow.id ? { ...item, status: 'Rejected', decision: workflowDecision.trim() } : item))
                        setWorkflowDecision('')
                      }}>Reject safely</button>
                      <button className="primary-btn" type="button" disabled={!workflowDecision.trim()} onClick={() => {
                        setWorkflowRequests((current) => current.map((item) => item.id === workflow.id ? { ...item, status: 'Approved', decision: workflowDecision.trim() } : item))
                        setWorkflowDecision('')
                      }}>Approve & create booking</button>
                    </div>
                  </>
                ) : (
                  <div className="workflow-decision"><strong>Audit decision:</strong> {workflow.decision}</div>
                )}
              </article>
            ))}
            {!workflowRequests.length && <p className="empty-state">No proposals are waiting for manager approval.</p>}
          </div>
        </section>
      )
    }

    if (activeTab === 'Facilities') {
      return (
        <section className="panel full-width-panel">
          <div className="panel-header">
            <h3>Available facilities</h3>
            <button className="text-action" type="button" onClick={() => setIsTimetableOpen(true)}>View timetable</button>
          </div>
          <div className="facility-list">
            {facilities.map((facility) => (
              <div key={facility.name} className={`facility-card ${facility.accent}`}>
                <div className="facility-icon">{facility.icon}</div>
                <div className="facility-body">
                  <div className="facility-topline">
                    <h4>{facility.name}</h4>
                    <span>{facility.type}</span>
                  </div>
                  <div className="facility-meta">
                    <strong>{facility.price}</strong>
                    <small>{facility.status}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === 'Bookings') {
      return (
        <section className="panel full-width-panel">
          <div className="panel-header">
            <h3>Upcoming bookings</h3>
            <button className="text-action" type="button" onClick={openBooking}>New booking</button>
          </div>
          <BookingList bookings={bookingsList} />
        </section>
      )
    }

    if (activeTab === 'Support') {
      return (
        <section className="panel full-width-panel">
          <div className="panel-header">
            <h3>Support requests</h3>
            <button className="text-action" type="button" onClick={openTicket}>Add ticket</button>
          </div>
          <div className="support-list">
            {support.map((item) => (
              <div key={item.title} className="support-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="priority-tag">{item.priority}</span>
              </div>
            ))}
          </div>
        </section>
      )
    }

    return (
      <>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="chip">Open all week</span>
            <h2>{heroMessage}</h2>
            <p>Reserve premium courts, track training time, and manage your active schedule in one place.</p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={openBooking}>Book a facility</button>
              <button className="secondary-btn light" onClick={() => setActiveTab('Bookings')}>View calendar</button>
            </div>
          </div>

          <div className="hero-summary">
            <div className="summary-card">
              <p>Next session</p>
              <strong>Badminton Doubles</strong>
              <span>Today • 6:30 PM</span>
            </div>

            <div className="mini-metrics">
              <div>
                <strong>12</strong>
                <span>Open courts</span>
              </div>
              <div>
                <strong>4.9</strong>
                <span>Rating</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          {stats.map((stat) => (
            <article key={stat.label} className={`stat-card ${stat.tone}`}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Popular facilities</h3>
              <button className="text-action" type="button" onClick={() => setActiveTab('Facilities')}>See all</button>
            </div>

            <div className="facility-list">
              {facilities.map((facility) => (
                <div key={facility.name} className={`facility-card ${facility.accent}`}>
                  <div className="facility-icon">{facility.icon}</div>
                  <div className="facility-body">
                    <div className="facility-topline">
                      <h4>{facility.name}</h4>
                      <span>{facility.type}</span>
                    </div>
                    <div className="facility-meta">
                      <strong>{facility.price}</strong>
                      <small>{facility.status}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="panel side-panel">
            <div className="panel-header">
              <h3>Quick actions</h3>
            </div>

            <div className="action-list">
              {['Book court', 'View schedule', 'Manage team', 'Rewards'].map((action) => (
                <button key={action} type="button" className="action-chip" onClick={() => {
                  if (action === 'Book court' && requireLogin('Please log in before booking a court.')) setIsBookingOpen(true)
                  else if (action === 'View schedule') setIsTimetableOpen(true)
                  else if (action === 'Manage team' && requireLogin('Please log in to manage your team.')) setBookingNotice('Team management is ready for your next match.')
                  else if (action === 'Rewards') setBookingNotice('Rewards are available after your first completed booking.')
                }}>
                  {action}
                </button>
              ))}
            </div>

            <div className="reward-card">
              <p>Member reward</p>
              <strong>12 points</strong>
              <span>Earned this week</span>
            </div>
          </aside>
        </section>

        <section className="lower-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Upcoming bookings</h3>
              <button className="text-action" type="button" onClick={() => setActiveTab('Bookings')}>All bookings</button>
            </div>

            <BookingList bookings={bookingsList} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Support requests</h3>
              <button className="text-action" type="button" onClick={openTicket}>New request</button>
            </div>

            <div className="support-list">
              {support.map((item) => (
                <div key={item.title} className="support-item">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <span className="priority-tag">{item.priority}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SchedulePanel schedule={scheduleList} onDetails={setSelectedScheduleItem} onOpenCalendar={() => setActiveTab('Bookings')} />
      </>
    )
  }

  void renderTabContent

  const handleBookingChange = (field, value) => {
    setBookingForm((current) => ({ ...current, [field]: value }))
  }

  const handleBookingSubmit = async (event) => {
    event.preventDefault()

    const facility = bookingForm.facility
    const date = bookingForm.date
    const time = bookingForm.time

    try {
      const facilitiesResponse = await fetch(`${API_BASE_URL}/Facilities`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const availableFacilities = await facilitiesResponse.json()
      const selectedFacility = availableFacilities.find((item) => item.name === facility)

      if (!selectedFacility) {
        setBookingNotice('The selected facility is not available in the database.')
        return
      }

      const [hours, minutes] = time.split(':').map(Number)
      const endTime = `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          facilityId: selectedFacility.id,
          bookingDate: `${date}T00:00:00.000Z`,
          startTime: `${time}:00`,
          endTime,
          status: bookingForm.status,
        }),
      })

      if (!response.ok) {
        setBookingNotice(await response.text() || 'Booking could not be saved.')
        return
      }

      const savedBooking = await response.json()
      setBookingsList((current) => [formatBooking(savedBooking), ...current])
      if (date === new Date().toISOString().slice(0, 10)) {
        setScheduleList((current) => [...current, formatScheduleBooking(savedBooking)])
      }
      setBookingNotice(`Booking confirmed for ${facility} on ${date} at ${time}. Saved to the database.`)
    } catch {
      setBookingNotice('The API is unavailable. Start the backend on port 5187 and try again.')
      return
    }

    setIsBookingOpen(false)
    setBookingForm(initialBookingForm)
    setActiveTab('Bookings')
  }

  if (!loggedIn && showAuthPanel) {
    if (showForgotPassword) {
      return (
        <div className="auth-shell">
          <div className="auth-card">
            <div className="brand-mark-large">S</div>
            <p className="eyebrow">SmartSports</p>
            <h1>Reset password</h1>
            <p className="auth-subtitle">Enter your email and we will send reset instructions.</p>

            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>

            <button className="primary-btn full" onClick={() => {
              setShowForgotPassword(false)
              setAuthFeedback('Password reset request sent. Please sign in with your updated password.')
            }}>Send reset link</button>

            <button className="secondary-btn full" onClick={() => setShowForgotPassword(false)}>Back to login</button>
          </div>
        </div>
      )
    }

    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-mark-large">S</div>
          <p className="eyebrow">SmartSports</p>
          <h1>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Register first, then sign in to manage bookings, facilities and rewards.'
              : 'Create a member account to access the SmartSports dashboard.'}
          </p>

          {authFeedback && <div className="auth-feedback">{authFeedback}</div>}

          {authMode === 'register' ? (
            <>
              <label className="field">
                <span>Full name</span>
                <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Aisha Jordan" />
              </label>

              <label className="field">
                <span>Email</span>
                <input value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="name@example.com" />
              </label>

              <label className="field">
                <span>Password</span>
                <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} placeholder="••••••••" />
              </label>

              <label className="field">
                <span>Confirm password</span>
                <input type="password" value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} placeholder="••••••••" />
              </label>

              <button className="primary-btn full" onClick={handleRegister}>Create account</button>
              <button className="secondary-btn full" onClick={() => {
                setAuthMode('login')
                setAuthFeedback('')
              }}>Back to login</button>
            </>
          ) : (
            <>
              <label className="field">
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </label>

              <label className="field">
                <span>Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" />
              </label>

              <button className="primary-btn full" onClick={handleLogin}>Sign in</button>
              <button className="secondary-btn full" type="button" onClick={() => setAuthMode('register')}>Register as member</button>
              <button className="text-link-btn" type="button" onClick={() => setShowForgotPassword(true)}>
                Forgot password?
              </button>
              <button className="text-link-btn" type="button" onClick={() => setShowAuthPanel(false)}>
                Continue browsing
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">SmartSports</p>
            <h2>Member portal</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={item === activeTab ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <div className="avatar">{currentUser?.name ? currentUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : 'AJ'}</div>
          <div>
            <strong>{currentUser?.name || 'Guest visitor'}</strong>
            <span>{currentUser?.role === 'admin' ? 'Admin access' : 'Member account'}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow subtle">Dashboard</p>
            <h1>{activeTab}</h1>
          </div>

          <div className="topbar-actions">
            <button className="secondary-btn" type="button" onClick={goBack} disabled={!tabHistory.length}>← Back</button>
            <button className="secondary-btn theme-toggle" type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
            </button>
            <button className="secondary-btn" onClick={() => setActiveTab('Bookings')}>View calendar</button>
            {!loggedIn && <button className="primary-btn" type="button" onClick={() => {
              setAuthMode('login')
              setShowAuthPanel(true)
              setAuthFeedback('')
            }}>Log in</button>}
            <button className="primary-btn" onClick={openBooking}>Book now</button>
            {loggedIn && <button className="secondary-btn" type="button" onClick={() => {
              setLoggedIn(false)
              setCurrentUser(null)
              setAuthMode('login')
              setShowForgotPassword(false)
              setPassword('')
              setAuthFeedback('')
              setShowAuthPanel(false)
            }}>Sign out</button>}
          </div>
        </header>

        {bookingNotice && <div className="booking-notice">{bookingNotice}</div>}

        {renderPage()}
      </main>

      {isBookingOpen && (
        <div className="booking-modal-backdrop" onClick={() => setIsBookingOpen(false)}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow subtle">New booking</p>
                <h3>Reserve a facility</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setIsBookingOpen(false)}>×</button>
            </div>

            <form className="booking-form" onSubmit={handleBookingSubmit}>
              <label>
                <span>Facility</span>
                <select value={bookingForm.facility} onChange={(event) => handleBookingChange('facility', event.target.value)}>
                  {facilitiesList.map((item) => (
                    <option key={item.id || item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <div className="form-row">
                <label>
                  <span>Date</span>
                  <input type="date" value={bookingForm.date} onChange={(event) => handleBookingChange('date', event.target.value)} />
                </label>

                <label>
                  <span>Time</span>
                  <input type="time" value={bookingForm.time} onChange={(event) => handleBookingChange('time', event.target.value)} />
                </label>
              </div>

              <label>
                <span>Guests</span>
                <input type="number" min="1" max="12" value={bookingForm.guests} onChange={(event) => handleBookingChange('guests', event.target.value)} />
              </label>

              <label>
                <span>Status</span>
                <select value={bookingForm.status} onChange={(event) => handleBookingChange('status', event.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsBookingOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Confirm booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAIRequestOpen && <AIWorkflowRequestModal form={aiRequestForm} onChange={handleAIRequestChange} onSubmit={handleAIRequestSubmit} onClose={() => setIsAIRequestOpen(false)} />}

      {isTicketOpen && (
        <div className="booking-modal-backdrop" onClick={() => setIsTicketOpen(false)}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow subtle">Support centre</p>
                <h3>Create support ticket</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setIsTicketOpen(false)}>×</button>
            </div>
            <form className="booking-form" onSubmit={handleTicketSubmit}>
              <label>
                <span>Subject</span>
                <input value={ticketForm.subject} onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Describe your request" required />
              </label>
              <label>
                <span>Priority</span>
                <select value={ticketForm.priority} onChange={(event) => setTicketForm((current) => ({ ...current, priority: event.target.value }))}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <label>
                <span>Details</span>
                <textarea value={ticketForm.detail} onChange={(event) => setTicketForm((current) => ({ ...current, detail: event.target.value }))} placeholder="Tell the facilities team how they can help" rows="5" required />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsTicketOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Submit ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTimetableOpen && (
        <div className="booking-modal-backdrop" onClick={() => setIsTimetableOpen(false)}>
          <div className="booking-modal timetable-modal" onClick={(event) => event.stopPropagation()}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow subtle">Live availability</p>
                <h3>Sports facility timetable</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setIsTimetableOpen(false)}>×</button>
            </div>
            <p className="modal-description">Choose a slot below to start a booking. Green slots are available and amber slots are nearly full.</p>
            <div className="timetable-grid">
              {facilitiesList.slice(0, 6).map((facility) => (
                <article className="timetable-card" key={facility.name}>
                  <div className="timetable-title">
                    <span className="facility-icon">{facility.icon}</span>
                    <div>
                      <strong>{facility.name}</strong>
                      <small>{facility.type}</small>
                    </div>
                  </div>
                  <div className="slot-list">
                    {['08:00', '10:30', '17:30'].map((slot, index) => (
                      <button
                        key={slot}
                        type="button"
                        className={index === 2 ? 'slot nearly-full' : 'slot available'}
                        onClick={() => {
                          setBookingForm((current) => ({ ...current, facility: facility.name, time: slot }))
                          setIsTimetableOpen(false)
                          openBooking()
                        }}
                      >
                        {slot} <small>{index === 2 ? 'Nearly full' : 'Available'}</small>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedScheduleItem && (
        <div className="booking-modal-backdrop" onClick={() => setSelectedScheduleItem(null)}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow subtle">Today’s schedule</p>
                <h3>{selectedScheduleItem.title}</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setSelectedScheduleItem(null)}>×</button>
            </div>
            <div className="schedule-detail">
              <div>
                <div>
                <span>Title: </span>
                <strong>{selectedScheduleItem.title}</strong>
              </div> 
                <span>Time: </span>
                <strong>{selectedScheduleItem.time}</strong>
              </div>
              <div>
                <span>Coach: </span>
                <strong>{selectedScheduleItem.coach}</strong>
              </div>
              <div>
                <span>Event Date: </span>
                <strong>{selectedScheduleItem.eventDate}</strong>
              </div>
 
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
