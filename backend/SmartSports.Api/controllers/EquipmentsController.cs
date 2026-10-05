using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Equipment;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EquipmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EquipmentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEquipments(
        [FromQuery] string? sportCategory,
        [FromQuery] int? facilityId,
        [FromQuery] string? search,
        [FromQuery] bool? isAvailable)
    {
        var query = _context.Equipments
            .Include(e => e.SportCategoryNavigation)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(sportCategory) && sportCategory != "All")
        {
            var cat = sportCategory.Trim().ToLower();
            query = query.Where(e => e.SportCategory.Trim().ToLower() == cat ||
                (e.SportCategoryNavigation != null &&
                 e.SportCategoryNavigation.Name.Trim().ToLower() == cat));
        }

        if (facilityId.HasValue && facilityId.Value > 0)
        {
            // Return equipments specific to this facility OR general equipments for the facility's sport category
            var targetFacility = await _context.Facilities.FindAsync(facilityId.Value);
            if (targetFacility != null)
            {
                var facSport = (targetFacility.SportCategory ?? "").Trim();
                if (string.IsNullOrWhiteSpace(facSport))
                {
                    facSport = await _context.SportCategories
                    .Where(category => category.Id == targetFacility.SportCategoryId)
                    .Select(category => category.Name)
                    .FirstOrDefaultAsync() ?? "";
                }
                facSport = facSport.ToLower();
                query = query.Where(e => e.FacilityEquipments.Any(link => link.FacilityId == facilityId.Value) ||
                    e.SportCategory.Trim().ToLower() == facSport ||
                    (e.SportCategoryNavigation != null &&
                     e.SportCategoryNavigation.Name.Trim().ToLower() == facSport));
            }
            else
            {
                query = query.Where(e => e.FacilityEquipments.Any(link => link.FacilityId == facilityId.Value));
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e =>
                e.Name.ToLower().Contains(term) ||
                e.SportCategory.ToLower().Contains(term) ||
                (e.Description != null && e.Description.ToLower().Contains(term)));
        }

        if (isAvailable.HasValue)
        {
            query = query.Where(e => e.IsAvailable == isAvailable.Value);
        }

        var list = await query
            .OrderBy(e => e.SportCategory)
            .ThenBy(e => e.Name)
            .Select(e => new
            {
                e.Id,
                e.Name,
                SportCategory = string.IsNullOrWhiteSpace(e.SportCategory)
                    ? e.SportCategoryNavigation != null ? e.SportCategoryNavigation.Name : "Other"
                    : e.SportCategory,
                e.HourlyRate,
                FacilityId = e.FacilityEquipments.Select(link => (int?)link.FacilityId).FirstOrDefault(),
                FacilityName = e.FacilityEquipments.Select(link => link.Facility.Name).FirstOrDefault(),
                e.TotalStock,
                e.Description,
                e.IsAvailable,
                e.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEquipment(int id)
    {
        var eq = await _context.Equipments
            .Include(e => e.SportCategoryNavigation)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (eq == null) return NotFound("Equipment not found.");

        return Ok(new
        {
            eq.Id,
            eq.Name,
            eq.SportCategory,
            eq.HourlyRate,
            FacilityId = eq.FacilityEquipments.Select(link => (int?)link.FacilityId).FirstOrDefault(),
            FacilityName = eq.FacilityEquipments.Select(link => link.Facility.Name).FirstOrDefault(),
            eq.TotalStock,
            eq.Description,
            eq.IsAvailable,
            eq.CreatedAtUtc
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateEquipment([FromBody] CreateEquipmentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Equipment name is required.");

        if (string.IsNullOrWhiteSpace(request.SportCategory))
            return BadRequest("Sport category is required.");

        if (request.HourlyRate < 0)
            return BadRequest("Hourly rate cannot be negative.");

        var category = await ResolveCategoryAsync(request.SportCategoryId, request.SportCategory);
        if (category == null) return BadRequest("A valid sport category is required.");

        var equipment = new Equipment
        {
            Name = request.Name.Trim(),
            SportCategory = request.SportCategory.Trim(),
            SportCategoryId = category.Id,
            HourlyRate = request.HourlyRate,
            TotalStock = Math.Max(0, request.TotalStock),
            Description = request.Description?.Trim(),
            IsAvailable = request.IsAvailable,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Equipments.Add(equipment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEquipment), new { id = equipment.Id }, equipment);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEquipment(int id, [FromBody] UpdateEquipmentRequest request)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null) return NotFound("Equipment not found.");

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Equipment name is required.");

        if (string.IsNullOrWhiteSpace(request.SportCategory))
            return BadRequest("Sport category is required.");

        if (request.HourlyRate < 0)
            return BadRequest("Hourly rate cannot be negative.");

        equipment.Name = request.Name.Trim();
        equipment.SportCategory = request.SportCategory.Trim();
        equipment.HourlyRate = request.HourlyRate;
        var category = await ResolveCategoryAsync(request.SportCategoryId, request.SportCategory);
        if (category == null) return BadRequest("A valid sport category is required.");
        equipment.SportCategoryId = category.Id;
        equipment.TotalStock = Math.Max(0, request.TotalStock);
        equipment.Description = request.Description?.Trim();
        equipment.IsAvailable = request.IsAvailable;

        await _context.SaveChangesAsync();

        return Ok(equipment);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteEquipment(int id)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null) return NotFound("Equipment not found.");

        _context.Equipments.Remove(equipment);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<SportCategory?> ResolveCategoryAsync(int categoryId, string name)
    {
        if (categoryId > 0)
            return await _context.SportCategories.FindAsync(categoryId);
        var normalized = name.Trim().ToUpperInvariant();
        if (normalized.Length == 0) return null;
        var category = await _context.SportCategories.FirstOrDefaultAsync(c => c.NormalizedName == normalized);
        if (category != null) return category;
        category = new SportCategory { Name = name.Trim(), NormalizedName = normalized };
        _context.SportCategories.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }
}
