import React, { useState, useEffect, useMemo } from 'react'

export default function WeatherRiskAlertsModal({
  weatherOverview,
  bookings = [],
  onClose,
  onOfferReschedule,
  onNavigateToBooking,
  isAdmin = true,
}) {
  const current = weatherOverview?.current || {}
  const alerts = weatherOverview?.alerts || []
  const daily = weatherOverview?.dailyForecast || []

  // Detect dark mode reactively
  const [isDark, setIsDark] = useState(() => {
    return Boolean(
      document.documentElement.classList.contains('dark-mode') ||
      document.body.classList.contains('dark-mode') ||
      localStorage.getItem('smartsports_theme') === 'dark'
    )
  })

  useEffect(() => {
    const checkTheme = () => {
      const dark = Boolean(
        document.documentElement.classList.contains('dark-mode') ||
        document.body.classList.contains('dark-mode') ||
        localStorage.getItem('smartsports_theme') === 'dark'
      )
      setIsDark(dark)
    }
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Light / Dark Theme Design Tokens
  const colors = {
    bg: isDark ? '#081D2E' : '#ffffff',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#64748b',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
    weatherCardBg: isDark
      ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%)'
      : 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)',
    weatherCardBorder: isDark ? 'rgba(56, 189, 248, 0.35)' : '#bae6fd',
    weatherTempColor: isDark ? '#f8fafc' : '#0369a1',
    weatherSubtextColor: isDark ? '#94a3b8' : '#334155',
    weatherMetricLabel: isDark ? '#94a3b8' : '#64748b',
    weatherMetricValue: isDark ? '#cbd5e1' : '#0f172a',
    forecastCardBg: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
    forecastCardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    forecastCardText: isDark ? '#cbd5e1' : '#475569',
    forecastCardTemp: isDark ? '#f8fafc' : '#0f172a',
    itemCardBg: isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
    itemCardBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
    itemCardShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.05)',
    itemTitle: isDark ? '#f8fafc' : '#0f172a',
    itemSubtitle: isDark ? '#cbd5e1' : '#475569',
    reasonBg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
    reasonBorder: isDark ? 'rgba(245, 158, 11, 0.28)' : '#fde68a',
    reasonText: isDark ? '#fde68a' : '#92400e',
    allClearBg: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
    allClearBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : '#86efac',
    allClearTitle: isDark ? '#34d399' : '#15803d',
    allClearText: isDark ? '#94a3b8' : '#166534',
    toolbarBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
    toolbarBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
  }

  // Combine alerts from backend with active outdoor bookings affected by 7-day rain
  const affectedBookings = useMemo(() => {
    const list = []
    const seenIds = new Set()

    // 1. Process explicit weather alerts from backend
    alerts.forEach((alert) => {
      seenIds.add(alert.bookingId)
      list.push({
        id: alert.bookingId,
        bookingId: alert.bookingId,
        facilityName: alert.facilityName || 'Sports Court',
        courtType: alert.courtType || 'Outdoor',
        sportCategory: alert.sportCategory || 'Sport',
        customerName: alert.customerName || 'Athlete',
        contactNumber: alert.contactNumber || '',
        formattedDate: alert.formattedDate || '',
        formattedTimeSlot: alert.formattedTimeSlot || '',
        warningReason: alert.warningReason || 'Adverse weather impact expected during booking slot',
        riskSeverity: alert.riskSeverity || 'Medium',
        isRescheduleOffered: Boolean(
          alert.isRescheduleOffered ||
          alert.isRescheduleRequested ||
          alert.alertStatus === 'RescheduleOffered'
        ),
      })
    })

    // 2. Cross-reference bookings against 7-day rain forecasts
    bookings.forEach((b) => {
      if (!b || !b.id || seenIds.has(b.id)) return
      if (b.status === 'Cancelled' || b.isExpired) return

      const isReschedRequested = Boolean(b.isRescheduleRequested || b.status === 'RescheduleRequested')
      const bDateStr = (b.bookingDate || '').slice(0, 10)
      const matchingRainDay = daily.find((d) => d.date === bDateStr && (!d.isSuitableForOutdoor || d.rainProbabilityMax >= 70 || (d.precipitationSum || 0) >= 2.0))
      const courtType = b.facility?.courtType || 'Outdoor'
      const isOutdoor = courtType.toLowerCase().includes('outdoor') ||
        !['badminton', 'squash', 'table tennis'].some((s) => (b.facility?.sportCategory || '').toLowerCase().includes(s))

      if (isReschedRequested || (matchingRainDay && isOutdoor)) {
        seenIds.add(b.id)
        const reason = isReschedRequested
          ? (b.rescheduleReason || 'Rain-check reschedule requested due to inclement weather')
          : `Severe rain forecast (${matchingRainDay?.condition || 'Rain'}, ${matchingRainDay?.rainProbabilityMax || 80}% chance) during slot`

        list.push({
          id: b.id,
          bookingId: b.id,
          facilityName: b.facility?.name || b.facilityName || 'Sports Court',
          courtType: b.facility?.courtType || (isOutdoor ? 'Outdoor' : 'Indoor'),
          sportCategory: b.facility?.sportCategory || 'Outdoor Sport',
          customerName: b.customerName || 'Athlete',
          contactNumber: b.contactNumber || '',
          formattedDate: bDateStr,
          formattedTimeSlot: `${(b.startTime || '').slice(0, 5)} - ${(b.endTime || '').slice(0, 5)}`,
          warningReason: reason,
          riskSeverity: matchingRainDay && matchingRainDay.rainProbabilityMax > 85 ? 'High' : 'Medium',
          isRescheduleOffered: isReschedRequested,
        })
      }
    })

    return list
  }, [alerts, bookings, daily])

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(() => {
    // By default, select all bookings that haven't been offered a reschedule yet
    return affectedBookings.filter((b) => !b.isRescheduleOffered).map((b) => b.id)
  })

  // Keep selection updated when affectedBookings change
  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = prev.filter((id) => affectedBookings.some((b) => b.id === id))
      if (valid.length === 0) {
        return affectedBookings.filter((b) => !b.isRescheduleOffered).map((b) => b.id)
      }
      return valid
    })
  }, [affectedBookings])

  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [bulkNotice, setBulkNotice] = useState('')

  const toggleSelectAll = () => {
    if (selectedIds.length === affectedBookings.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(affectedBookings.map((b) => b.id))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  // Bulk Ask Reschedule Handler
  const handleBulkAskReschedule = async () => {
    if (selectedIds.length === 0 || isSubmittingBulk) return

    const targets = affectedBookings.filter((b) => selectedIds.includes(b.id))
    setIsSubmittingBulk(true)
    setBulkNotice('')
    setBulkProgress({ current: 0, total: targets.length })

    let successCount = 0
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i]
      setBulkProgress({ current: i + 1, total: targets.length })
      try {
        if (onOfferReschedule) {
          await onOfferReschedule(item)
          successCount++
        }
      } catch (err) {
        console.error('Failed to send reschedule request for booking #', item.id, err)
      }
    }

    setIsSubmittingBulk(false)
    setBulkNotice(`✓ Successfully sent free rain-check reschedule offers to ${successCount} member(s)!`)
    // Clear selection
    setSelectedIds([])
  }

  return (
    <div className="booking-modal-backdrop" onClick={onClose} id="weather-alerts-modal-backdrop">
      <div
        className="booking-modal"
        onClick={(e) => e.stopPropagation()}
        id="weather-alerts-modal"
        style={{
          maxWidth: '820px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: colors.bg,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="booking-modal-header"
          style={{
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <p
              className="eyebrow"
              style={{
                color: isDark ? '#38bdf8' : '#0284c7',
                letterSpacing: '1px',
                fontSize: '0.75rem',
                fontWeight: 800,
                margin: 0,
              }}
            >
              INTELLIGENT WEATHER MONITORING AGENT
            </p>
            <h2
              style={{
                margin: '4px 0 2px',
                fontSize: '1.45rem',
                fontWeight: 900,
                color: colors.textPrimary,
              }}
            >
              {isAdmin ? 'Weather Risk Intelligence & Reschedule Alerts' : 'Arena Weather & 7-Day Playability Forecast'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: colors.textSecondary }}>
              {isAdmin
                ? 'Live forecast evaluated across all active outdoor reservations for the next 7 days.'
                : 'Real-time weather conditions and 7-day playability outlook for Colombo Arena Complex.'}
            </p>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            id="close-weather-modal-btn"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: colors.textSecondary,
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Live Weather Status Card */}
        <div
          style={{
            marginTop: '16px',
            padding: '16px 20px',
            borderRadius: '16px',
            background: colors.weatherCardBg,
            border: `1px solid ${colors.weatherCardBorder}`,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{current.icon || '🌤️'}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: colors.weatherTempColor }}>
                  {current.temperature != null ? `${current.temperature}°C` : '28°C'}
                </span>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: current.isSuitableForPlay ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                    color: current.isSuitableForPlay ? '#059669' : '#dc2626',
                    border: `1px solid ${current.isSuitableForPlay ? '#10b981' : '#ef4444'}`,
                  }}
                >
                  {current.suitabilityMessage || 'Good Conditions for Play'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: colors.weatherSubtextColor, fontWeight: 500 }}>
                {current.locationName || 'Colombo Arena Complex'} • {current.condition || 'Mainly Clear'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '18px', fontSize: '0.82rem', color: colors.weatherMetricValue }}>
            <div>
              <span style={{ color: colors.weatherMetricLabel, display: 'block', fontSize: '0.72rem', fontWeight: 800 }}>
                WIND SPEED
              </span>
              <strong>{current.windSpeed ?? 10} km/h</strong>
            </div>
            <div>
              <span style={{ color: colors.weatherMetricLabel, display: 'block', fontSize: '0.72rem', fontWeight: 800 }}>
                HUMIDITY
              </span>
              <strong>{current.humidity ?? 75}%</strong>
            </div>
            <div>
              <span style={{ color: colors.weatherMetricLabel, display: 'block', fontSize: '0.72rem', fontWeight: 800 }}>
                PROVIDER
              </span>
              <strong style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>Open-Meteo</strong>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast Strip */}
        {daily.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: colors.textSecondary,
                letterSpacing: '0.6px',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              7-DAY ARENA PLAYABILITY OUTLOOK
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                gap: '8px',
              }}
            >
              {daily.slice(0, 7).map((d, idx) => {
                const isRainRisk = !d.isSuitableForOutdoor || (d.rainProbabilityMax >= 70) || ((d.precipitationSum || 0) >= 5.0)

                return (
                  <div
                    key={d.date || idx}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      background: isRainRisk
                        ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2')
                        : colors.forecastCardBg,
                      border: `1.5px solid ${isRainRisk ? (isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5') : colors.forecastCardBorder}`,
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: colors.forecastCardText }}>
                      {d.dayOfWeek || d.date}
                    </div>
                    <div style={{ fontSize: '1.4rem', margin: '3px 0' }}>{d.icon}</div>
                    <div style={{ fontWeight: 900, color: colors.forecastCardTemp, fontSize: '0.85rem' }}>
                      {Math.round(d.maxTemp)}°
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isRainRisk ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#38bdf8' : '#0284c7'),
                      }}
                    >
                      {d.rainProbabilityMax}% rain
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Affected Bookings List & Bulk Reschedule Section (Admin) or User Playability Insights */}
        {!isAdmin ? (
          <div style={{ marginTop: '22px' }}>
            <div
              style={{
                padding: '20px 22px',
                borderRadius: '16px',
                background: current.isSuitableForPlay ? colors.allClearBg : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                border: `1.5px solid ${current.isSuitableForPlay ? colors.allClearBorder : (isDark ? 'rgba(239, 68, 68, 0.35)' : '#fca5a5')}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>{current.isSuitableForPlay ? '🎾' : '🌧️'}</span>
              <div>
                <strong
                  style={{
                    fontSize: '1.05rem',
                    color: current.isSuitableForPlay ? colors.allClearTitle : (isDark ? '#f87171' : '#dc2626'),
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  {current.isSuitableForPlay
                    ? 'Prime Playability Across All Arenas'
                    : 'Weather Advisory: Inclement Outdoor Conditions'}
                </strong>
                <p style={{ margin: 0, fontSize: '0.88rem', color: colors.textSecondary, lineHeight: 1.5 }}>
                  {current.isSuitableForPlay
                    ? 'Current temperature, wind speed, and humidity levels are optimal for outdoor turf, cricket pitches, and tennis courts. Indoor badminton, squash, and basketball facilities are also available for booking.'
                    : 'Wet conditions or high rain probability detected. We recommend booking our indoor air-conditioned arenas (Badminton, Squash, Table Tennis) for uninterrupted gameplay.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div style={{ marginTop: '22px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: colors.textPrimary }}>
                Bookings Requiring Reschedule Attention ({affectedBookings.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: colors.textSecondary }}>
                Outdoor reservations exposed to forecasted rain/storms. Select bookings below to send free rain-check reschedule offers.
              </p>
            </div>
            <span style={{ fontSize: '0.78rem', color: colors.textSecondary }}>
              Evaluated: {new Date(weatherOverview?.lastEvaluatedAtUtc || Date.now()).toLocaleTimeString()}
            </span>
          </div>

          {/* Bulk Notification Banner if sent */}
          {bulkNotice && (
            <div
              style={{
                marginBottom: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                border: '1px solid #10b981',
                color: isDark ? '#34d399' : '#065f46',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{bulkNotice}</span>
            </div>
          )}

          {affectedBookings.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                borderRadius: '16px',
                background: colors.allClearBg,
                border: `1.5px solid ${colors.allClearBorder}`,
              }}
            >
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>✨</span>
              <strong style={{ fontSize: '1.1rem', color: colors.allClearTitle, display: 'block' }}>
                All Upcoming Sessions Clear
              </strong>
              <p style={{ margin: '6px auto 0', maxWidth: '460px', fontSize: '0.88rem', color: colors.allClearText }}>
                No severe rainfall, thunderstorms, or adverse weather conditions detected for active reservations over the next 7 days.
              </p>
            </div>
          ) : (
            <div>
              {/* Bulk Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: colors.toolbarBg,
                  border: `1px solid ${colors.toolbarBorder}`,
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: colors.textPrimary,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.length === affectedBookings.length && affectedBookings.length > 0}
                    onChange={toggleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7c3aed' }}
                  />
                  <span>Select All ({selectedIds.length} of {affectedBookings.length} selected)</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleBulkAskReschedule}
                    disabled={selectedIds.length === 0 || isSubmittingBulk}
                    id="bulk-ask-reschedule-btn"
                    style={{
                      background: selectedIds.length === 0
                        ? (isDark ? '#334155' : '#cbd5e1')
                        : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: selectedIds.length === 0 ? (isDark ? '#94a3b8' : '#64748b') : '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: selectedIds.length === 0 || isSubmittingBulk ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: selectedIds.length > 0 ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>🌧️</span>
                    <span>
                      {isSubmittingBulk
                        ? `Sending ${bulkProgress.current} of ${bulkProgress.total}...`
                        : `Bulk Ask Reschedule (${selectedIds.length})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bookings List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {affectedBookings.map((item) => {
                  const isHigh = item.riskSeverity === 'High'
                  const isOffered = item.isRescheduleOffered
                  const isChecked = selectedIds.includes(item.id)

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '16px',
                        background: colors.itemCardBg,
                        border: `1.5px solid ${isChecked ? '#7c3aed' : (isHigh ? (isDark ? 'rgba(239, 68, 68, 0.45)' : '#fca5a5') : colors.itemCardBorder)}`,
                        boxShadow: colors.itemCardShadow,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(item.id)}
                            style={{
                              marginTop: '4px',
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#7c3aed',
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: isHigh ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: isHigh ? '#dc2626' : '#d97706',
                                  border: `1px solid ${isHigh ? '#f87171' : '#f59e0b'}`,
                                }}
                              >
                                {item.riskSeverity.toUpperCase()} RISK
                              </span>
                              <strong style={{ color: colors.itemTitle, fontSize: '1.05rem', fontWeight: 800 }}>
                                {item.facilityName}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: colors.textSecondary }}>
                                ({item.courtType} • {item.sportCategory})
                              </span>
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '0.85rem', color: colors.itemSubtitle }}>
                              Pass: <strong>#BK-{String(item.id).padStart(5, '0')}</strong> • Member:{' '}
                              <strong>{item.customerName}</strong>
                              {item.contactNumber && (
                                <span style={{ color: colors.textSecondary }}> • {item.contactNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              color: isDark ? '#38bdf8' : '#0284c7',
                              fontSize: '0.94rem',
                            }}
                          >
                            📅 {item.formattedDate}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: colors.textSecondary }}>
                            ⏰ {item.formattedTimeSlot}
                          </div>
                        </div>
                      </div>

                      {/* Forecast Warning Box */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isHigh
                            ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2')
                            : colors.reasonBg,
                          border: `1px solid ${isHigh ? (isDark ? 'rgba(239, 68, 68, 0.28)' : '#fca5a5') : colors.reasonBorder}`,
                          fontSize: '0.86rem',
                          color: isHigh ? (isDark ? '#fca5a5' : '#b91c1c') : colors.reasonText,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{isHigh ? '⛈️' : '🌧️'}</span>
                        <span>
                          <strong>Weather Impact:</strong> {item.warningReason}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '10px',
                          marginTop: '2px',
                        }}
                      >
                        {isOffered ? (
                          <span
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                              color: isDark ? '#38bdf8' : '#0284c7',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                            }}
                          >
                            ✓ Reschedule Offer Already Sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => onOfferReschedule(item)}
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              borderColor: '#8b5cf6',
                              color: '#ffffff',
                              padding: '8px 16px',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              borderRadius: '10px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>🌧️</span>
                            <span>Offer Rain-Check Reschedule</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onNavigateToBooking(item)}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: isDark ? 'transparent' : '#f1f5f9',
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                          }}
                        >
                          Inspect →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
