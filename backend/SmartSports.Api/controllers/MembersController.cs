using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
  
namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/members")]
public class MembersController : ControllerBase
{
    private readonly AppDbContext _context;

    public MembersController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetMembers()
    {
        return Ok(await _context.Users
            .Include(user => user.Role)
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.Id,
                name = user.FullName,
                user.Email,
                role = user.Role!.Name,
                status = "Active"
            })
            .ToListAsync());
    }
}
