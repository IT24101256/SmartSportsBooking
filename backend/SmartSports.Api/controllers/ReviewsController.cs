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
        var review = await _context.BookingReviews
            .Include(item => item.Booking!)
                .ThenInclude(booking => booking.Facility)
            .FirstOrDefaultAsync(item => item.Id == id);

        // Resilient fallback: If no review matches review.Id, check if id was sent as bookingId for an existing review
        if (review == null)
        {
            review = await _context.BookingReviews
                .Include(item => item.Booking!)
                    .ThenInclude(booking => booking.Facility)
                .FirstOrDefaultAsync(item => item.BookingId == id);
        }

        if (review == null)
        {
            var isBooking = await _context.Bookings.AnyAsync(b => b.Id == id);
            return NotFound(isBooking
                ? $"No review exists for booking #{id} yet. To submit a review, use POST /api/reviews."
                : $"Review #{id} was not found.");
        }
        if (review.UserId != userId.Value) return Forbid();
        if (request.Rating is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Review)) return BadRequest("Name and review are required.");
        var photoError = ValidatePhotos(request.Photos);
        if (photoError != null) return BadRequest(photoError);

        review.Name = request.Name.Trim();
        review.Rating = request.Rating;
        review.Review = request.Review.Trim();

        // Handle keeping existing photos and adding new photos
        var currentPaths = JsonSerializer.Deserialize<List<string>>(review.PhotoPathsJson) ?? [];
        var retainedPaths = new List<string>();

        if (request.ExistingPhotos != null)
        {
            foreach (var ep in request.ExistingPhotos)
            {
                var match = System.Text.RegularExpressions.Regex.Match(ep, @"/photos/(\d+)");
                if (match.Success && int.TryParse(match.Groups[1].Value, out var idx) && idx >= 0 && idx < currentPaths.Count)
                {
                    retainedPaths.Add(currentPaths[idx]);
                }
                else if (currentPaths.Contains(ep))
                {
                    retainedPaths.Add(ep);
                }
            }
        }
        else if (request.Photos == null || request.Photos.Count == 0)
        {
            // If neither ExistingPhotos nor Photos was provided, keep all current photos
            retainedPaths = currentPaths;
        }

        // Save newly uploaded photos
        if (request.Photos?.Count > 0)
        {
            var newPathsJson = await SavePhotos(request.Photos);
            var newPaths = JsonSerializer.Deserialize<List<string>>(newPathsJson) ?? [];
            retainedPaths.AddRange(newPaths);
        }

        review.PhotoPathsJson = JsonSerializer.Serialize(retainedPaths.Take(4).ToList());
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
        if (review == null) return NotFound($"Review #{id} was not found.");
        if (review.UserId != userId.Value && !IsAdmin()) return Forbid();
        _context.BookingReviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/photos/{photoIndex:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPhoto(int id, int photoIndex)
    {
        var review = await _context.BookingReviews
            .Include(r => r.Booking!)
                .ThenInclude(b => b.Facility)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null || photoIndex < 0) return NotFound($"Review #{id} was not found.");
        var photos = JsonSerializer.Deserialize<List<string>>(review.PhotoPathsJson) ?? [];
        if (photoIndex >= photos.Count) return NotFound($"Photo index {photoIndex} not found for review #{id}.");
        var relPath = photos[photoIndex];

        // 1. If stored as Base64 Data URL (e.g. data:image/jpeg;base64,...), serve directly from DB
        if (relPath.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var commaIdx = relPath.IndexOf(',');
                var meta = commaIdx != -1 ? relPath[..commaIdx] : "";
                var b64 = commaIdx != -1 ? relPath[(commaIdx + 1)..] : relPath;
                var mime = meta.Contains("png") ? "image/png" : (meta.Contains("webp") ? "image/webp" : "image/jpeg");
                return File(Convert.FromBase64String(b64), mime);
            }
            catch
            {
                // Fall through to fallback
            }
        }

        // 2. If stored as file on disk, serve it if it exists
        var path = Path.Combine(AppContext.BaseDirectory, relPath);
        if (System.IO.File.Exists(path))
        {
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

        var fallback = Path.Combine(Directory.GetCurrentDirectory(), relPath);
        if (System.IO.File.Exists(fallback))
        {
            var ext = Path.GetExtension(relPath).ToLowerInvariant();
            var contentType = ext switch
            {
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };
            return PhysicalFile(fallback, contentType, enableRangeProcessing: true);
        }

        // 3. Resilient Fallback: If physical file is missing (e.g. Render container wiped out disk on restart),
        // serve a facility-specific fallback asset so clients NEVER get an ugly 404 broken image!
        var facilityName = review.Booking?.Facility?.Name ?? "";
        var fallbackFileName = ResolveFallbackAsset(facilityName);
        var assetPath = Path.Combine(AppContext.BaseDirectory, "Assets", fallbackFileName);
        if (System.IO.File.Exists(assetPath))
        {
            return PhysicalFile(assetPath, "image/jpeg", enableRangeProcessing: true);
        }

        var assetFallback = Path.Combine(Directory.GetCurrentDirectory(), "Assets", fallbackFileName);
        if (System.IO.File.Exists(assetFallback))
        {
            return PhysicalFile(assetFallback, "image/jpeg", enableRangeProcessing: true);
        }

        // Ultra-safe fallback: inline SVG
        return Content(GenerateFallbackSvg(facilityName), "image/svg+xml");
    }

    private static string ResolveFallbackAsset(string facilityName)
    {
        var name = (facilityName ?? "").ToLowerInvariant();
        if (name.Contains("badminton")) return "facility-badminton.jpg";
        if (name.Contains("cricket")) return "facility-cricket.jpg";
        if (name.Contains("tennis")) return "facility-tennis.jpg";
        if (name.Contains("basket")) return "facility-basketball.jpg";
        if (name.Contains("swim") || name.Contains("aqua")) return "facility-swimming.jpg";
        return "sports-hero.jpg";
    }

    private static string GenerateFallbackSvg(string facilityName)
    {
        var cleanName = System.Security.SecurityElement.Escape(string.IsNullOrWhiteSpace(facilityName) ? "Sports Court" : facilityName);
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 400 300"" width=""400"" height=""300"">
  <defs>
    <linearGradient id=""grad"" x1=""0%"" y1=""0%"" x2=""100%"" y2=""100%"">
      <stop offset=""0%"" style=""stop-color:#0f172a;stop-opacity:1"" />
      <stop offset=""100%"" style=""stop-color:#1e293b;stop-opacity:1"" />
    </linearGradient>
  </defs>
  <rect width=""100%"" height=""100%"" fill=""url(#grad)""/>
  <circle cx=""200"" cy=""120"" r=""48"" fill=""#2563eb"" opacity=""0.2""/>
  <text x=""200"" y=""135"" font-size=""40"" text-anchor=""middle"" fill=""#ffffff"">🏟️</text>
  <text x=""200"" y=""190"" font-family=""sans-serif"" font-size=""16"" font-weight=""bold"" text-anchor=""middle"" fill=""#f8fafc"">{cleanName}</text>
  <text x=""200"" y=""215"" font-family=""sans-serif"" font-size=""12"" text-anchor=""middle"" fill=""#94a3b8"">Verified Member Review</text>
</svg>";
    }

    private async Task<string> SavePhotos(IFormFileCollection? photos)
    {
        if (photos == null || photos.Count == 0) return "[]";
        if (photos.Count > 4) throw new InvalidOperationException("A maximum of 4 photos is allowed.");
        var paths = new List<string>();
        var directory = Path.Combine(AppContext.BaseDirectory, "uploads", "reviews");
        try { Directory.CreateDirectory(directory); } catch { }

        foreach (var photo in photos)
        {
            if (photo.Length == 0 || !photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Only image photos are allowed.");

            // Store directly in database as Data URL if under 3MB so photos permanently survive Render container restarts
            if (photo.Length <= 3_000_000)
            {
                using var memoryStream = new MemoryStream();
                await photo.CopyToAsync(memoryStream);
                var base64 = Convert.ToBase64String(memoryStream.ToArray());
                paths.Add($"data:{photo.ContentType};base64,{base64}");
            }
            else
            {
                var extension = Path.GetExtension(photo.FileName);
                if (string.IsNullOrEmpty(extension)) extension = ".jpg";
                var storedName = $"{Guid.NewGuid():N}{extension}";
                await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
                await photo.CopyToAsync(stream);
                paths.Add(Path.Combine("uploads", "reviews", storedName).Replace("\\", "/"));
            }
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
        public List<string>? ExistingPhotos { get; set; }
    }
}