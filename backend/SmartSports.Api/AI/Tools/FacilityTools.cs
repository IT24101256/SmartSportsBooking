using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.Data;

namespace SmartSportsFacilityBooking.AI.Tools;

public class SearchFacilitiesInput
{
    public string FacilityType { get; set; } = string.Empty;
    public int? MinCapacity { get; set; }
}

public class SearchFacilitiesTool : ITool
{
    private readonly AppDbContext _context;

    public SearchFacilitiesTool(AppDbContext context)
    {
        _context = context;
    }

    public string Name => "search_facilities";
    public string Description => "Searches the sports facility inventory by sport type, availability, and capacity requirements.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.FacilityAnalyst };

    public async Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<SearchFacilitiesInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new SearchFacilitiesInput();

        var query = _context.Facilities.AsQueryable();

        if (!string.IsNullOrWhiteSpace(input.FacilityType))
        {
            var filter = input.FacilityType.Trim().ToLower();
            query = query.Where(f => f.Name.ToLower().Contains(filter) || f.Description.ToLower().Contains(filter));
        }

        var facilities = await query
            .Where(f => f.IsAvailable)
            .Select(f => new
            {
                f.Id,
                f.Name,
                f.IsAvailable,
                EstimatedHourlyRate = f.HourlyRate,
                Capacity = 30
            })
            .ToListAsync();

        return ToolResult.Ok(facilities);
    }
}

public class GetFacilityDetailsInput
{
    public int FacilityId { get; set; }
}

public class GetFacilityDetailsTool : ITool
{
    private readonly AppDbContext _context;

    public GetFacilityDetailsTool(AppDbContext context)
    {
        _context = context;
    }

    public string Name => "get_facility_details";
    public string Description => "Retrieves detailed information, pricing, equipment, and amenities for a specific facility.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.FacilityAnalyst };

    public async Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<GetFacilityDetailsInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (input == null || input.FacilityId <= 0)
        {
            return ToolResult.Fail("Invalid or missing FacilityId parameter.");
        }

        var facility = await _context.Facilities.FindAsync(input.FacilityId);
        if (facility == null)
        {
            return ToolResult.Fail($"Facility with ID {input.FacilityId} was not found.");
        }

        var hourlyRate = facility.HourlyRate;

        var amenities = new List<string> { "Standard Lighting", "Changing Rooms", "First Aid Kit" };

        var details = new
        {
            facility.Id,
            facility.Name,
            facility.IsAvailable,
            HourlyRate = hourlyRate,
            MaxCapacity = 30,
            Amenities = amenities
        };

        return ToolResult.Ok(details);
    }
}
