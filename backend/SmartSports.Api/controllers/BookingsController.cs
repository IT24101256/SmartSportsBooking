using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Booking;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.Controllers;
  
[ApiController]
[Authorize]
[Route("api/bookings")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BookingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? sort = "date",
        [FromQuery] DateTime? date = null,
        [FromQuery] string? filter = null,
        [FromQuery] string? refundStatus = null,
        [FromQuery] string? turf = null,
        [FromQuery] int? facilityId = null,
        [FromQuery] bool? isRescheduleRequested = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var bookingsQuery = _context.Bookings.AsQueryable();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager"))
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.UserId == userId.Value);
        }

        // Date filter
        if (date.HasValue)
        {
            var targetDate = DateTime.SpecifyKind(date.Value.Date, DateTimeKind.Utc);
            bookingsQuery = bookingsQuery.Where(booking => booking.BookingDate == targetDate);
        }

        // Facility / Turf ID filter
        if (facilityId.HasValue && facilityId.Value > 0)
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.FacilityId == facilityId.Value);
        }

        // Turf keyword filter
        if (!string.IsNullOrWhiteSpace(turf))
        {
            var turfTerm = turf.Trim().ToLower();
            bookingsQuery = bookingsQuery.Where(booking => booking.Facility!.Name.ToLower().Contains(turfTerm));
        }

        // Search text
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            bookingsQuery = bookingsQuery.Where(booking =>
                booking.Facility!.Name.ToLower().Contains(term) ||
                booking.CustomerName.ToLower().Contains(term) ||
                booking.Id.ToString().Contains(term));
        }

        // Direct status filter
        if (!string.IsNullOrWhiteSpace(status))
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.Status == status);
        }

        // Refund status filter (e.g. "To Refund", "Refunded", "Non-refundable")
        if (!string.IsNullOrWhiteSpace(refundStatus))
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.RefundStatus == refundStatus);
        }

        // Reschedule requested boolean filter
        if (isRescheduleRequested.HasValue)
        {
            if (isRescheduleRequested.Value)
            {
                bookingsQuery = bookingsQuery.Where(booking => booking.IsRescheduleRequested || booking.Status == "RescheduleRequested");
            }
            else
            {
                bookingsQuery = bookingsQuery.Where(booking => !booking.IsRescheduleRequested && booking.Status != "RescheduleRequested");
            }
        }

        // Preset filter tabs: cancelled, reschedule, pending, confirmed, turf, to-refund, full-refund, half-refund, refunded
        if (!string.IsNullOrWhiteSpace(filter))
        {
            var normalizedFilter = filter.Trim().ToLowerInvariant();
            switch (normalizedFilter)
            {
                case "cancelled":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Cancelled");
                    break;
                case "reschedule":
                    bookingsQuery = bookingsQuery.Where(booking => booking.IsRescheduleRequested || booking.Status == "RescheduleRequested");
                    break;
                case "pending":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Pending");
                    break;
                case "confirmed":
                case "confirm":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Confirmed");
                    break;
                case "turf":
                    bookingsQuery = bookingsQuery.Where(booking =>
                        booking.Facility!.Name.ToLower().Contains("turf") ||
                        booking.Facility!.Name.ToLower().Contains("field") ||
                        booking.Facility!.Name.ToLower().Contains("ground") ||
                        booking.Facility!.Name.ToLower().Contains("court") ||
                        booking.Facility!.Name.ToLower().Contains("netball"));
                    break;
                case "to-refund":
                case "torefund":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Cancelled" && (booking.RefundStatus == "To Refund" || (booking.RefundAmount > 0 && booking.RefundStatus != "Refunded")));
                    break;
                case "full-refund":
                case "fullrefund":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Cancelled" && (booking.RefundPercentage == 100 || (booking.RefundAmount > 0 && booking.RefundAmount >= booking.TotalAmount) || (booking.RefundStatus != null && (booking.RefundStatus.Contains("100") || booking.RefundStatus.ToLower().Contains("full")))) && booking.RefundStatus != "Refunded");
                    break;
                case "half-refund":
                case "halfrefund":
                    bookingsQuery = bookingsQuery.Where(booking => booking.Status == "Cancelled" && (booking.RefundPercentage == 50 || (booking.RefundAmount > 0 && booking.RefundAmount < booking.TotalAmount) || (booking.RefundStatus != null && (booking.RefundStatus.Contains("50") || booking.RefundStatus.ToLower().Contains("half") || booking.RefundStatus.ToLower().Contains("partial")))) && booking.RefundStatus != "Refunded");
                    break;
                case "refunded":
                    bookingsQuery = bookingsQuery.Where(booking => booking.RefundStatus == "Refunded");
                    break;
            }
        }

        bookingsQuery = sort?.ToLowerInvariant() switch
        {
            "status" => bookingsQuery.OrderBy(booking => booking.Status).ThenByDescending(booking => booking.BookingDate),
            "facility" => bookingsQuery.OrderBy(booking => booking.Facility!.Name).ThenByDescending(booking => booking.BookingDate),
            _ => bookingsQuery.OrderByDescending(booking => booking.BookingDate).ThenByDescending(booking => booking.StartTime)
        };

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 500);
        var totalCount = await bookingsQuery.CountAsync();
        var bookings = await bookingsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(booking => booking.Facility)
            .ToListAsync();

        var slNow = CancellationRefundService.GetCurrentLocalTime();
        var items = bookings.Select(b => new
        {
            b.Id,
            b.UserId,
            b.FacilityId,
            b.Facility,
            b.BookingDate,
            b.StartTime,
            b.EndTime,
            b.HoursNeeded,
            b.TotalAmount,
            b.CustomerName,
            b.NicNumber,
            b.ContactNumber,
            b.PaymentMethod,
            b.PaymentStatus,
            b.BankSlipFileName,
            b.CardLastFour,
            b.Status,
            b.CancellationReason,
            b.RefundAmount,
            b.RefundPercentage,
            b.RefundStatus,
            b.CancelledAt,
            b.RefundConfirmedAt,
            b.RefundConfirmedBy,
            b.RefundNotes,
            b.IsRescheduleRequested,
            b.RescheduleReason,
            b.RescheduleRequestedAt,
            IsExpired = CancellationRefundService.IsBookingExpired(b.BookingDate, b.StartTime, slNow)
        });

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromForm] CreateBookingRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        // Normalise the date to UTC regardless of serialised Kind
        var bookingDate = DateTime.SpecifyKind(request.BookingDate.Date, DateTimeKind.Utc);
        var today = DateTime.UtcNow.Date;
        var now = DateTime.UtcNow.TimeOfDay;

        if (bookingDate.Date < today)
        {
            return BadRequest("Bookings cannot be made for a previous date.");
        }

        if (bookingDate.Date == today && request.StartTime < now)
        {
            return BadRequest("Bookings cannot start before the current time.");
        }

        if (request.StartTime.Minutes != 0 || request.StartTime.Seconds != 0 || request.StartTime < TimeSpan.FromHours(8) || request.StartTime >= TimeSpan.FromHours(24))
        {
            return BadRequest("Bookings must start on a whole hour between 08:00 and 23:00.");
        }

        if (request.HoursNeeded < 1 || request.EndTime != request.StartTime.Add(TimeSpan.FromHours(request.HoursNeeded)) || request.EndTime > TimeSpan.FromHours(24))
        {
            return BadRequest("Bookings must be for at least one whole hour and end by midnight.");
        }

        if (!new[] { "Card", "BankTransfer", "Cash" }.Contains(request.PaymentMethod, StringComparer.OrdinalIgnoreCase) ||
            (request.PaymentMethod.Equals("Cash", StringComparison.OrdinalIgnoreCase) && !User.IsInRole("Admin") && !User.IsInRole("Manager")))
        {
            return BadRequest("Payment method must be Card or BankTransfer.");
        }

        if (request.PaymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase) && request.BankSlip == null)
        {
            return BadRequest("A bank transfer slip is required.");
        }

        if (request.PaymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase) &&
            (request.CardNumber?.Length != 16 || !request.CardNumber.All(char.IsDigit) ||
             request.ExpiryMonth is < 1 or > 12 || request.ExpiryYear is null || request.ExpiryYear < DateTime.UtcNow.Year || request.ExpiryYear > DateTime.UtcNow.Year + 10 ||
             (request.ExpiryYear == DateTime.UtcNow.Year && request.ExpiryMonth < DateTime.UtcNow.Month) ||
             request.Cvv?.Length != 3 || !request.Cvv.All(char.IsDigit)))
        {
            return BadRequest("Card number, expiry month/year, and CVV are invalid.");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.NicNumber.Trim(), @"^(\d{9}[VvXx]|\d{12})$"))
            return BadRequest("NIC must be 12 digits or 9 digits followed by V or X.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.ContactNumber.Trim(), @"^\d{10}$"))
            return BadRequest("Contact number must contain exactly 10 digits.");

        if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.NicNumber) || string.IsNullOrWhiteSpace(request.ContactNumber))
        {
            return BadRequest("Name, NIC number, and contact number are required.");
        }

        if (request.EndTime <= request.StartTime)
        {
            return BadRequest("The end time must be after the start time.");
        }

        var facility = await _context.Facilities.FindAsync(request.FacilityId);
        if (facility == null)
        {
            return NotFound("Facility not found.");
        }

        // Admins and Managers may override schedule conflicts
        bool isPrivileged = User.IsInRole("Admin") || User.IsInRole("Manager");

        if (!isPrivileged)
        {
            var overlap = await _context.Bookings.AnyAsync(booking =>
                booking.FacilityId == request.FacilityId &&
                booking.BookingDate == bookingDate &&
                booking.StartTime < request.EndTime &&
                booking.EndTime > request.StartTime &&
                booking.Status != "Cancelled");

            if (overlap)
            {
                return Conflict("This facility is already booked for that time.");
            }
        }

        var validStatuses = new[] { "Pending", "Confirmed" };
        var booking = new Booking
        {
            UserId = userId.Value,
            FacilityId = request.FacilityId,
            BookingDate = bookingDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            HoursNeeded = request.HoursNeeded,
            TotalAmount = facility.HourlyRate * request.HoursNeeded,
            CustomerName = request.CustomerName.Trim(),
            NicNumber = request.NicNumber.Trim(),
            ContactNumber = request.ContactNumber.Trim(),
            PaymentMethod = request.PaymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase) ? "Card" : request.PaymentMethod.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? "Cash" : "BankTransfer",
            PaymentStatus = request.PaymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase) ? "Pending" : "Paid",
            CardLastFour = request.PaymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase) ? request.CardLastFour : null,
            Status = request.PaymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase) ? "Pending" : "Confirmed"
        };

        if (request.BankSlip != null)
        {
            var uploadDirectory = Path.Combine(AppContext.BaseDirectory, "uploads", "slips");
            Directory.CreateDirectory(uploadDirectory);
            var extension = Path.GetExtension(request.BankSlip.FileName);
            var storedName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(uploadDirectory, storedName));
            await request.BankSlip.CopyToAsync(stream);
            booking.BankSlipFileName = storedName;
        }

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await _context.Entry(booking).Reference(item => item.Facility).LoadAsync();
        return CreatedAtAction(nameof(GetBookings), new { id = booking.Id }, booking);
    }

    [HttpGet("availability")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailability([FromQuery] int facilityId, [FromQuery] DateTime date, [FromQuery] string? clientTime = null)
    {
        var facility = await _context.Facilities.FindAsync(facilityId);
        if (facility == null) return NotFound("Facility not found.");

        var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var bookings = await _context.Bookings
            .Where(booking => booking.FacilityId == facilityId && booking.BookingDate == day && booking.Status != "Cancelled")
            .Select(booking => new { booking.StartTime, booking.EndTime })
            .ToListAsync();

        // Determine current local reference time (Sri Lanka UTC+05:30 or client local time)
        TimeSpan currentLocalTime;
        DateTime todayLocalDate;

        var slTimeZone = TimeZoneInfo.CreateCustomTimeZone("SLST", TimeSpan.FromMinutes(330), "Sri Lanka", "Sri Lanka");
        var slNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, slTimeZone);

        if (!string.IsNullOrWhiteSpace(clientTime) && TimeSpan.TryParse(clientTime, out var parsedClientTime))
        {
            currentLocalTime = parsedClientTime;
            todayLocalDate = slNow.Date;
        }
        else
        {
            currentLocalTime = slNow.TimeOfDay;
            todayLocalDate = slNow.Date;
        }

        var slots = Enumerable.Range(8, 16).Select(hour =>
        {
            var start = TimeSpan.FromHours(hour);
            var end = start.Add(TimeSpan.FromHours(1));
            var isPast = day.Date < todayLocalDate || (day.Date == todayLocalDate && start <= currentLocalTime);
            var isBooked = bookings.Any(booking => booking.StartTime < end && booking.EndTime > start);
            return new { startTime = start, endTime = end, status = isPast ? "Past" : isBooked ? "Booked" : "Available" };
        });

        return Ok(new { facilityId, date = day, hourlyRate = facility.HourlyRate, slots });
    }

    [HttpGet("{id:int}/bank-slip")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetBankSlip(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking?.BankSlipFileName == null) return NotFound("Bank slip not found.");

        var path = Path.Combine(AppContext.BaseDirectory, "uploads", "slips", booking.BankSlipFileName);
        if (!System.IO.File.Exists(path)) return NotFound("Bank slip file is unavailable.");
        return PhysicalFile(path, "application/octet-stream", booking.BankSlipFileName);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        var validStatuses = new[] { "Pending", "Confirmed", "Cancelled", "RescheduleRequested" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest("Invalid status value.");

        booking.Status = request.Status;
        if (request.Status == "Confirmed" && booking.PaymentMethod == "BankTransfer")
        {
            booking.PaymentStatus = "Approved";
        }
        else if (request.Status == "Cancelled")
        {
            booking.CancellationReason = !string.IsNullOrWhiteSpace(request.Reason) ? request.Reason.Trim() : "Cancelled by management.";
            var refund = CancellationRefundService.CalculateRefund(booking.BookingDate, booking.StartTime, booking.TotalAmount, booking.Facility?.Name);
            booking.RefundPercentage = refund.RefundPercentage;
            booking.RefundAmount = refund.RefundAmount;
            booking.RefundStatus = refund.RefundPercentage > 0 ? "To Refund" : "Non-refundable";
            booking.CancelledAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpGet("{id:int}/cancellation-quote")]
    public async Task<IActionResult> GetCancellationQuote(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();

        var quote = CancellationRefundService.CalculateRefund(
            booking.BookingDate,
            booking.StartTime,
            booking.TotalAmount,
            booking.Facility?.Name
        );

        return Ok(new
        {
            bookingId = booking.Id,
            facilityName = booking.Facility?.Name ?? "Facility",
            totalAmount = booking.TotalAmount,
            bookingDate = booking.BookingDate,
            startTime = booking.StartTime,
            hoursPrior = quote.HoursPrior,
            refundPercentage = quote.RefundPercentage,
            refundAmount = quote.RefundAmount,
            refundStatus = quote.RefundStatus,
            policyTier = quote.PolicyTier,
            policyExplanation = quote.PolicyExplanation,
            isOutdoorEligibleForRainCheck = quote.IsOutdoorEligibleForRainCheck
        });
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> CancelBookingWithRefund(int id, [FromBody] CancelBookingRequest? request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();
        if (booking.Status == "Cancelled") return BadRequest("This booking is already cancelled.");

        if (CancellationRefundService.IsBookingExpired(booking.BookingDate, booking.StartTime))
        {
            return BadRequest("Expired bookings cannot be cancelled.");
        }

        var quote = CancellationRefundService.CalculateRefund(
            booking.BookingDate,
            booking.StartTime,
            booking.TotalAmount,
            booking.Facility?.Name
        );

        booking.Status = "Cancelled";
        booking.RefundPercentage = quote.RefundPercentage;
        booking.RefundAmount = quote.RefundAmount;
        booking.RefundStatus = quote.RefundPercentage > 0 ? "To Refund" : "Non-refundable";
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancellationReason = !string.IsNullOrWhiteSpace(request?.Reason)
            ? request.Reason.Trim()
            : (User.IsInRole("Admin") || User.IsInRole("Manager") ? "Cancelled by management." : "Cancelled by member.");

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpPost("{id:int}/confirm-refund")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ConfirmRefund(int id, [FromBody] ConfirmRefundRequest? request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.Status != "Cancelled") return BadRequest("Only cancelled bookings can be refunded.");
        if (booking.RefundStatus == "Refunded") return BadRequest("This booking has already been refunded.");
        if (booking.RefundAmount == null || booking.RefundAmount <= 0) return BadRequest("This booking is non-refundable.");

        booking.RefundStatus = "Refunded";
        booking.RefundConfirmedAt = DateTime.UtcNow;
        booking.RefundConfirmedBy = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) ?? "Admin";
        booking.RefundNotes = request?.Notes;

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpPost("{id:int}/request-reschedule")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RequestReschedule(int id, [FromBody] AdminRescheduleRequest? request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.Status == "Cancelled") return BadRequest("Cannot request rescheduling for a cancelled booking.");

        if (CancellationRefundService.IsBookingExpired(booking.BookingDate, booking.StartTime))
        {
            return BadRequest("Expired bookings cannot be rescheduled.");
        }

        booking.IsRescheduleRequested = true;
        booking.RescheduleReason = !string.IsNullOrWhiteSpace(request?.Reason)
            ? request.Reason.Trim()
            : "Heavy rain / Adverse weather impact - free rescheduling offered";
        booking.RescheduleRequestedAt = DateTime.UtcNow;
        booking.Status = "RescheduleRequested";

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpPost("{id:int}/reschedule")]
    public async Task<IActionResult> RescheduleBooking(int id, [FromBody] RescheduleBookingRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();
        if (booking.Status == "Cancelled") return BadRequest("Cannot reschedule a cancelled booking.");

        if (CancellationRefundService.IsBookingExpired(booking.BookingDate, booking.StartTime))
        {
            return BadRequest("Expired bookings cannot be rescheduled.");
        }

        var bookingDate = DateTime.SpecifyKind(request.BookingDate.Date, DateTimeKind.Utc);
        var today = DateTime.UtcNow.Date;
        var now = DateTime.UtcNow.TimeOfDay;

        if (bookingDate.Date < today)
        {
            return BadRequest("Bookings cannot be rescheduled to a previous date.");
        }

        if (bookingDate.Date == today && request.StartTime < now)
        {
            return BadRequest("Rescheduled booking cannot start before the current time.");
        }

        if (request.StartTime.Minutes != 0 || request.StartTime.Seconds != 0 || request.StartTime < TimeSpan.FromHours(8) || request.StartTime >= TimeSpan.FromHours(24))
        {
            return BadRequest("Bookings must start on a whole hour between 08:00 and 23:00.");
        }

        var endTime = request.EndTime ?? request.StartTime.Add(TimeSpan.FromHours(booking.HoursNeeded));
        if (endTime <= request.StartTime)
        {
            return BadRequest("The end time must be after the start time.");
        }

        if (endTime > TimeSpan.FromHours(24))
        {
            return BadRequest("Bookings must end by midnight.");
        }

        // Check conflicts (excluding this booking and cancelled bookings)
        var overlap = await _context.Bookings.AnyAsync(other =>
            other.Id != id &&
            other.FacilityId == booking.FacilityId &&
            other.BookingDate == bookingDate &&
            other.StartTime < endTime &&
            other.EndTime > request.StartTime &&
            other.Status != "Cancelled");

        if (overlap)
        {
            return Conflict("The facility is already booked for that new time slot. Please choose another available slot.");
        }

        booking.BookingDate = bookingDate;
        booking.StartTime = request.StartTime;
        booking.EndTime = endTime;
        booking.IsRescheduleRequested = false;
        booking.RescheduleReason = null;
        booking.Status = "Confirmed";

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpPut("{id:int}/payment")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdatePayment(int id, [FromBody] UpdateBookingPaymentRequest request)
    {
        if (!string.Equals(request.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Admin payment method must be Cash.");

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        booking.PaymentMethod = "Cash";
        booking.PaymentStatus = "Paid";
        booking.Status = "Confirmed";
        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBooking(int id, UpdateBookingRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();
        if (request.EndTime <= request.StartTime) return BadRequest("The end time must be after the start time.");
        if (!await _context.Facilities.AnyAsync(facility => facility.Id == request.FacilityId)) return NotFound("Facility not found.");

        var bookingDate = DateTime.SpecifyKind(request.BookingDate.Date, DateTimeKind.Utc);
        var overlap = await _context.Bookings.AnyAsync(other =>
            other.Id != id && other.FacilityId == request.FacilityId && other.BookingDate == bookingDate &&
            other.StartTime < request.EndTime && other.EndTime > request.StartTime && other.Status != "Cancelled");
        if (overlap) return Conflict("This facility is already booked for that time.");

        booking.FacilityId = request.FacilityId;
        booking.BookingDate = bookingDate;
        booking.StartTime = request.StartTime;
        booking.EndTime = request.EndTime;
        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();
        if (booking.Status == "Cancelled") return NoContent();

        if (CancellationRefundService.IsBookingExpired(booking.BookingDate, booking.StartTime))
        {
            return BadRequest("Expired bookings cannot be cancelled.");
        }

        var quote = CancellationRefundService.CalculateRefund(
            booking.BookingDate,
            booking.StartTime,
            booking.TotalAmount,
            booking.Facility?.Name
        );

        booking.Status = "Cancelled";
        booking.RefundPercentage = quote.RefundPercentage;
        booking.RefundAmount = quote.RefundAmount;
        booking.RefundStatus = quote.RefundPercentage > 0 ? "To Refund" : "Non-refundable";
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancellationReason = User.IsInRole("Admin") || User.IsInRole("Manager")
            ? "Cancelled by management."
            : "Cancelled by member.";

        await _context.SaveChangesAsync();
        return Ok(booking);
    }

    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
