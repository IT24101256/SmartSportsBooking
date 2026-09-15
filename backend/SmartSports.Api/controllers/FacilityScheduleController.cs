// Imports ASP.NET Core MVC features.
using Microsoft.AspNetCore.Mvc;

// Imports Entity Framework Core features.
using Microsoft.EntityFrameworkCore;

// Imports the database context.
using SmartSportsFacilityBooking.Data;

// Imports the application models.
using SmartSportsFacilityBooking.Models;

// Defines this class as an API controller.
[ApiController]

// Defines the base route as /api/facility-schedules.
[Route("api/facility-schedules")]

// Defines the controller for facility schedule operations.
public class FacilitySchedulesController : ControllerBase
{
    // Stores the database context.
    private readonly AppDbContext _context;

    // Creates the controller and receives AppDbContext through dependency injection.
    public FacilitySchedulesController(AppDbContext context)
    {
        // Stores the database context for later use.
        _context = context;
    }

    // Handles GET /api/facility-schedules.
    [HttpGet]

    // Gets all facility schedules from the database.
    public async Task<IActionResult> GetSchedules()
    {
        // Retrieves all schedules and includes their related facility.
        var schedules = await _context.FacilitySchedules
            .Include(s => s.Facility)
            .ToListAsync();

        // Returns the schedules with HTTP 200.
        return Ok(schedules);
    }

    // Handles GET /api/facility-schedules/{id}.
    [HttpGet("{id}")]
  
    // Gets one schedule using its ID.
    public async Task<IActionResult> GetSchedule(int id)
    {
        // Finds the requested schedule and includes its related facility.
        var schedule = await _context.FacilitySchedules
            .Include(s => s.Facility)
            .FirstOrDefaultAsync(s => s.Id == id);

        // Checks whether the schedule exists.
        if (schedule == null)
        {
            // Returns HTTP 404 when the schedule does not exist.
            return NotFound();
        }

        // Returns the schedule with HTTP 200.
        return Ok(schedule);
    }

    // Handles POST /api/facility-schedules.
    [HttpPost]

    // Creates a new facility schedule.
    public async Task<IActionResult> CreateSchedule(FacilitySchedule schedule)
    {
        // Checks whether the selected facility exists.
        var facility = await _context.Facilities
            .FindAsync(schedule.FacilityId);

        // Checks whether the facility was found.
        if (facility == null)
        {
            // Returns HTTP 404 when the facility does not exist.
            return NotFound("Facility not found.");
        }

        // Adds the new schedule to the database context.
        _context.FacilitySchedules.Add(schedule);

        // Saves the new schedule to PostgreSQL.
        await _context.SaveChangesAsync();

        // Returns HTTP 201 with the newly created schedule.
        return CreatedAtAction(
            nameof(GetSchedule),
            new { id = schedule.Id },
            schedule);
    }

    // Handles PUT /api/facility-schedules/{id}.
    [HttpPut("{id}")]

    // Updates an existing facility schedule.
    public async Task<IActionResult> UpdateSchedule(
        int id,
        FacilitySchedule schedule)
    {
        // Finds the existing schedule using the provided ID.
        var existingSchedule = await _context.FacilitySchedules
            .FindAsync(id);

        // Checks whether the schedule exists.
        if (existingSchedule == null)
        {
            // Returns HTTP 404 when the schedule does not exist.
            return NotFound();
        }

        // Updates the facility ID.
        existingSchedule.FacilityId = schedule.FacilityId;

        // Updates the day of the week.
        existingSchedule.DayOfWeek = schedule.DayOfWeek;

        // Updates the starting time.
        existingSchedule.StartTime = schedule.StartTime;

        // Updates the ending time.
        existingSchedule.EndTime = schedule.EndTime;

        // Saves the changes to PostgreSQL.
        await _context.SaveChangesAsync();

        // Returns the updated schedule with HTTP 200.
        return Ok(existingSchedule);
    }

    // Handles DELETE /api/facility-schedules/{id}.
    [HttpDelete("{id}")]

    // Deletes a facility schedule.
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        // Finds the schedule using the provided ID.
        var schedule = await _context.FacilitySchedules
            .FindAsync(id);

        // Checks whether the schedule exists.
        if (schedule == null)
        {
            // Returns HTTP 404 when the schedule does not exist.
            return NotFound();
        }

        // Removes the schedule from the database context.
        _context.FacilitySchedules.Remove(schedule);

        // Saves the deletion to PostgreSQL.
        await _context.SaveChangesAsync();

        // Returns HTTP 204 after successful deletion.
        return NoContent();
    }
}