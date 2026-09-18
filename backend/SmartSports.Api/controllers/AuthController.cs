using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly OtpStore _otpStore;
    private readonly EmailService _emailService;

    public AuthController(AppDbContext context, OtpStore otpStore, EmailService emailService)
    {
        _context = context;
        _otpStore = otpStore;
        _emailService = emailService;
    }

    /// <summary>
    /// Step 1 of registration: validates inputs, stores a pending registration and sends OTP to the given email.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("All fields are required.");
        }

        if (request.Password.Length < 6)
        {
            return BadRequest("Password must be at least 6 characters.");
        }

        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower());

        if (existingUser != null)
        {
            return BadRequest("Email is already registered.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var otp = _otpStore.GenerateAndStore(request.Email.Trim().ToLower(), request.FullName.Trim(), passwordHash);

        // Send OTP email (fire-and-forget; if SMTP not configured the OTP is logged)
        _ = _emailService.SendOtpEmailAsync(request.Email.Trim(), request.FullName.Trim(), otp);

        return Ok(new { message = "OTP sent to your email. Please verify to complete registration." });
    }

    /// <summary>
    /// Step 2 of registration: verify the OTP and create the account.
    /// </summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            return BadRequest("Email and OTP are required.");

        var (valid, fullName, passwordHash) = _otpStore.Verify(request.Email.Trim().ToLower(), request.Otp.Trim());
        if (!valid)
            return BadRequest("Invalid or expired OTP. Please register again.");

        // Double-check the email isn't already registered (race-condition guard)
        if (await _context.Users.AnyAsync(u => u.Email == request.Email.Trim().ToLower()))
            return BadRequest("Email is already registered.");

        var customerRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == "Customer");

        if (customerRole == null)
            return BadRequest("Customer role does not exist.");

        var user = new User
        {
            FullName = fullName!,
            Email = request.Email.Trim().ToLower(),
            PasswordHash = passwordHash!,
            RoleId = customerRole.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Registration successful. You can now sign in.",
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            role = customerRole.Name
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }

        var passwordValid = BCrypt.Net.BCrypt.Verify(
            request.Password,
            user.PasswordHash);

        if (!passwordValid)
        {
            return Unauthorized("Invalid email or password.");
        }

        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Key"];

        if (string.IsNullOrEmpty(jwtKey))
        {
            return StatusCode(500, "JWT key is not configured.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "Customer")
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Issuer"]
            ?? "SmartSports.Api";

        var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Audience"]
            ?? "SmartSports.Client";

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler()
            .WriteToken(token);

        return Ok(new
        {
            message = "Login successful.",
            token = tokenString,
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            role = user.Role?.Name
        });
    }
}