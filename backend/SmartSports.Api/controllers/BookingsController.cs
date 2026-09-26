using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Booking;
using SmartSportsFacilityBooking.Models;

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
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
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

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            bookingsQuery = bookingsQuery.Where(booking => booking.Facility!.Name.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.Status == status);
        }

        bookingsQuery = sort?.ToLowerInvariant() switch
        {
            "status" => bookingsQuery.OrderBy(booking => booking.Status).ThenByDescending(booking => booking.BookingDate),
            "facility" => bookingsQuery.OrderBy(booking => booking.Facility!.Name).ThenByDescending(booking => booking.BookingDate),
            _ => bookingsQuery.OrderByDescending(booking => booking.BookingDate).ThenByDescending(booking => booking.StartTime)
        };

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var totalCount = await bookingsQuery.CountAsync();
        var bookings = await bookingsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(booking => booking.Facility)
            .ToListAsync();

        return Ok(new { items = bookings, totalCount, page, pageSize, totalPages = (int)Math.Ceiling(totalCount / (double)pageSize) });
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
        var today = DateTime.Now.Date;
        var now = DateTime.Now.TimeOfDay;

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
    public async Task<IActionResult> GetAvailability([FromQuery] int facilityId, [FromQuery] DateTime date)
    {
        var facility = await _context.Facilities.FindAsync(facilityId);
        if (facility == null) return NotFound("Facility not found.");

        var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var bookings = await _context.Bookings
            .Where(booking => booking.FacilityId == facilityId && booking.BookingDate == day && booking.Status != "Cancelled")
            .Select(booking => new { booking.StartTime, booking.EndTime })
            .ToListAsync();

        var now = DateTime.Now;
        var slots = Enumerable.Range(8, 16).Select(hour =>
        {
            var start = TimeSpan.FromHours(hour);
            var end = start.Add(TimeSpan.FromHours(1));
            var isPast = day.Date < DateTime.UtcNow.Date || (day.Date == DateTime.UtcNow.Date && start < now.TimeOfDay);
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
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        var validStatuses = new[] { "Pending", "Confirmed", "Cancelled" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest("Invalid status value.");

        booking.Status = request.Status;
        if (request.Status == "Confirmed" && booking.PaymentMethod == "BankTransfer")
        {
            booking.PaymentStatus = "Approved";
        }
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

        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && booking.UserId != userId.Value) return Forbid();
        if (booking.Status == "Cancelled") return NoContent();

        booking.Status = "Cancelled";
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
