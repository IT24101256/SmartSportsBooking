// SmartSports Cancellation & Refund Policy Utilities

export const CANCELLATION_POLICY_RULES = [
  {
    tier: 'Full 100% Refund',
    window: 'At least 24 hours prior',
    percentage: 100,
    color: '#10b981',
    description: 'Cancellations made at least 24 hours prior to the scheduled start time receive a full refund or credit voucher.',
  },
  {
    tier: '50% Refund',
    window: 'Between 12 and 24 hours prior',
    percentage: 50,
    color: '#f59e0b',
    description: 'Cancellations made between 12 and 24 hours prior receive a 50% refund.',
  },
  {
    tier: 'Non-refundable',
    window: 'Less than 12 hours prior',
    percentage: 0,
    color: '#ef4444',
    description: 'Cancellations made less than 12 hours before the session or no-shows cannot be refunded.',
  },
  {
    tier: 'Weather / Rain-Check',
    window: 'Outdoor Facilities Impacted by Heavy Rain',
    percentage: 100,
    color: '#3b82f6',
    description: 'Outdoor facilities (Cricket Ground, Football Field, Volleyball Court) impacted by heavy rain are eligible for free rescheduling or rain-check credits.',
  },
]

export function calculateCancellationQuote(booking) {
  if (!booking) {
    return {
      hoursPrior: 0,
      refundPercentage: 0,
      refundAmount: 0,
      refundStatus: 'Non-refundable (0%)',
      policyTier: 'Non-refundable (< 12 Hours)',
      policyExplanation: 'Cancellations made less than 12 hours before the session or no-shows cannot be refunded.',
      isOutdoor: false,
    }
  }

  const totalAmount = Number(booking.totalAmount || 0)

  const dateStr = String(booking.bookingDate || '').slice(0, 10)
  const timeStr = String(booking.startTime || '00:00:00').slice(0, 8)

  if (!dateStr) {
    return {
      hoursPrior: 0,
      refundPercentage: 0,
      refundAmount: 0,
      refundStatus: 'Non-refundable (0%)',
      policyTier: 'Non-refundable (< 12 Hours)',
      policyExplanation: 'Cancellations made less than 12 hours before the session or no-shows cannot be refunded.',
      isOutdoor: false,
    }
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  const sessionStart = new Date(year, month - 1, day, hours || 0, minutes || 0, 0)
  const now = new Date()

  const diffMs = sessionStart.getTime() - now.getTime()
  const hoursPrior = diffMs / (1000 * 60 * 60)

  const isOutdoor = /cricket|football|turf|volleyball|field|ground/i.test(
    booking.facilityName || booking.name || ''
  )

  if (hoursPrior >= 24) {
    return {
      hoursPrior: Math.max(0, Math.round(hoursPrior * 10) / 10),
      refundPercentage: 100,
      refundAmount: totalAmount,
      refundStatus: 'Full 100% Refund',
      policyTier: '100% Refund (≥ 24h prior)',
      policyExplanation:
        'Cancellations made at least 24 hours prior to the scheduled start time receive a full 100% refund or credit voucher.',
      isOutdoor,
    }
  } else if (hoursPrior >= 12) {
    const partial = Math.round(totalAmount * 0.5)
    return {
      hoursPrior: Math.max(0, Math.round(hoursPrior * 10) / 10),
      refundPercentage: 50,
      refundAmount: partial,
      refundStatus: '50% Partial Refund',
      policyTier: '50% Refund (12h - 24h prior)',
      policyExplanation: 'Cancellations made between 12 and 24 hours prior receive a 50% refund.',
      isOutdoor,
    }
  } else {
    return {
      hoursPrior: Math.max(0, Math.round(hoursPrior * 10) / 10),
      refundPercentage: 0,
      refundAmount: 0,
      refundStatus: 'Non-refundable (0%)',
      policyTier: 'Non-refundable (< 12h prior)',
      policyExplanation:
        'Cancellations made less than 12 hours before the session or no-shows cannot be refunded per club policy.',
      isOutdoor,
    }
  }
}
