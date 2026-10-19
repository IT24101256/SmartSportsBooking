/**
 * Formats a booking's session date, start time, end time, and duration.
 * Example output: "10/19/2026 • 08:00 – 10:00 (2 hours)"
 */
export function formatBookingSession(booking) {
  if (!booking) return ''

  // If already formatted with date, end time, and bracketed duration, return as-is
  if (typeof booking.date === 'string' && booking.date.includes('(') && booking.date.includes('–')) {
    return booking.date
  }

  // Extract date
  const rawDate = booking.bookingDate || (booking.date && !booking.date.includes('•') ? booking.date : null)
  let dateFormatted = ''
  if (rawDate) {
    const d = new Date(rawDate)
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString()
    }
  }
  if (!dateFormatted && typeof booking.date === 'string') {
    dateFormatted = booking.date.split('•')[0].trim()
  }
  if (!dateFormatted) {
    dateFormatted = 'Session Date'
  }

  // Extract start time
  let startRaw = booking.startTime
  if (!startRaw && typeof booking.date === 'string' && booking.date.includes('•')) {
    startRaw = booking.date.split('•')[1].trim()
  }
  startRaw = String(startRaw || '08:00')
  const startStr = startRaw.slice(0, 5)
  const startH = parseInt(startStr.slice(0, 2), 10) || 0
  const startM = startStr.slice(3, 5) || '00'

  // Extract end time
  let endStr = ''
  const endRaw = String(booking.endTime || '')
  const isMidnight = endRaw.startsWith('24') || endRaw.startsWith('1.')
  if (isMidnight) {
    endStr = '24:00'
  } else if (endRaw && endRaw !== 'undefined' && endRaw !== 'null') {
    endStr = endRaw.slice(0, 5)
  }

  // Extract or calculate hoursNeeded
  let hours = Number(booking.hoursNeeded)
  if (!hours || isNaN(hours) || hours <= 0) {
    if (endStr) {
      const endH = endStr === '24:00' ? 24 : parseInt(endStr.slice(0, 2), 10) || 0
      hours = Math.max(1, endH - startH)
    } else {
      hours = 1
    }
  }

  // If endStr was not provided, calculate from startH + hours
  if (!endStr) {
    const endH = Math.min(24, startH + hours)
    endStr = `${String(endH).padStart(2, '0')}:${startM}`
  }

  const durationStr = `(${hours} ${hours === 1 ? 'hour' : 'hours'})`

  return `${dateFormatted} • ${startStr} – ${endStr} ${durationStr}`
}

/**
 * Determines whether a customer is allowed to update a booking.
 * Must be active (not cancelled, not expired) and scheduled at least 24 hours in the future.
 */
export function canCustomerUpdate(booking) {
  if (!booking) return false

  // If backend provided precomputed flag, respect it
  if (booking.canCustomerUpdate !== undefined && typeof booking.canCustomerUpdate === 'boolean') {
    return booking.canCustomerUpdate
  }

  const status = String(booking.status || '').toLowerCase()
  if (status === 'cancelled') return false

  const rawDate = booking.bookingDate || (booking.date && !booking.date.includes('•') ? booking.date : null)
  if (!rawDate) return false

  const sessionDate = new Date(rawDate)
  if (isNaN(sessionDate.getTime())) return false

  let startRaw = booking.startTime
  if (!startRaw && typeof booking.date === 'string' && booking.date.includes('•')) {
    startRaw = booking.date.split('•')[1].trim()
  }
  startRaw = String(startRaw || '08:00')
  const startH = parseInt(startRaw.slice(0, 2), 10) || 8
  const startM = parseInt(startRaw.slice(3, 5), 10) || 0

  const sessionStart = new Date(
    sessionDate.getFullYear(),
    sessionDate.getMonth(),
    sessionDate.getDate(),
    startH,
    startM,
    0
  )

  const hoursPrior = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60)
  return hoursPrior >= 24.0
}

