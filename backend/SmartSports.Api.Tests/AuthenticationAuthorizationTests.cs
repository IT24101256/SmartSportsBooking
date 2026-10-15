using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace SmartSports.Api.Tests;

public class AuthenticationAuthorizationTests
    : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthenticationAuthorizationTests(
        CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetMembers_WithoutToken_ReturnsUnauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/members");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMembers_WithCustomerRole_ReturnsForbidden()
    {
        // Arrange
        var client = _factory.CreateClient();

        var token = CreateTestToken("Customer");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await client.GetAsync("/api/members");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetMembers_WithAdminRole_ReturnsOk()
    {
        // Arrange
        var client = _factory.CreateClient();

        var token = CreateTestToken("Admin");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await client.GetAsync("/api/members");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private string CreateTestToken(string role)
    {
        var configuration = _factory.Services
            .GetRequiredService<
                Microsoft.Extensions.Configuration.IConfiguration>();

        var jwtKey =
            Environment.GetEnvironmentVariable("JWT_KEY")
            ?? configuration["Jwt:Key"];

        var jwtIssuer =
            Environment.GetEnvironmentVariable("JWT_ISSUER")
            ?? configuration["Jwt:Issuer"]
            ?? "SmartSports.Api";

        var jwtAudience =
            Environment.GetEnvironmentVariable("JWT_AUDIENCE")
            ?? configuration["Jwt:Audience"]
            ?? "SmartSports.Client";

if (string.IsNullOrWhiteSpace(jwtKey))
{
    jwtKey = "myspot-super-secure-production-jwt-signing-secret-key-2026-min-32-chars!";
}
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "Test User"),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}