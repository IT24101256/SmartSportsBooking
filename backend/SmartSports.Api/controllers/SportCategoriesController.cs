using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/sport-categories")]
public class SportCategoriesController : ControllerBase
{
    private readonly AppDbContext _context;
    public SportCategoriesController(AppDbContext context) => _context = context;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get() =>
        Ok(await _context.SportCategories.OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name }).ToListAsync());

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] SportCategory request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("Category name is required.");
        var normalized = name.ToUpperInvariant();
        var existing = await _context.SportCategories.FirstOrDefaultAsync(c => c.NormalizedName == normalized);
        if (existing != null) return Ok(new { existing.Id, existing.Name });
        var category = new SportCategory { Name = name, NormalizedName = normalized };
        _context.SportCategories.Add(category);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = category.Id }, new { category.Id, category.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] SportCategory request)
    {
        var category = await _context.SportCategories.FindAsync(id);
        if (category == null) return NotFound("Sport category not found.");
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("Category name is required.");
        var normalized = name.ToUpperInvariant();
        if (await _context.SportCategories.AnyAsync(c => c.Id != id && c.NormalizedName == normalized))
            return Conflict("A sport category with this name already exists.");
        category.Name = name;
        category.NormalizedName = normalized;
        await _context.SaveChangesAsync();
        return Ok(new { category.Id, category.Name });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.SportCategories
            .Include(c => c.Facilities)
            .Include(c => c.Equipments)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) return NotFound("Sport category not found.");
        if (category.Facilities.Count > 0 || category.Equipments.Count > 0)
            return Conflict("This category is in use by facilities or equipment and cannot be deleted.");
        _context.SportCategories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
