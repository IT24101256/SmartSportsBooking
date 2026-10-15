using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;

namespace SmartSports.Api.Tests;

public class BookingsAvailabilityIntegrationTests
    : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public BookingsAvailabilityIntegrationTests(
        CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetAvailability_ReturnsAvailableSlots_ForExistingFacility()
    {
        // Arrange
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var facility = new Facility
            {
                Name = "Test Badminton Court",
                HourlyRate = 1200
            };

            db.Facilities.Add(facility);
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync(
            "/api/bookings/availability?facilityId=1&date=2026-10-05");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();

        Assert.Contains("slots", json);
        Assert.Contains("hourlyRate", json);
    }
}