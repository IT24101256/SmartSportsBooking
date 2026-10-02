using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetReviews()
    {
        var reviews = await _context.BookingReviews
            .Include(review => review.User)
            .Include(review => review.Booking!)
                .ThenInclude(booking => booking.Facility)
            .OrderByDescending(review => review.UpdatedAtUtc)
            .ToListAsync();

        return Ok(reviews.Select(ToResponse));
    }

    [HttpPost]
    [Authorize]
    [RequestSizeLimit(15_000_000)]
    public async Task<IActionResult> CreateReview([FromForm] ReviewRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (request.Rating is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Review)) return BadRequest("Name and review are required.");

        var booking = await _context.Bookings.Include(item => item.Facility).FirstOrDefaultAsync(item => item.Id == request.BookingId);
        if (booking == null) return NotFound("Booking not found.");
        if (booking.UserId != userId.Value) return Forbid();
        if (booking.Status == "Cancelled") return BadRequest("Cancelled bookings cannot be reviewed.");
        if (await _context.BookingReviews.AnyAsync(review => review.BookingId == request.BookingId)) return Conflict("This booking already has a review.");
        var photoError = ValidatePhotos(request.Photos);
        if (photoError != null) return BadRequest(photoError);

        var review = new BookingReview
        {
            BookingId = booking.Id,
            UserId = userId.Value,
            Name = request.Name.Trim(),
            Rating = request.Rating,
            Review = request.Review.Trim(),
            PhotoPathsJson = await SavePhotos(request.Photos)
        };
        _context.BookingReviews.Add(review);
        await _context.SaveChangesAsync();
        await LoadReviewReferences(review);
        return Created($"/api/reviews/{review.Id}", ToResponse(review));
    }

    [HttpPut("{id:int}")]
    [Authorize]
    [RequestSizeLimit(15_000_000)]
    public async Task<IActionResult> UpdateReview(int id, [FromForm] ReviewRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var review = await _context.BookingReviews.Include(item => item.Booking!).ThenInclude(booking => booking.Facility).FirstOrDefaultAsync(item => item.Id == id);
        if (review == null) return NotFound();
        if (review.UserId != userId.Value) return Forbid();
        if (request.Rating is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Review)) return BadRequest("Name and review are required.");
        var photoError = ValidatePhotos(request.Photos);
        if (photoError != null) return BadRequest(photoError);

        review.Name = request.Name.Trim();
        review.Rating = request.Rating;
        review.Review = request.Review.Trim();
        if (request.Photos?.Count > 0) review.PhotoPathsJson = await SavePhotos(request.Photos);
        review.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await LoadReviewReferences(review);
        return Ok(ToResponse(review));
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var review = await _context.BookingReviews.FindAsync(id);
        if (review == null) return NotFound();
        if (review.UserId != userId.Value && !IsAdmin()) return Forbid();
        _context.BookingReviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/photos/{photoIndex:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPhoto(int id, int photoIndex)
    {
        var review = await _context.BookingReviews.FindAsync(id);
        if (review == null || photoIndex < 0) return NotFound();
        var photos = JsonSerializer.Deserialize<List<string>>(review.PhotoPathsJson) ?? [];
        if (photoIndex >= photos.Count) return NotFound();
        var relPath = photos[photoIndex];
        var path = Path.Combine(AppContext.BaseDirectory, relPath);
        if (!System.IO.File.Exists(path))
        {
            var fallback = Path.Combine(Directory.GetCurrentDirectory(), relPath);
            if (System.IO.File.Exists(fallback))
            {
                path = fallback;
            }
            else
            {
                return NotFound();
            }
        }
        var ext = Path.GetExtension(relPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
        return PhysicalFile(path, contentType, enableRangeProcessing: true);
    }

    private async Task<string> SavePhotos(IFormFileCollection? photos)
    {
        if (photos == null || photos.Count == 0) return "[]";
        if (photos.Count > 4) throw new InvalidOperationException("A maximum of 4 photos is allowed.");
        var paths = new List<string>();
        var directory = Path.Combine(AppContext.BaseDirectory, "uploads", "reviews");
        Directory.CreateDirectory(directory);
        foreach (var photo in photos)
        {
            if (photo.Length == 0 || !photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Only image photos are allowed.");
            var extension = Path.GetExtension(photo.FileName);
            var storedName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
            await photo.CopyToAsync(stream);
            paths.Add(Path.Combine("uploads", "reviews", storedName).Replace("\\", "/"));
        }
        return JsonSerializer.Serialize(paths);
    }

    private static string? ValidatePhotos(IFormFileCollection? photos)
    {
        if (photos == null || photos.Count == 0) return null;
        if (photos.Count > 4) return "A maximum of 4 photos is allowed.";
        return photos.Any(photo => photo.Length == 0 || !photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            ? "Only image photos are allowed."
            : null;
    }

    private async Task LoadReviewReferences(BookingReview review)
    {
        await _context.Entry(review).Reference(item => item.User).LoadAsync();
        await _context.Entry(review).Reference(item => item.Booking).LoadAsync();
        if (review.Booking != null) await _context.Entry(review.Booking).Reference(item => item.Facility).LoadAsync();
    }

    private object ToResponse(BookingReview review) => new
    {
        review.Id,
        bookingId = review.BookingId,
        userId = review.UserId,
        name = review.Name,
        rating = review.Rating,
        review = review.Review,
        photos = (JsonSerializer.Deserialize<List<string>>(review.PhotoPathsJson) ?? []).Select((_, index) => $"/api/reviews/{review.Id}/photos/{index}"),
        facilityId = review.Booking?.FacilityId,
        facilityName = review.Booking?.Facility?.Name,
        bookingDate = review.Booking?.BookingDate,
        createdAtUtc = review.CreatedAtUtc,
        updatedAtUtc = review.UpdatedAtUtc
    };

    private bool IsAdmin() => User.IsInRole("Admin");
    private int? GetUserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;

    public class ReviewRequest
    {
        public int BookingId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Review { get; set; } = string.Empty;
        public IFormFileCollection? Photos { get; set; }
    }
}