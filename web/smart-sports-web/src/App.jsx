import { useState, useEffect } from 'react'
import './App.css'
import BookingList from './components/BookingList'
import SchedulePanel from './components/SchedulePanel'
import AgenticRagModal from './components/AgenticRagModal'
import OverviewPage from './pages/OverviewPage'
import FacilitiesPage from './pages/FacilitiesPage'
import BookingsPage from './pages/BookingsPage'
import SupportPage from './pages/SupportPage'
import SupportConversationPage from './pages/SupportConversationPage'
import MembersPage from './pages/MembersPage'
import AIWorkflowsPage from './pages/AIWorkflowsPage'
import WorkflowHistoryPage from './pages/WorkflowHistoryPage'
import BookingWizard from './components/BookingWizard'
import FacilityDetailsPage from './pages/FacilityDetailsPage'
import ReviewModal from './components/ReviewModal'
import RevenuePage from './pages/RevenuePage'

const API_BASE_URL = 'http://localhost:5187/api'
const localDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const baseNavItems = ['Overview', 'Facilities', 'Bookings', 'Support', 'My AI Requests']
const adminNavItems = [...baseNavItems, 'Revenue', 'Members', 'AI Workflows']

const initialBookingForm = {
  facility: 'Badminton Court',
  date: localDateString(),
  time: '18:00',
  guests: '2',
  status: 'Pending',
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
  { title: 'Membership query', detail: 'Checking membership details', priority: 'Low' },
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
  const [registerContactNumber, setRegisterContactNumber] = useState('')
  const [registerNicNumber, setRegisterNicNumber] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [authFeedback, setAuthFeedback] = useState('')
  const [otpPendingEmail, setOtpPendingEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [registeredMembers, setRegisteredMembers] = useState([])
  const [bookingsList, setBookingsList] = useState([])
  const [reviewsList, setReviewsList] = useState([])
  const [reviewBooking, setReviewBooking] = useState(null)
  const [scheduleList, setScheduleList] = useState([])
  const [supportList, setSupportList] = useState([])
  const [selectedSupportRequest, setSelectedSupportRequest] = useState(null)
  const [facilitiesList, setFacilitiesList] = useState([])
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [isAIBooking, setIsAIBooking] = useState(false)
  const [bookingForm, setBookingForm] = useState(initialBookingForm)
  const [bookingNotice, setBookingNotice] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [isTimetableOpen, setIsTimetableOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [isAIRequestOpen, setIsAIRequestOpen] = useState(false)
  const [workflowForm, setWorkflowForm] = useState({
    objective: '16-Team Inter-University Badminton Championship (4 Court Slots)',
    facilityType: 'Badminton',
    date: localDateString(new Date(Date.now() + 86400000)),
    startTime: '09:00',
    endTime: '12:00',
    guests: '24',
    budget: '35000'
  })
  const [workflowLoading, setWorkflowLoading] = useState(false)
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

  const formatBooking = (booking, review = null) => ({
    id: booking.id,
    name: `${booking.facility?.name ?? 'Facility'} • booking`,
    date: `${new Date(booking.bookingDate).toLocaleDateString()} • ${booking.startTime.slice(0, 5)}`,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    customerName: booking.customerName,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    bankSlipFileName: booking.bankSlipFileName,
    cancellationReason: booking.cancellationReason,
    review,
  })

  const formatFacility = (facility) => ({
    ...facility,
    faq: parseJsonArray(facility.faq),
    images: parseJsonArray(facility.images),
    hourlyRate: Number(facility.hourlyRate ?? 0),
    price: `LKR ${Number(facility.hourlyRate ?? 0).toLocaleString()} / hour`,
    status: facility.isAvailable ? 'Available now' : 'Unavailable',
    accent: ['green', 'blue', 'purple'][facility.id % 3] || 'green',
    icon: '🏟️',
  })

  const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value
    try { return JSON.parse(value || '[]') } catch { return [] }
  }

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
    const payload = await response.json()
    const savedBookings = payload.items ?? payload
    const reviewByBooking = Object.fromEntries(reviewsList.map((review) => [review.bookingId, review]))
    setBookingsList(savedBookings.map((booking) => formatBooking(booking, reviewByBooking[booking.id])))
    setScheduleList((current) => [
      ...current.filter((item) => !String(item.id).startsWith('booking-')),
      ...savedBookings.filter((item) => item.bookingDate.slice(0, 10) === new Date().toISOString().slice(0, 10)).map(formatScheduleBooking),
    ])
  }

  const loadReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`)
      if (!response.ok) return
      const savedReviews = await response.json()
      setReviewsList(savedReviews)
      setBookingsList((current) => current.map((booking) => ({ ...booking, review: savedReviews.find((review) => review.bookingId === booking.id) || null })))
    } catch {
      // Keep the dashboard usable when reviews are unavailable
    }
  }

  const loadSupportRequests = async (token = authToken) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/support-requests`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (response.ok) setSupportList(await response.json())
  }

  const loadMembers = async (token) => {
    const response = await fetch(`${API_BASE_URL}/members`, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setRegisteredMembers(await response.json())
  }

  const loadFacilities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/Facilities?pageSize=100`)
      if (response.ok) {
        const payload = await response.json()
        const savedFacilities = payload.items ?? payload
        if (Array.isArray(savedFacilities) && savedFacilities.length > 0) {
          const formatted = savedFacilities.map(formatFacility)
          setFacilitiesList(formatted)
          setBookingForm((prev) => ({
            ...prev,
            facility: formatted.some((f) => f.name === prev.facility) ? prev.facility : formatted[0].name
          }))
        }
      }
    } catch {
      // Keep static defaults on network failure
    }
  }

  useEffect(() => {
    loadFacilities()
    loadSupportRequests()
    loadReviews()
  }, [])

  const formatWorkflow = (workflow) => {
    let proposal = {}
    let validation = {}
    let plan = {}
    try { proposal = JSON.parse(workflow.proposalJson || '{}') } catch {}
    try { validation = JSON.parse(workflow.validationJson || '{}') } catch {}
    try { plan = JSON.parse(workflow.planJson || '{}') } catch {}

    const detailedSteps = (workflow.steps || []).map((step) => {
      let toolsCalled = []
      try { toolsCalled = JSON.parse(step.toolsCalledJson || '[]') } catch {}
      return {
        ...step,
        toolsCalled
      }
    })

    return {
      id: workflow.workflowId,
      objective: workflow.objective,
      facility: proposal.facilityName ?? workflow.facilityType,
      facilityType: workflow.facilityType,
      date: new Date(workflow.requestedStart).toLocaleString(),
      requestedStart: workflow.requestedStart,
      requestedEnd: workflow.requestedEnd,
      guests: workflow.guests,
      budget: workflow.budget,
      quotation: proposal.estimatedCost ? `LKR ${proposal.estimatedCost.toLocaleString()}` : `LKR ${workflow.budget.toLocaleString()}`,
      status: workflow.status === 'PendingManagerApproval' ? 'Pending manager approval' : workflow.status === 'RevisionRequested' ? 'Revision requested' : workflow.status,
      rawValidation: validation,
      validation: validation.passedRules || Object.entries(validation).map(([key, value]) => `${key}: ${value ? 'passed' : 'failed'}`),
      steps: workflow.steps?.map((step) => step.agentName) ?? [],
      detailedSteps,
      plan,
      proposal,
      executionDurationMs: workflow.executionDurationMs || 0,
      decisionBy: workflow.decisionBy,
      approvalComment: workflow.approvalComment,
      finalOutcome: workflow.finalOutcome,
      auditEvents: workflow.auditEvents || [],
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

  const updateBookingStatus = async (booking, status, reason = null) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status, reason }),
    })
    if (!response.ok) {
      setBookingNotice(await response.text() || 'Booking status could not be updated.')
      return
    }
    const updated = await response.json()
    setBookingsList((current) => current.map((item) => item.id === updated.id ? formatBooking(updated) : item))
    setBookingNotice(`Booking ${status.toLowerCase()}${reason ? ` with reason: "${reason}".` : '.'}`)
  }

  const openReview = (booking) => {
    const selectedBooking = booking.bookingId
      ? bookingsList.find((item) => item.id === booking.bookingId) || { id: booking.bookingId, name: `${booking.facilityName || 'Facility'} • booking`, review: booking }
      : booking
    if (requireLogin('Please log in before leaving a review.')) setReviewBooking(selectedBooking)
  }

  const saveReview = async (form) => {
    const payload = new FormData()
    payload.append('BookingId', String(form.bookingId))
    payload.append('Name', form.name)
    payload.append('Rating', String(form.rating))
    payload.append('Review', form.review)
    form.photos.forEach((photo) => payload.append('Photos', photo))
    const response = await fetch(`${API_BASE_URL}/reviews${form.reviewId ? `/${form.reviewId}` : ''}`, {
      method: form.reviewId ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: payload,
    })
    if (!response.ok) {
      setBookingNotice(await response.text() || 'The review could not be saved.')
      return
    }
    const savedReview = await response.json()
    setReviewsList((current) => form.reviewId ? current.map((review) => review.id === savedReview.id ? savedReview : review) : [savedReview, ...current])
    setBookingsList((current) => current.map((booking) => booking.id === savedReview.bookingId ? { ...booking, review: savedReview } : booking))
    setReviewBooking(null)
    setBookingNotice(form.reviewId ? 'Review updated.' : 'Review submitted. Thanks for sharing your experience.')
  }

  const deleteReview = async (review) => {
    if (!window.confirm('Delete this review?')) return
    const response = await fetch(`${API_BASE_URL}/reviews/${review.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } })
    if (!response.ok) {
      setBookingNotice(await response.text() || 'The review could not be deleted.')
      return
    }
    setReviewsList((current) => current.filter((item) => item.id !== review.id))
    setBookingsList((current) => current.map((booking) => booking.id === review.bookingId ? { ...booking, review: null } : booking))
    setBookingNotice('Review deleted.')
  }


  const viewBankSlip = async (booking) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/bank-slip`, { headers: { Authorization: `Bearer ${authToken}` } })
    if (!response.ok) {
      setBookingNotice('The bank slip could not be loaded.')
      return
    }
    const url = URL.createObjectURL(await response.blob())
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const decideWorkflow = async (workflowId, action) => {
    const response = await fetch(`${API_BASE_URL}/booking-workflows/${workflowId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ comment: workflowDecision.trim() }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => null)
      setBookingNotice(err?.error || 'Workflow decision could not be saved.')
      return
    }
    const updatedWorkflow = formatWorkflow(await response.json())
    setWorkflowRequests((current) => current.map((item) => item.id === workflowId ? { ...item, ...updatedWorkflow, decision: workflowDecision.trim() } : item))
    setWorkflowDecision('')
    await loadBookings(authToken)
    setBookingNotice(action === 'approve' ? 'Workflow approved and booking created.' : action === 'revise' ? 'Revision requested and recorded.' : 'Workflow rejected safely.')
  }

  const navItems = ['admin', 'manager'].includes(currentUser?.role) ? adminNavItems : baseNavItems

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
      setIsAIBooking(false)
      setIsBookingOpen(true)
    }
  }

  const openFacilityBooking = (facility) => {
    setBookingForm((current) => ({ ...current, facility: facility.name }))
    openBooking()
  }

  const saveFacility = async (facility, id) => {
    const response = await fetch(`${API_BASE_URL}/Facilities${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ ...facility, id: id || 0, hourlyRate: Number(facility.hourlyRate), faq: JSON.stringify(facility.faq ?? []), images: JSON.stringify(facility.images ?? []) }),
    })
    if (!response.ok) throw new Error(await response.text() || 'Facility could not be saved.')
    const saved = id ? { ...facility, id } : await response.json()
    setFacilitiesList((current) => id
      ? current.map((item) => item.id === id ? formatFacility(saved) : item)
      : [...current, formatFacility(saved)])
  }

  const deleteFacility = async (id) => {
    const response = await fetch(`${API_BASE_URL}/Facilities/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!response.ok) throw new Error(await response.text() || 'Facility could not be deleted.')
    setFacilitiesList((current) => current.filter((item) => item.id !== id))
  }

  const openTicket = () => {
    if (requireLogin('Please log in before creating a support ticket.')) {
      setIsTicketOpen(true)
    }
  }

  const openAIRequest = () => {
    setIsAIRequestOpen(true)
  }

  const handleWorkflowFormChange = (field, value) => {
    setWorkflowForm((current) => ({ ...current, [field]: value }))
  }

  const handleLaunchWorkflow = async (event) => {
    if (event) event.preventDefault()
    if (!requireLogin('Please log in before launching an AI booking workflow.')) return

    setWorkflowLoading(true)
    try {
      const requestedStart = `${workflowForm.date}T${workflowForm.startTime}:00Z`
      const requestedEnd = `${workflowForm.date}T${workflowForm.endTime}:00Z`

      const response = await fetch(`${API_BASE_URL}/booking-workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          objective: workflowForm.objective,
          facilityType: workflowForm.facilityType,
          requestedStart,
          requestedEnd,
          guests: Number(workflowForm.guests),
          budget: Number(workflowForm.budget),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        setBookingNotice(err?.error || 'AI workflow request could not be started.')
        return
      }

      const workflow = formatWorkflow(await response.json())
      setWorkflowRequests((current) => [workflow, ...current])
      setWorkflowHistory((current) => [workflow, ...current])
      setIsAIRequestOpen(false)
      setActiveTab('My AI Requests')
      setBookingNotice('AI Workflow initiated! The proposal is pending manager approval.')
    } catch {
      setBookingNotice('Could not connect to API to start the workflow.')
    } finally {
      setWorkflowLoading(false)
    }
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    if (!ticketForm.subject.trim() || !ticketForm.detail.trim()) return
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/support-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
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

  const updateSupportStatus = async (request, status) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/support-requests/${request.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      setBookingNotice(await response.text() || 'Support status could not be updated.')
      return
    }
    const updated = await response.json()
    setSupportList((current) => current.map((item) => item.id === updated.id ? updated : item))
    setBookingNotice(`Support request marked ${status.toLowerCase()}.`)
  }

  const [dashStats, setDashStats] = useState({ bookingsToday: '--', memberSatisfaction: '--', facilitiesCount: 0, totalBookings: 0, confirmedBookings: 0, bookingsByFacility: [] })

  const loadDashStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`)
      if (response.ok) setDashStats(await response.json())
    } catch {
      // keep defaults on network error
    }
  }

  // Load stats on mount and every 30 s
  useEffect(() => {
    loadDashStats()
    const interval = setInterval(loadDashStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderPage = () => {
    const dynamicStats = [
      { label: 'Facilities', value: String(dashStats.facilitiesCount || facilitiesList.length), tone: 'green' },
      { label: 'Bookings today', value: String(dashStats.bookingsToday), tone: 'blue' },
      { label: 'Confirmed bookings', value: String(dashStats.confirmedBookings || 0), tone: 'purple' },
      { label: 'Member satisfaction', value: dashStats.memberSatisfaction, tone: 'orange' },
    ]

    if (activeTab === 'Members') return <MembersPage members={registeredMembers} />
    if (activeTab === 'AI Workflows') return <AIWorkflowsPage workflows={workflowRequests} decision={workflowDecision} onDecisionChange={setWorkflowDecision} onRequestRevision={(id) => decideWorkflow(id, 'revise')} onReject={(id) => decideWorkflow(id, 'reject')} onApprove={(id) => decideWorkflow(id, 'approve')} />
    if (activeTab === 'Revenue') return <RevenuePage apiBaseUrl={API_BASE_URL} token={authToken} />
    if (activeTab === 'My AI Requests') return <WorkflowHistoryPage workflows={workflowHistory} />
    if (activeTab === 'Facilities') return selectedFacility ? <FacilityDetailsPage facility={selectedFacility} onBack={() => setSelectedFacility(null)} onBook={openFacilityBooking} /> : <FacilitiesPage facilities={facilitiesList} isAdmin={currentUser?.role === 'admin'} onDetails={setSelectedFacility} onBook={openFacilityBooking} onSave={saveFacility} onDelete={deleteFacility} />
    if (activeTab === 'Bookings') return <BookingsPage bookings={bookingsList} isAdmin={['admin', 'manager'].includes(currentUser?.role)} onNewBooking={openBooking} onStatusChange={updateBookingStatus} onViewSlip={viewBankSlip} onReview={openReview} />
    if (activeTab === 'Support') return selectedSupportRequest ? <SupportConversationPage request={selectedSupportRequest} token={authToken} apiBaseUrl={API_BASE_URL} onBack={() => setSelectedSupportRequest(null)} /> : <SupportPage requests={supportList} onAddTicket={openTicket} isAdmin={['admin', 'manager', 'staff'].includes(currentUser?.role)} onStatusChange={updateSupportStatus} onOpenRequest={setSelectedSupportRequest} />
    const ratedFacilities = facilitiesList.filter((facility) => facility.rating != null)
    const averageRating = ratedFacilities.length ? (ratedFacilities.reduce((sum, facility) => sum + facility.rating, 0) / ratedFacilities.length).toFixed(1) : null
    return <OverviewPage heroMessage={heroMessage} stats={dynamicStats} facilities={facilitiesList.slice(0, 4)} bookings={bookingsList} support={supportList} schedule={scheduleList} analytics={dashStats.bookingsByFacility} averageRating={averageRating} reviews={reviewsList} apiBaseUrl={API_BASE_URL} currentUser={currentUser} onBooking={openBooking} onAIRequest={openAIRequest} onTicket={openTicket} onFacilities={() => setActiveTab('Facilities')} onSchedule={() => setActiveTab('Bookings')} onBookings={() => setActiveTab('Bookings')} onDetails={setSelectedScheduleItem} onReview={openReview} onEditReview={openReview} onDeleteReview={deleteReview} />
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
      setCurrentUser({ id: result.userId, name: result.fullName, email: result.email, contactNumber: result.contactNumber, nicNumber: result.nicNumber, role: result.role?.toLowerCase() })
      setLoggedIn(true)
      setShowAuthPanel(false)
      setActiveTab('Overview')
      setAuthFeedback('')
      setPassword('')
      await loadBookings(result.token)
      await loadReviews()
      await loadSupportRequests(result.token)
      await loadFacilities()
      await loadWorkflowHistory(result.token)
      if (['admin', 'manager'].includes(result.role?.toLowerCase())) {
        await loadMembers(result.token)
        await loadWorkflows(result.token)
      }
    } catch {
      setAuthFeedback('The API is unavailable. Start the backend on port 5187 and try again.')
      return
    }
  }

  const handleRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerContactNumber.trim() || !registerNicNumber.trim() || !registerPassword || !registerConfirmPassword) {
      setAuthFeedback('Please complete all registration fields.')
      return
    }

    if (!/^\d{10}$/.test(registerContactNumber)) {
      setAuthFeedback('Contact number must contain exactly 10 digits.')
      return
    }

    if (!/^(\d{9}[VvXx]|\d{12})$/.test(registerNicNumber)) {
      setAuthFeedback('NIC must be 12 digits or 9 digits followed by V or X.')
      return
    }

    if (registerPassword.length < 8 || !/[A-Z]/.test(registerPassword) || !/[a-z]/.test(registerPassword) || !/\d/.test(registerPassword) || !/[^A-Za-z0-9]/.test(registerPassword)) {
      setAuthFeedback('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.')
      return
    }

    if (registerPassword !== registerConfirmPassword) {
      setAuthFeedback('Passwords do not match. Please try again.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: registerName.trim(), email: registerEmail.trim(), contactNumber: registerContactNumber.trim(), nicNumber: registerNicNumber.trim(), password: registerPassword }),
      })

      if (!response.ok) {
        const err = await response.text()
        setAuthFeedback(err || 'Registration failed.')
        return
      }

      const data = await response.json().catch(() => ({}))

      // Move to OTP verification step
      setOtpPendingEmail(registerEmail.trim().toLowerCase())
      if (data.devOtp) {
        setOtpValue(data.devOtp)
        setAuthFeedback(`SMTP is not configured. For development testing, your verification code is ${data.devOtp} (auto-filled below).`)
      } else {
        setOtpValue('')
        setAuthFeedback(data.message || 'A 6-digit verification code has been sent to your email.')
      }
      setAuthMode('verify-otp')
    } catch {
      setAuthFeedback('The API is unavailable. Start the backend and try again.')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpValue.trim() || otpValue.trim().length !== 6) {
      setAuthFeedback('Please enter the 6-digit OTP sent to your email.')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpPendingEmail, otp: otpValue.trim() }),
      })
      if (!response.ok) {
        const err = await response.text()
        setAuthFeedback(err || 'OTP verification failed.')
        return
      }
      setEmail(otpPendingEmail)
      setPassword('')
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')
      setRegisterConfirmPassword('')
      setOtpPendingEmail('')
      setOtpValue('')
      setAuthFeedback('Account verified! You can now sign in.')
      setAuthMode('login')
    } catch {
      setAuthFeedback('The API is unavailable. Start the backend and try again.')
    }
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
          </div>
          <div className="facility-list">
            {facilities.map((facility) => (
              <div key={facility.name} className={`facility-card ${facility.accent}`}>
                <div className="facility-icon">{facility.icon}</div>
                <div className="facility-body">
                  <div className="facility-topline">
                    <h4>{facility.name}</h4>
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
              <button className="secondary-btn light" onClick={openAIRequest}>Ask AI</button>
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

        <SchedulePanel schedule={scheduleList} onDetails={setSelectedScheduleItem} />
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
      if (!facilitiesResponse.ok) {
        setBookingNotice(await facilitiesResponse.text() || 'Facilities could not be loaded.')
        return
      }
      const facilitiesPayload = await facilitiesResponse.json()
      const availableFacilities = facilitiesPayload.items ?? facilitiesPayload
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

  const handleWizardCreated = (savedBooking) => {
    setBookingsList((current) => [formatBooking(savedBooking), ...current])
    if (savedBooking.bookingDate?.slice(0, 10) === new Date().toISOString().slice(0, 10)) {
      setScheduleList((current) => [...current, formatScheduleBooking(savedBooking)])
    }
    setBookingNotice(`Booking submitted for ${savedBooking.facility?.name ?? 'the selected facility'}.`)
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
          <h1>
            {authMode === 'login' ? 'Welcome back' : authMode === 'verify-otp' ? 'Verify your email' : 'Create account'}
          </h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Register first, then sign in to manage bookings and facilities.'
              : authMode === 'verify-otp'
              ? `Enter the 6-digit code sent to ${otpPendingEmail}.`
              : 'Create a member account to access the SmartSports dashboard.'}
          </p>

          {authFeedback && <div className="auth-feedback">{authFeedback}</div>}

          {authMode === 'verify-otp' ? (
            <>
              <label className="field">
                <span>Verification Code (OTP)</span>
                <input
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 482910"
                  maxLength={6}
                  inputMode="numeric"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.6rem', fontWeight: '800' }}
                />
              </label>

              <button className="primary-btn full" onClick={handleVerifyOtp}>Verify & Create Account</button>
              <button className="secondary-btn full" onClick={() => { setAuthMode('register'); setAuthFeedback('') }}>Back</button>
            </>
          ) : authMode === 'register' ? (
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
                <span>Contact number</span>
                <input type="tel" inputMode="numeric" maxLength={10} value={registerContactNumber} onChange={(e) => setRegisterContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0771234567" />
              </label>

              <label className="field">
                <span>NIC number</span>
                <input maxLength={12} value={registerNicNumber} onChange={(e) => setRegisterNicNumber(e.target.value.replace(/[^0-9vVxX]/g, '').slice(0, 12))} placeholder="123456789V or 200012345678" />
              </label>

              <label className="field">
                <span>Password</span>
                <input type="password" minLength="8" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} placeholder="8+ chars, upper/lower/number/symbol" />
              </label>

              <label className="field">
                <span>Confirm password</span>
                <input type="password" value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} placeholder="••••••••" />
              </label>

              <button className="primary-btn full" onClick={handleRegister}>Send verification code</button>
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
            <button className="secondary-btn rag-btn" type="button" onClick={openAIRequest}>
              🤖 Ask RAG AI
            </button>
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

      {isBookingOpen && <BookingWizard facilities={facilitiesList} initialFacilityName={bookingForm.facility} initialDate={bookingForm.date} initialStartTime={bookingForm.time} initialHoursNeeded={bookingForm.hoursNeeded} customer={currentUser} skipCustomerDetails={isAIBooking} token={authToken} apiBaseUrl={API_BASE_URL} isAdmin={currentUser?.role === 'admin'} onClose={() => setIsBookingOpen(false)} onCreated={handleWizardCreated} />}

      {isAIRequestOpen && (
        <AgenticRagModal
          apiBaseUrl={API_BASE_URL}
          token={authToken}
          currentUser={currentUser}
          onClose={() => setIsAIRequestOpen(false)}
          onLaunchWorkflow={handleLaunchWorkflow}
          workflowForm={workflowForm}
          onWorkflowFormChange={handleWorkflowFormChange}
          isWorkflowLoading={workflowLoading}
        />
      )}

      {reviewBooking && <ReviewModal booking={reviewBooking} existingReview={reviewBooking.review} onSubmit={saveReview} onClose={() => setReviewBooking(null)} />}

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
                <span>Name: </span>
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
