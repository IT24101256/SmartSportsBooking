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
    public async Task<IActionResult> GetBookings()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var bookingsQuery = _context.Bookings.AsQueryable();
        if (!User.IsInRole("Admin"))
        {
            bookingsQuery = bookingsQuery.Where(booking => booking.UserId == userId.Value);
        }

        var bookings = await bookingsQuery
            .Include(booking => booking.Facility)
            .OrderByDescending(booking => booking.BookingDate)
            .ThenByDescending(booking => booking.StartTime)
            .ToListAsync();

        return Ok(bookings);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking(CreateBookingRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        if (request.EndTime <= request.StartTime || request.BookingDate.Kind != DateTimeKind.Utc)
        {
            return BadRequest("Booking date must be UTC and the end time must be after the start time.");
        }

        var facility = await _context.Facilities.FindAsync(request.FacilityId);
        if (facility == null)
        {
            return NotFound("Facility not found.");
        }

        var overlap = await _context.Bookings.AnyAsync(booking =>
            booking.FacilityId == request.FacilityId &&
            booking.BookingDate == request.BookingDate &&
            booking.StartTime < request.EndTime &&
            booking.EndTime > request.StartTime &&
            booking.Status != "Cancelled");

        if (overlap)
        {
            return Conflict("This facility is already booked for that time.");
        }

        var booking = new Booking
        {
            UserId = userId.Value,
            FacilityId = request.FacilityId,
            BookingDate = request.BookingDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Status = request.Status is "Pending" or "Confirmed" ? request.Status : "Pending"
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await _context.Entry(booking).Reference(item => item.Facility).LoadAsync();
        return CreatedAtAction(nameof(GetBookings), new { id = booking.Id }, booking);
    }

    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
