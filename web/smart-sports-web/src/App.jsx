import { useState, useEffect } from 'react'
import './App.css'
import BookingList from './components/BookingList'
import SchedulePanel from './components/SchedulePanel'
import OverviewPage from './pages/OverviewPage'
import FacilitiesPage from './pages/FacilitiesPage'
import BookingsPage from './pages/BookingsPage'
import SupportPage from './pages/SupportPage'
import SupportConversationPage from './pages/SupportConversationPage'
import MembersPage from './pages/MembersPage'
import BookingWizard from './components/BookingWizard'
import FacilityDetailsPage from './pages/FacilityDetailsPage'
import ReviewModal from './components/ReviewModal'
import RevenuePage from './pages/RevenuePage'
import NotificationBell from './components/NotificationBell'

const API_BASE_URL = 'http://localhost:5187/api'
const localDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const baseNavItems = ['Overview', 'Facilities', 'Bookings', 'Support']
const adminNavItems = [...baseNavItems, 'Revenue', 'Members']

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
  const [bookingForm, setBookingForm] = useState(initialBookingForm)
  const [bookingNotice, setBookingNotice] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [isTimetableOpen, setIsTimetableOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [ticketForm, setTicketForm] = useState({ subject: '', detail: '', priority: 'Medium' })
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('smartsports_role_notifications')
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: 1,
              role: 'admin',
              type: 'refund_pending',
              title: 'Refund Policy Alert',
              message: 'Verify and confirm cancellation refunds in Bookings > To Refund filter.',
              timestamp: new Date().toISOString(),
              read: false,
            },
            {
              id: 2,
              role: 'user',
              type: 'reschedule_requested',
              title: 'Weather Policy Info',
              message: 'Outdoor bookings impacted by adverse weather are eligible for 100% free rain-check rescheduling.',
              timestamp: new Date().toISOString(),
              read: false,
            },
          ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('smartsports_role_notifications', JSON.stringify(notifications))
    } catch {}
  }, [notifications])

  const addNotification = (notif) => {
    setNotifications((prev) => [
      {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notif,
      },
      ...prev,
    ])
  }

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
    userId: booking.userId,
    facilityId: booking.facilityId,
    facility: booking.facility,
    facilityName: booking.facility?.name ?? 'Facility',
    name: `${booking.facility?.name ?? 'Facility'} • booking`,
    date: `${new Date(booking.bookingDate).toLocaleDateString()} • ${booking.startTime.slice(0, 5)}`,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    customerName: booking.customerName,
    contactNumber: booking.contactNumber,
    nicNumber: booking.nicNumber,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    hoursNeeded: booking.hoursNeeded,
    totalAmount: booking.totalAmount,
    bankSlipFileName: booking.bankSlipFileName,
    cancellationReason: booking.cancellationReason,
    refundAmount: booking.refundAmount,
    refundPercentage: booking.refundPercentage,
    refundStatus: booking.refundStatus,
    cancelledAt: booking.cancelledAt,
    refundConfirmedAt: booking.refundConfirmedAt,
    refundConfirmedBy: booking.refundConfirmedBy,
    refundNotes: booking.refundNotes,
    isExpired: booking.isExpired,
    isRescheduleRequested: Boolean(booking.isRescheduleRequested || booking.status === 'RescheduleRequested'),
    rescheduleReason: booking.rescheduleReason,
    rescheduleRequestedAt: booking.rescheduleRequestedAt,
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
    const response = await fetch(`${API_BASE_URL}/bookings?pageSize=200`, {
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

  const cancelBookingWithRefund = async (booking, reason = '') => {
    if (!authToken) {
      requireLogin('Please log in before cancelling a booking.')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        let parsed = errorText
        try {
          const json = JSON.parse(errorText)
          parsed = json.message || json.title || errorText
        } catch {}
        setBookingNotice(parsed || 'Booking cancellation failed.')
        return
      }
      const updated = await response.json()
      setBookingsList((current) => current.map((item) => item.id === updated.id ? formatBooking(updated) : item))
      // No green banner notice per user request ("We don't need this green colour sentence")

      // Role-separated notifications
      if (updated.refundPercentage > 0) {
        addNotification({
          role: 'admin',
          type: 'refund_pending',
          title: 'Refund Verification Required',
          message: `Member ${updated.customerName || 'User'} cancelled booking #${updated.id}. Refund of LKR ${Number(updated.refundAmount || 0).toLocaleString()} (${updated.refundPercentage}%) requires confirmation.`,
          bookingId: updated.id,
        })
        addNotification({
          role: 'user',
          type: 'cancelled',
          title: 'Cancellation Submitted',
          message: `Booking #${updated.id} cancelled. Refund of LKR ${Number(updated.refundAmount || 0).toLocaleString()} has been queued for admin verification.`,
          bookingId: updated.id,
        })
      } else {
        addNotification({
          role: 'admin',
          type: 'cancelled',
          title: 'Member Cancellation',
          message: `Booking #${updated.id} cancelled by member. Non-refundable policy applied.`,
          bookingId: updated.id,
        })
        addNotification({
          role: 'user',
          type: 'cancelled',
          title: 'Booking Cancelled',
          message: `Your booking #${updated.id} has been cancelled. Non-refundable per club policy (<12 hrs notice).`,
          bookingId: updated.id,
        })
      }

      await loadBookings(authToken)
    } catch {
      setBookingNotice('Could not connect to the cancellation service.')
    }
  }

  const confirmRefund = async (booking, notes = '') => {
    if (!authToken) {
      requireLogin('Please log in before confirming refunds.')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/confirm-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ notes }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        setBookingNotice(errorText || 'Failed to confirm refund.')
        return
      }
      const updated = await response.json()
      setBookingsList((current) => current.map((item) => item.id === updated.id ? formatBooking(updated) : item))
      setBookingNotice(`Refund verified and confirmed for Booking #${updated.id} (LKR ${Number(updated.refundAmount || 0).toLocaleString()}).`)

      // Role-separated notifications
      addNotification({
        role: 'admin',
        type: 'refund_confirmed',
        title: 'Refund Approved',
        message: `Verified and confirmed refund of LKR ${Number(updated.refundAmount || 0).toLocaleString()} for booking #${updated.id}.`,
        bookingId: updated.id,
      })
      addNotification({
        role: 'user',
        type: 'refund_confirmed',
        title: 'Refund Confirmed',
        message: `Your refund of LKR ${Number(updated.refundAmount || 0).toLocaleString()} for booking #${updated.id} has been verified and confirmed!`,
        bookingId: updated.id,
      })

      await loadBookings(authToken)
    } catch {
      setBookingNotice('Could not connect to the refund confirmation service.')
    }
  }

  const requestReschedule = async (booking, reason = '') => {
    if (!authToken) {
      requireLogin('Please log in before requesting a reschedule.')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/request-reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        setBookingNotice(errorText || 'Failed to send reschedule request.')
        return
      }
      const updated = await response.json()
      setBookingsList((current) => current.map((item) => item.id === updated.id ? formatBooking(updated) : item))
      setBookingNotice(`Reschedule request sent to member for booking #${updated.id}.`)

      // Role-separated notifications
      addNotification({
        role: 'admin',
        type: 'reschedule_requested',
        title: 'Reschedule Request Sent',
        message: `Rain-check reschedule offer sent to member for booking #${updated.id}.`,
        bookingId: updated.id,
      })
      addNotification({
        role: 'user',
        type: 'reschedule_requested',
        title: 'Free Reschedule Offered',
        message: `Management offered a free rain-check reschedule for your booking #${updated.id} (${updated.facility?.name || 'facility'}) due to weather impact.`,
        bookingId: updated.id,
      })

      await loadBookings(authToken)
    } catch {
      setBookingNotice('Could not connect to the rescheduling service.')
    }
  }

  const rescheduleBooking = async (booking, newDate, newStartTime, newEndTime) => {
    if (!authToken) {
      requireLogin('Please log in before rescheduling a booking.')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          bookingDate: `${newDate}T00:00:00.000Z`,
          startTime: newStartTime,
          endTime: newEndTime,
        }),
      })
      if (!response.ok) {
        const errorMsg = await response.text()
        throw new Error(errorMsg || 'Failed to reschedule booking.')
      }
      const updated = await response.json()
      setBookingsList((current) => current.map((item) => item.id === updated.id ? formatBooking(updated) : item))
      setBookingNotice(`Booking #${updated.id} successfully rescheduled for free!`)

      // Role-separated notifications
      addNotification({
        role: 'user',
        type: 'reschedule_accepted',
        title: 'Booking Rescheduled',
        message: `Your booking #${updated.id} has been successfully rescheduled for free!`,
        bookingId: updated.id,
      })
      addNotification({
        role: 'admin',
        type: 'reschedule_accepted',
        title: 'Reschedule Completed',
        message: `Member ${updated.customerName || 'User'} has chosen a new slot for booking #${updated.id}.`,
        bookingId: updated.id,
      })

      await loadBookings(authToken)
    } catch (err) {
      setBookingNotice(err.message || 'Rescheduling failed.')
      throw err
    }
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
    if (activeTab === 'Revenue') return <RevenuePage apiBaseUrl={API_BASE_URL} token={authToken} />
    if (activeTab === 'Facilities') return selectedFacility ? <FacilityDetailsPage facility={selectedFacility} onBack={() => setSelectedFacility(null)} onBook={openFacilityBooking} /> : <FacilitiesPage facilities={facilitiesList} isAdmin={currentUser?.role === 'admin'} onDetails={setSelectedFacility} onBook={openFacilityBooking} onSave={saveFacility} onDelete={deleteFacility} />
    if (activeTab === 'Bookings') return <BookingsPage bookings={bookingsList} facilities={facilitiesList} isAdmin={['admin', 'manager'].includes(currentUser?.role)} token={authToken} apiBaseUrl={API_BASE_URL} onNewBooking={openBooking} onStatusChange={updateBookingStatus} onCancelWithRefund={cancelBookingWithRefund} onConfirmRefund={confirmRefund} onRequestReschedule={requestReschedule} onRescheduleBooking={rescheduleBooking} onViewSlip={viewBankSlip} onReview={openReview} />
    if (activeTab === 'Support') return selectedSupportRequest ? <SupportConversationPage request={selectedSupportRequest} token={authToken} apiBaseUrl={API_BASE_URL} onBack={() => setSelectedSupportRequest(null)} /> : <SupportPage requests={supportList} onAddTicket={openTicket} isAdmin={['admin', 'manager', 'staff'].includes(currentUser?.role)} onStatusChange={updateSupportStatus} onOpenRequest={setSelectedSupportRequest} />
    const ratedFacilities = facilitiesList.filter((facility) => facility.rating != null)
    const averageRating = ratedFacilities.length ? (ratedFacilities.reduce((sum, facility) => sum + facility.rating, 0) / ratedFacilities.length).toFixed(1) : null
    return <OverviewPage heroMessage={heroMessage} stats={dynamicStats} facilities={facilitiesList.slice(0, 4)} bookings={bookingsList} support={supportList} schedule={scheduleList} analytics={dashStats.bookingsByFacility} averageRating={averageRating} reviews={reviewsList} apiBaseUrl={API_BASE_URL} currentUser={currentUser} onBooking={openBooking} onTicket={openTicket} onFacilities={() => setActiveTab('Facilities')} onSchedule={() => setActiveTab('Bookings')} onBookings={() => setActiveTab('Bookings')} onDetails={setSelectedScheduleItem} onReview={openReview} onEditReview={openReview} onDeleteReview={deleteReview} onCancel={() => setActiveTab('Bookings')} onReschedule={() => setActiveTab('Bookings')} />
  }

  const heroMessage = (() => {
    if (activeTab === 'Facilities') return 'Book a premium facility that fits your training plan.'
    if (activeTab === 'Bookings') return 'Manage your upcoming games and reservation updates in one place.'
    if (activeTab === 'Support') return 'Track support requests and get help from the facilities team.'
    if (activeTab === 'Members') return 'Review member activity, access and facility usage in one place.'
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
      if (['admin', 'manager'].includes(result.role?.toLowerCase())) {
        await loadMembers(result.token)
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
            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              onClearAll={() => {
                const isAdmin = ['admin', 'manager'].includes(currentUser?.role?.toLowerCase())
                setNotifications((prev) => prev.filter((n) => isAdmin ? n.role !== 'admin' : n.role === 'admin'))
              }}
              onDismiss={(id) => {
                setNotifications((prev) => prev.filter((n) => n.id !== id))
              }}
              onNotificationClick={(item) => {
                setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n))
                setActiveTab('Bookings')
              }}
            />
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

      {isBookingOpen && <BookingWizard facilities={facilitiesList} initialFacilityName={bookingForm.facility} initialDate={bookingForm.date} initialStartTime={bookingForm.time} initialHoursNeeded={bookingForm.hoursNeeded} customer={currentUser} token={authToken} apiBaseUrl={API_BASE_URL} isAdmin={currentUser?.role === 'admin'} onClose={() => setIsBookingOpen(false)} onCreated={handleWizardCreated} />}

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
