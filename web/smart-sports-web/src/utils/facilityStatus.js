/**
 * Utility functions for real-time facility occupancy and reviews calculation
 */

export const isFacilityOccupiedNow = (facility, bookings = []) => {
  if (!facility) return false
  if (facility.isOccupiedNow || facility.status === 'In Play') return true
  if (!Array.isArray(bookings) || bookings.length === 0) return false

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return bookings.some((b) => {
    if (b.status === 'Cancelled') return false
    const matchId = b.facilityId != null && facility.id != null && String(b.facilityId) === String(facility.id)
    const matchName = b.facilityName && facility.name && b.facilityName.toLowerCase() === facility.name.toLowerCase()
    if (!matchId && !matchName) return false

    const bDate = String(b.bookingDate || b.date || '').slice(0, 10)
    if (bDate !== todayStr) return false

    const startH = Number((b.startTime || '00:00').slice(0, 2))
    const startM = Number((b.startTime || '00:00').slice(3, 5)) || 0
    const isMidnight = (b.endTime || '').startsWith('24') || (b.endTime || '').startsWith('1.')
    const endH = isMidnight ? 24 : (Number((b.endTime || '00:00').slice(0, 2)) || 0)
    const endM = isMidnight ? 0 : (Number((b.endTime || '00:00').slice(3, 5)) || 0)

    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM

    return currentMinutes >= startTotal && currentMinutes < endTotal
  })
}

export const getFacilityRatingStats = (facility, reviews = []) => {
  if (!facility) return { rating: null, count: 0 }
  const fId = facility.id != null ? String(facility.id) : null
  const fName = (facility.name || '').trim().toLowerCase()

  if (Array.isArray(reviews) && reviews.length > 0) {
    const matched = reviews.filter((r) => {
      if (!r) return false
      if (fId && r.facilityId != null && String(r.facilityId) === fId) return true
      if (fName && r.facilityName && r.facilityName.trim().toLowerCase() === fName) return true
      return false
    })

    if (matched.length > 0) {
      const avg = matched.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / matched.length
      return { rating: Number(avg.toFixed(1)), count: matched.length }
    }
  }

  if (facility.rating != null && Number(facility.rating) > 0 && Number(facility.ratingCount || 0) > 0) {
    return { rating: Number(Number(facility.rating).toFixed(1)), count: Number(facility.ratingCount) }
  }

  return { rating: null, count: 0 }
}
