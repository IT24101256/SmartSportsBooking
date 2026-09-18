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
            bookingsQuery = bookingsQuery.Where(booking => booking.Facility!.Name.ToLower().Contains(term) || booking.Facility.Type.ToLower().Contains(term));
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
    public async Task<IActionResult> CreateBooking(CreateBookingRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        // Normalise the date to UTC regardless of serialised Kind
        var bookingDate = DateTime.SpecifyKind(request.BookingDate.Date, DateTimeKind.Utc);

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
            Status = validStatuses.Contains(request.Status) ? request.Status : "Pending"
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await _context.Entry(booking).Reference(item => item.Facility).LoadAsync();
        return CreatedAtAction(nameof(GetBookings), new { id = booking.Id }, booking);
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
