import HeroSection from '../components/HeroSection'
import QuickBookingBar from '../components/QuickBookingBar'
import FacilityMarketplace from '../components/FacilityMarketplace'
import NextGameSection from '../components/NextGameSection'
import ActivityStats from '../components/ActivityStats'
import BookingActivityRanking from '../components/BookingActivityRanking'
import MemberReviewsSection from '../components/MemberReviewsSection'
import ScheduleTimeline from '../components/ScheduleTimeline'
import SupportTeaser from '../components/SupportTeaser'

export default function OverviewPage({
  heroMessage,
  stats = [],
  facilities = [],
  bookings = [],
  support = [],
  schedule = [],
  analytics = [],
  averageRating,
  reviews = [],
  apiBaseUrl,
  currentUser,
  onBooking,
  onTicket,
  onSupport,
  onFacilities,
  onSchedule,
  onBookings,
  onDetails,
  onReview,
  onEditReview,
  onDeleteReview,
  onCancel,
  onReschedule,
}) {
  return (
    <div className="overview-page-wrapper">
      {/* 1. Hero Section */}
      <HeroSection
        heroMessage={heroMessage}
        facilities={facilities}
        bookings={bookings}
        reviews={reviews}
        averageRating={averageRating}
        onBooking={onBooking}
        onExploreFacilities={onFacilities}
      />

      {/* 2. Quick Booking Bar */}
      <QuickBookingBar
        facilities={facilities}
        onBooking={onBooking}
      />

      {/* 3. Popular & Featured Facilities Marketplace */}
      <FacilityMarketplace
        facilities={facilities}
        onBook={onBooking}
        onDetails={(facility) => {
          if (onFacilities) onFacilities()
        }}
        onSeeAll={onFacilities}
      />

      {/* 4. Upcoming Game Section */}
      <NextGameSection
        bookings={bookings}
        onBookings={onBookings}
        onBooking={onBooking}
        onReview={onReview}
        onCancel={onCancel}
        onReschedule={onReschedule}
      />

      {/* 5. Member Activity Stats */}
      <ActivityStats stats={stats} />

      {/* 6. Booking Activity / Leaderboard */}
      <BookingActivityRanking analytics={analytics} />

      {/* 7. Member Reviews */}
      <MemberReviewsSection
        reviews={reviews}
        apiBaseUrl={apiBaseUrl}
        currentUser={currentUser}
        onEdit={onEditReview}
        onDelete={onDeleteReview}
      />

      {/* 8. Today's Schedule */}
      <ScheduleTimeline
        schedule={schedule}
        onDetails={onDetails}
        onBookSlot={onBooking}
      />

      {/* 9. Support Teaser */}
      <SupportTeaser
        onContactSupport={onTicket}
        onOpenSupportPage={onSupport || onTicket}
      />
    </div>
  )
}
