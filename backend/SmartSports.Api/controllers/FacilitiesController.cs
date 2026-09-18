
// Import ASP.NET Core MVC features.
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

// Import Entity Framework Core features.
using Microsoft.EntityFrameworkCore;

// Import our database context.
using SmartSportsFacilityBooking.Data;

// Import our Facility model.
using SmartSportsFacilityBooking.Models;
using System.Security.Claims;

// Define this class as an API controller.
[ApiController]

// Require authentication for facility operations.
[Authorize]

// Define the base route as /api/Facilities.
[Route("api/[controller]")]
public class FacilitiesController : ControllerBase
{
    // Store the database context in a private variable.
    private readonly AppDbContext _context;

    // Constructor receives the database context through dependency injection.
    public FacilitiesController(AppDbContext context)
    {
        // Store the database context for use inside the controller.
        _context = context;
    }

    // Handle GET requests to /api/Facilities.
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetFacilities(
        [FromQuery] string? search,
        [FromQuery] bool? available,
        [FromQuery] string? sort = "name",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var facilitiesQuery = _context.Facilities.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            facilitiesQuery = facilitiesQuery.Where(facility => facility.Name.ToLower().Contains(term) || facility.Type.ToLower().Contains(term) || facility.Location.ToLower().Contains(term));
        }

        if (available.HasValue)
        {
            facilitiesQuery = facilitiesQuery.Where(facility => facility.IsAvailable == available.Value);
        }

        facilitiesQuery = sort?.ToLowerInvariant() switch
        {
            "type" => facilitiesQuery.OrderBy(facility => facility.Type).ThenBy(facility => facility.Name),
            "location" => facilitiesQuery.OrderBy(facility => facility.Location).ThenBy(facility => facility.Name),
            _ => facilitiesQuery.OrderBy(facility => facility.Name)
        };

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var totalCount = await facilitiesQuery.CountAsync();
        var facilities = await facilitiesQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var facilityIds = facilities.Select(facility => facility.Id).ToArray();
        var ratings = await _context.FacilityRatings
            .Where(rating => facilityIds.Contains(rating.FacilityId))
            .GroupBy(rating => rating.FacilityId)
            .Select(group => new { facilityId = group.Key, average = group.Average(rating => rating.Score), count = group.Count() })
            .ToDictionaryAsync(item => item.facilityId);

        return Ok(new { items = facilities.Select(facility => new
        {
            facility.Id, facility.Name, facility.Type, facility.Location, facility.IsAvailable,
            rating = ratings.TryGetValue(facility.Id, out var summary) ? Math.Round(summary.average, 1) : (double?)null,
            ratingCount = ratings.TryGetValue(facility.Id, out summary) ? summary.count : 0
        }), totalCount, page, pageSize, totalPages = (int)Math.Ceiling(totalCount / (double)pageSize) });
    }

    // Handle GET requests to /api/Facilities/{id}.
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<Facility>> GetFacility(int id)
    {
        // Search for a facility using its ID.
        var facility = await _context.Facilities.FindAsync(id);

        // Check whether the facility was found.
        if (facility == null)
        {
            // Return HTTP 404 Not Found if the facility doesn't exist.
            return NotFound();
        }

        // Return the facility with HTTP 200 OK.
        return Ok(facility);
    }

    [HttpPost("{id}/ratings")]
    public async Task<IActionResult> RateFacility(int id, [FromBody] RatingRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (request.Score is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");
        if (!await _context.Facilities.AnyAsync(facility => facility.Id == id)) return NotFound("Facility not found.");

        var rating = await _context.FacilityRatings.FirstOrDefaultAsync(item => item.FacilityId == id && item.UserId == userId.Value);
        if (rating == null)
        {
            _context.FacilityRatings.Add(new FacilityRating { FacilityId = id, UserId = userId.Value, Score = request.Score });
        }
        else
        {
            rating.Score = request.Score;
            rating.CreatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { facilityId = id, request.Score });
    }

    private int? GetUserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;

    public class RatingRequest
    {
        public int Score { get; set; }
    }

    // Handle POST requests to /api/Facilities.
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Facility>> CreateFacility(Facility facility)
    {
        if (facility == null)
        {
            return BadRequest("Facility payload is required.");
        }

        if (string.IsNullOrWhiteSpace(facility.Name) ||
            string.IsNullOrWhiteSpace(facility.Type) ||
            string.IsNullOrWhiteSpace(facility.Location))
        {
            return BadRequest("Facility name, type, and location are required.");
        }

        // Add the new facility to the database context.
        _context.Facilities.Add(facility);

        // Save the new facility to PostgreSQL.
        await _context.SaveChangesAsync();

        // Return HTTP 201 Created with a link to the created facility.
        return CreatedAtAction(
            nameof(GetFacility),
            new { id = facility.Id },
            facility
        );
    }

    // Handle PUT requests to /api/Facilities/{id}.
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFacility(int id, Facility facility)
    {
        if (facility == null)
        {
            return BadRequest("Facility payload is required.");
        }

        // Check whether the ID in the URL matches the ID in the request body.
        if (id != facility.Id)
        {
            // Return HTTP 400 Bad Request when the IDs don't match.
            return BadRequest("Facility ID does not match.");
        }

        var existingFacility = await _context.Facilities.FindAsync(id);
        if (existingFacility == null)
        {
            return NotFound();
        }

        existingFacility.Name = facility.Name;
        existingFacility.Type = facility.Type;
        existingFacility.Location = facility.Location;
        existingFacility.IsAvailable = facility.IsAvailable;

        try
        {
            // Save the updated facility to PostgreSQL.
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Check whether the facility still exists.
            if (!FacilityExists(id))
            {
                // Return HTTP 404 Not Found if it doesn't exist.
                return NotFound();
            }

            // Throw the exception again if another unexpected error occurred.
            throw;
        }

        // Return HTTP 204 No Content after a successful update.
        return NoContent();
    }
  
    // Handle DELETE requests to /api/Facilities/{id}.
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFacility(int id)
    {
        // Find the facility using its ID.
        var facility = await _context.Facilities.FindAsync(id);

        // Check whether the facility exists.
        if (facility == null)
        {
            // Return HTTP 404 Not Found if it doesn't exist.
            return NotFound();
        }

        // Mark the facility for deletion.
        _context.Facilities.Remove(facility);

        // Save the deletion to PostgreSQL.
        await _context.SaveChangesAsync();

        // Return HTTP 204 No Content after successful deletion.
        return NoContent();
    }

    // Check whether a facility exists in the database.
    private bool FacilityExists(int id)
    {
        // Return true if a facility with the specified ID exists.
        return _context.Facilities.Any(e => e.Id == id);
    }
}