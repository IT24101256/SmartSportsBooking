export function getFacilityImage(facility) {
  if (facility?.images && Array.isArray(facility.images) && facility.images.length > 0 && facility.images[0]) {
    return facility.images[0]
  }

  const name = (facility?.name || '').toLowerCase()
  const type = (facility?.type || '').toLowerCase()

  if (name.includes('badminton') || type.includes('badminton')) {
    return '/facility-badminton.jpg'
  }
  if (name.includes('cricket') || type.includes('cricket')) {
    return '/facility-cricket.jpg'
  }
  if (name.includes('swim') || name.includes('aqua') || type.includes('swim')) {
    return '/facility-swimming.jpg'
  }
  if (name.includes('tennis') || type.includes('tennis')) {
    return '/facility-tennis.jpg'
  }
  if (name.includes('basket') || type.includes('basket')) {
    return '/facility-basketball.jpg'
  }
  if (name.includes('turf') || name.includes('football') || name.includes('soccer') || type.includes('football') || type.includes('turf')) {
    return '/sports-hero.jpg'
  }
  if (name.includes('gym') || name.includes('fitness') || type.includes('fitness')) {
    return '/facility-basketball.jpg'
  }

  return '/sports-hero.jpg'
}

export function getFacilityIcon(facilityName) {
  const name = (facilityName || '').toLowerCase()
  if (name.includes('badminton')) return '🏸'
  if (name.includes('cricket')) return '🏏'
  if (name.includes('table')) return '🏓'
  if (name.includes('tennis')) return '🎾'
  if (name.includes('basket')) return '🏀'
  if (name.includes('swim') || name.includes('aqua')) return '🏊'
  if (name.includes('football') || name.includes('turf') || name.includes('soccer')) return '⚽'
  if (name.includes('gym') || name.includes('fitness')) return '🏋️'
  return '🏟️'
}
