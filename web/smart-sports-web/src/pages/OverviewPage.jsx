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
  _support = [],
  schedule = [],
  analytics = [],
  averageRating,
  reviews = [],
  apiBaseUrl,
  currentUser,
  onBooking,
  onBookWithAi,
  onTicket,
  onSupport,
  onFacilities,
  _onSchedule,
  onBookings,
  onFacilityDetails,
  onScheduleDetails,
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
        onBookWithAi={onBookWithAi}
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
        bookings={bookings}
        reviews={reviews}
        onBook={onBooking}
        onDetails={(facility) => {
          if (onFacilityDetails) {
            onFacilityDetails(facility)
          } else if (onFacilities) {
            onFacilities()
          }
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

      {/* 6. Popularity Leaderboard & Court Timetable in One Row (50% / 50%) */}
      <div className="overview-split-row">
        <BookingActivityRanking analytics={analytics} />
        <ScheduleTimeline
          schedule={schedule}
          onDetails={onScheduleDetails || onDetails}
          onBookSlot={onBooking}
        />
      </div>

      {/* 7. Member Reviews */}
      <MemberReviewsSection
        reviews={reviews}
        apiBaseUrl={apiBaseUrl}
        currentUser={currentUser}
        onEdit={onEditReview}
        onDelete={onDeleteReview}
      />

      {/* 9. _support Teaser */}
      <SupportTeaser
        onContactSupport={onTicket}
        onOpenSupportPage={onSupport || onTicket}
      />
    </div>
  )
}
